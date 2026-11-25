//! Streaming mono resampling and downmixing for spectral analysis.
//!
//! Spectral features are computed on a mono signal at a fixed analysis rate
//! (22,050 Hz by default) so results are comparable across source formats.
//! Level measurements never use this path: they read the native signal.

use rubato::audioadapter_buffers::direct::InterleavedSlice;
use rubato::{Fft, FixedSync, Indexing, Resampler};

/// Input chunk size in frames for the FFT resampler.
const CHUNK: usize = 1024;

/// Average the channels of an interleaved block into `out` (cleared first).
///
/// An equal-weight mean keeps a full-scale mono signal duplicated across
/// channels at full scale and never clips.
pub fn downmix_mean(interleaved: &[f32], channels: usize, out: &mut Vec<f32>) {
    out.clear();
    let channels = channels.max(1);
    #[allow(clippy::cast_precision_loss)]
    let scale = 1.0 / channels as f32;
    out.extend(
        interleaved
            .chunks_exact(channels)
            .map(|frame| frame.iter().sum::<f32>() * scale),
    );
}

/// Streaming mono resampler. Passes samples through unchanged when the rates
/// already match.
pub struct MonoResampler {
    inner: Option<Inner>,
    frames_in: u64,
    frames_out: u64,
    ratio: f64,
}

struct Inner {
    resampler: Fft<f32>,
    pending: Vec<f32>,
    output: Vec<f32>,
    delay_left: usize,
}

impl std::fmt::Debug for MonoResampler {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("MonoResampler")
            .field("ratio", &self.ratio)
            .field("frames_in", &self.frames_in)
            .finish_non_exhaustive()
    }
}

impl MonoResampler {
    /// # Panics
    ///
    /// Panics if either rate is zero.
    pub fn new(input_rate: u32, output_rate: u32) -> Self {
        assert!(input_rate > 0 && output_rate > 0, "rates must be non-zero");
        let inner = (input_rate != output_rate).then(|| {
            let resampler = Fft::<f32>::new(
                input_rate as usize,
                output_rate as usize,
                CHUNK,
                1,
                FixedSync::Input,
            )
            .expect("valid resampler configuration");
            let delay_left = resampler.output_delay();
            let output = vec![0.0; resampler.output_frames_max()];
            Inner {
                resampler,
                pending: Vec::with_capacity(CHUNK * 2),
                output,
                delay_left,
            }
        });
        Self {
            inner,
            frames_in: 0,
            frames_out: 0,
            ratio: f64::from(output_rate) / f64::from(input_rate),
        }
    }

    /// Resample `input`, calling `sink` with each produced block.
    pub fn push(&mut self, input: &[f32], sink: &mut impl FnMut(&[f32])) {
        self.frames_in += input.len() as u64;
        let Some(inner) = self.inner.as_mut() else {
            self.frames_out += input.len() as u64;
            sink(input);
            return;
        };
        inner.pending.extend_from_slice(input);
        while inner.pending.len() >= inner.resampler.input_frames_next() {
            let needed = inner.resampler.input_frames_next();
            let produced = inner.run(needed, None);
            inner.pending.drain(..needed);
            self.frames_out += emit(inner, produced, sink);
        }
    }

    /// Flush buffered input and the resampler's internal delay so the total
    /// output length matches `input_frames × ratio`.
    pub fn finish(&mut self, sink: &mut impl FnMut(&[f32])) {
        #[allow(
            clippy::cast_possible_truncation,
            clippy::cast_sign_loss,
            clippy::cast_precision_loss
        )]
        let expected = (self.frames_in as f64 * self.ratio).round() as u64;
        let Some(inner) = self.inner.as_mut() else {
            return;
        };
        let mut produced_total = self.frames_out;
        while produced_total < expected {
            let needed = inner.resampler.input_frames_next();
            let partial = inner.pending.len().min(needed);
            inner.pending.resize(needed, 0.0);
            let produced = inner.run(needed, Some(partial));
            inner.pending.clear();
            let remaining = usize::try_from(expected - produced_total).unwrap_or(usize::MAX);
            let before = produced_total;
            produced_total += emit_limited(inner, produced, remaining, sink);
            if produced_total == before && inner.delay_left == 0 && produced == 0 {
                break;
            }
        }
        self.frames_out = produced_total;
    }

    /// Output frames produced so far.
    pub fn frames_out(&self) -> u64 {
        self.frames_out
    }
}

impl Inner {
    fn run(&mut self, frames: usize, partial: Option<usize>) -> usize {
        let capacity = self.output.len();
        let input = InterleavedSlice::new(&self.pending[..frames], 1, frames)
            .expect("input buffer sized to frames");
        let mut output = InterleavedSlice::new_mut(&mut self.output, 1, capacity)
            .expect("output buffer sized to capacity");
        let indexing = partial.map(|p| Indexing::new().partial_len(p));
        let (_, written) = self
            .resampler
            .process_into_buffer(&input, &mut output, indexing.as_ref())
            .expect("buffers sized by the resampler");
        written
    }
}

/// Drop the startup delay, then pass produced samples on.
fn emit(inner: &mut Inner, produced: usize, sink: &mut impl FnMut(&[f32])) -> u64 {
    emit_limited(inner, produced, usize::MAX, sink)
}

fn emit_limited(
    inner: &mut Inner,
    produced: usize,
    limit: usize,
    sink: &mut impl FnMut(&[f32]),
) -> u64 {
    let skip = inner.delay_left.min(produced);
    inner.delay_left -= skip;
    let available = &inner.output[skip..produced];
    let take = available.len().min(limit);
    if take > 0 {
        sink(&available[..take]);
    }
    take as u64
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::FeatureValue;
    use crate::dsp::spectral::{SpectralAnalyzer, SpectralConfig};
    use crate::dsp::synth;

    fn resample(signal: &[f32], from: u32, to: u32) -> Vec<f32> {
        let mut r = MonoResampler::new(from, to);
        let mut out = Vec::new();
        for chunk in signal.chunks(3001) {
            r.push(chunk, &mut |b| out.extend_from_slice(b));
        }
        r.finish(&mut |b| out.extend_from_slice(b));
        assert_eq!(r.frames_out(), out.len() as u64);
        out
    }

    #[test]
    fn downmix_averages_channels() {
        let mut out = Vec::new();
        downmix_mean(&[1.0, 0.0, 0.5, 0.5, -1.0, -1.0], 2, &mut out);
        assert_eq!(out, vec![0.5, 0.5, -1.0]);
    }

    #[test]
    fn passthrough_when_rates_match() {
        let s = synth::sine(22_050, 0.5, 440.0, 0.5);
        assert_eq!(resample(&s, 22_050, 22_050), s);
    }

    #[test]
    fn output_length_matches_ratio() {
        for (from, expected) in [(44_100, 22_050), (48_000, 22_050), (8_000, 22_050)] {
            let out = resample(&synth::sine(from, 1.0, 440.0, 0.5), from, 22_050);
            assert_eq!(out.len(), expected, "from {from}");
        }
    }

    #[test]
    fn preserves_frequency_and_amplitude() {
        let out = resample(&synth::sine(44_100, 2.0, 440.0, 0.5), 44_100, 22_050);
        // Ignore edges where the filter ramps.
        let body = &out[2048..out.len() - 2048];
        let peak = body.iter().fold(0.0f32, |m, x| m.max(x.abs()));
        assert!((peak - 0.5).abs() < 0.01, "peak {peak}");

        let mut a = SpectralAnalyzer::new(SpectralConfig::default());
        a.push(body);
        let centroid = a
            .finish()
            .into_iter()
            .find(|f| f.key == "spectral_centroid_mean")
            .and_then(|f| f.value);
        let Some(FeatureValue::Scalar(c)) = centroid else {
            panic!("no centroid")
        };
        assert!((c - 440.0).abs() < 22.0, "centroid {c}");
    }

    #[test]
    fn removes_content_above_new_nyquist() {
        // 15 kHz cannot be represented at 22,050 Hz and must be filtered out.
        let out = resample(&synth::sine(44_100, 1.0, 15_000.0, 0.5), 44_100, 22_050);
        let body = &out[2048..out.len() - 2048];
        let peak = body.iter().fold(0.0f32, |m, x| m.max(x.abs()));
        assert!(peak < 0.01, "aliased peak {peak}");
    }
}
