//! Programme loudness (ITU-R BS.1770-4) and loudness range (EBU Tech 3342).
//!
//! The meter streams K-weighted, channel-weighted power in 100 ms sub-blocks.
//! Gating blocks (400 ms, 75% overlap) and short-term windows (3 s, 10 Hz
//! rate) are both exact means of consecutive sub-blocks, so only ten numbers
//! per second of audio are retained.
//!
//! * Integrated loudness: absolute gate at −70 LUFS, then a relative gate
//!   10 LU below the mean of the absolutely gated blocks.
//! * Loudness range: short-term loudness gated at −70 LUFS and 20 LU below the
//!   mean; LRA is the spread between the 10th and 95th percentiles.

use super::kweighting::KWeighting;
use crate::domain::AudioFeature;

/// Version of the loudness analyzers. Bump when results can change.
pub const ALGORITHM_VERSION: &str = "loudness/1.0.0";

const ABSOLUTE_GATE_LUFS: f64 = -70.0;
const RELATIVE_GATE_LU: f64 = -10.0;
const LRA_RELATIVE_GATE_LU: f64 = -20.0;
const SUBBLOCKS_PER_BLOCK: usize = 4; // 400 ms
const SUBBLOCKS_PER_SHORT_TERM: usize = 30; // 3 s
const MIN_SAMPLE_RATE: u32 = 8_000;

/// BS.1770 channel weights for supported layouts, in decoder channel order.
///
/// Mono through three channels are front channels (weight 1). Five and six
/// channels follow the WAVE/FLAC order `L R C [LFE] Ls Rs`: surrounds weigh
/// 1.41 (+1.5 dB) and the LFE channel is excluded. Other layouts are not
/// measured rather than guessed.
pub fn channel_weights(channels: usize) -> Option<Vec<f64>> {
    match channels {
        1..=3 => Some(vec![1.0; channels]),
        5 => Some(vec![1.0, 1.0, 1.0, 1.41, 1.41]),
        6 => Some(vec![1.0, 1.0, 1.0, 0.0, 1.41, 1.41]),
        _ => None,
    }
}

fn to_lufs(power: f64) -> f64 {
    -0.691 + 10.0 * power.log10()
}

/// Streaming BS.1770 meter.
#[derive(Debug)]
pub struct LoudnessMeter {
    unsupported: Option<&'static str>,
    weights: Vec<f64>,
    filters: Vec<KWeighting>,
    subblock_len: usize,
    channel_sums: Vec<f64>,
    frames_in_subblock: usize,
    /// Weighted mean-square power per completed 100 ms sub-block.
    subblocks: Vec<f64>,
}

impl LoudnessMeter {
    pub fn new(sample_rate: u32, channels: usize) -> Self {
        let weights = channel_weights(channels);
        let unsupported = if sample_rate < MIN_SAMPLE_RATE {
            Some("sample_rate_too_low")
        } else if weights.is_none() {
            Some("unsupported_channel_layout")
        } else {
            None
        };
        let weights = weights.unwrap_or_default();
        Self {
            unsupported,
            filters: vec![KWeighting::new(sample_rate); weights.len()],
            channel_sums: vec![0.0; weights.len()],
            weights,
            subblock_len: (sample_rate as usize).div_ceil(10).max(1),
            frames_in_subblock: 0,
            subblocks: Vec::new(),
        }
    }

    /// Feed interleaved samples at the native rate.
    pub fn push(&mut self, interleaved: &[f32]) {
        if self.unsupported.is_some() {
            return;
        }
        let channels = self.weights.len();
        for frame in interleaved.chunks_exact(channels) {
            for (ch, &s) in frame.iter().enumerate() {
                let y = self.filters[ch].process(f64::from(s));
                self.channel_sums[ch] += y * y;
            }
            self.frames_in_subblock += 1;
            if self.frames_in_subblock == self.subblock_len {
                let n = self.subblock_len as f64;
                let power = self
                    .channel_sums
                    .iter()
                    .zip(&self.weights)
                    .map(|(sum, w)| w * sum / n)
                    .sum();
                self.subblocks.push(power);
                self.channel_sums.iter_mut().for_each(|s| *s = 0.0);
                self.frames_in_subblock = 0;
            }
        }
    }

    /// Mean power of every window of `size` consecutive sub-blocks, step 1.
    fn windows(&self, size: usize) -> Vec<f64> {
        if self.subblocks.len() < size {
            return Vec::new();
        }
        let mut out = Vec::with_capacity(self.subblocks.len() - size + 1);
        let mut sum: f64 = self.subblocks[..size].iter().sum();
        out.push(sum / size as f64);
        for i in size..self.subblocks.len() {
            sum += self.subblocks[i] - self.subblocks[i - size];
            out.push(sum.max(0.0) / size as f64);
        }
        out
    }

    /// Integrated loudness in LUFS, or the reason it is unavailable.
    ///
    /// # Errors
    ///
    /// Returns a diagnostic code when the signal is too short, silent or in an
    /// unsupported format.
    pub fn integrated(&self) -> Result<f64, &'static str> {
        if let Some(reason) = self.unsupported {
            return Err(reason);
        }
        let blocks = self.windows(SUBBLOCKS_PER_BLOCK);
        if blocks.is_empty() {
            return Err("signal_shorter_than_block");
        }
        let above_absolute: Vec<f64> = blocks
            .into_iter()
            .filter(|&p| p > 0.0 && to_lufs(p) > ABSOLUTE_GATE_LUFS)
            .collect();
        if above_absolute.is_empty() {
            return Err("below_absolute_gate");
        }
        let relative_gate =
            to_lufs(above_absolute.iter().sum::<f64>() / above_absolute.len() as f64)
                + RELATIVE_GATE_LU;
        let gated: Vec<f64> = above_absolute
            .into_iter()
            .filter(|&p| to_lufs(p) > relative_gate)
            .collect();
        Ok(to_lufs(gated.iter().sum::<f64>() / gated.len() as f64))
    }

    /// Loudness range in LU, or the reason it is unavailable.
    ///
    /// # Errors
    ///
    /// Returns a diagnostic code when there is too little gated short-term
    /// loudness to form a distribution.
    pub fn range(&self) -> Result<f64, &'static str> {
        if let Some(reason) = self.unsupported {
            return Err(reason);
        }
        let short_term = self.windows(SUBBLOCKS_PER_SHORT_TERM);
        if short_term.is_empty() {
            return Err("signal_shorter_than_short_term_window");
        }
        let above_absolute: Vec<f64> = short_term
            .into_iter()
            .filter(|&p| p > 0.0 && to_lufs(p) > ABSOLUTE_GATE_LUFS)
            .collect();
        if above_absolute.is_empty() {
            return Err("below_absolute_gate");
        }
        let relative_gate =
            to_lufs(above_absolute.iter().sum::<f64>() / above_absolute.len() as f64)
                + LRA_RELATIVE_GATE_LU;
        let mut levels: Vec<f64> = above_absolute
            .into_iter()
            .map(to_lufs)
            .filter(|&l| l > relative_gate)
            .collect();
        if levels.len() < 2 {
            return Err("insufficient_short_term_blocks");
        }
        levels.sort_by(f64::total_cmp);
        Ok(percentile(&levels, 0.95) - percentile(&levels, 0.10))
    }

    pub fn features(&self) -> Vec<AudioFeature> {
        let v = ALGORITHM_VERSION;
        let feature = |key: &str, unit: &str, result: Result<f64, &'static str>| match result {
            Ok(value) => AudioFeature::scalar(key, value, Some(unit), v),
            Err(code) => AudioFeature::unavailable(key, Some(unit), v, code),
        };
        vec![
            feature("integrated_loudness", "LUFS", self.integrated()),
            feature("loudness_range", "LU", self.range()),
        ]
    }
}

/// Linear-interpolated percentile of sorted data, `q` in `[0, 1]`.
fn percentile(sorted: &[f64], q: f64) -> f64 {
    let pos = q * (sorted.len() - 1) as f64;
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    let lo = pos.floor() as usize;
    let hi = (lo + 1).min(sorted.len() - 1);
    sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo as f64)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dsp::synth;

    fn interleave(channels: &[Vec<f32>]) -> Vec<f32> {
        let frames = channels[0].len();
        (0..frames)
            .flat_map(|i| channels.iter().map(move |c| c[i]))
            .collect()
    }

    fn amplitude(dbfs: f64) -> f32 {
        #[allow(clippy::cast_possible_truncation)]
        let a = 10f64.powf(dbfs / 20.0) as f32;
        a
    }

    fn meter(signal: &[f32], rate: u32, channels: usize) -> LoudnessMeter {
        let mut m = LoudnessMeter::new(rate, channels);
        for chunk in signal.chunks(4093 * channels) {
            m.push(chunk);
        }
        m
    }

    /// EBU Tech 3341 case 1/2 style: a 1 kHz stereo sine at −23 dBFS in both
    /// channels reads −23.0 LUFS (tolerance ±0.1 LU).
    #[test]
    fn stereo_sine_at_minus_23_reads_minus_23_lufs() {
        for rate in [44_100, 48_000] {
            let s = synth::sine(rate, 20.0, 997.0, amplitude(-23.0));
            let m = meter(&interleave(&[s.clone(), s]), rate, 2);
            let l = m.integrated().unwrap();
            assert!((l + 23.0).abs() < 0.1, "{rate} Hz: {l}");
        }
    }

    #[test]
    fn mono_is_three_db_below_dual_mono() {
        let s = synth::sine(48_000, 10.0, 997.0, amplitude(-20.0));
        let mono = meter(&s, 48_000, 1).integrated().unwrap();
        let stereo = meter(&interleave(&[s.clone(), s]), 48_000, 2)
            .integrated()
            .unwrap();
        assert!((stereo - mono - 3.0103).abs() < 0.05, "{mono} vs {stereo}");
    }

    /// The relative gate ignores quiet passages: a loud section followed by a
    /// much quieter one reads close to the loud section alone.
    #[test]
    fn relative_gate_ignores_quiet_passages() {
        let mut s = synth::sine(48_000, 10.0, 997.0, amplitude(-20.0));
        s.extend(synth::sine(48_000, 10.0, 997.0, amplitude(-50.0)));
        let l = meter(&interleave(&[s.clone(), s]), 48_000, 2)
            .integrated()
            .unwrap();
        assert!((l + 20.0).abs() < 0.1, "{l}");
    }

    /// EBU Tech 3342 case 1 style: −20 then −30 dBFS stereo sine gives an LRA
    /// of 10 LU (tolerance ±1 LU).
    #[test]
    fn loudness_range_of_two_levels() {
        let mut s = synth::sine(48_000, 20.0, 997.0, amplitude(-20.0));
        s.extend(synth::sine(48_000, 20.0, 997.0, amplitude(-30.0)));
        let lra = meter(&interleave(&[s.clone(), s]), 48_000, 2)
            .range()
            .unwrap();
        assert!((lra - 10.0).abs() < 1.0, "{lra}");
    }

    #[test]
    fn steady_tone_has_near_zero_range() {
        let s = synth::sine(48_000, 20.0, 997.0, amplitude(-18.0));
        let lra = meter(&s, 48_000, 1).range().unwrap();
        assert!(lra < 0.1, "{lra}");
    }

    #[test]
    fn surround_weights_and_lfe_exclusion() {
        let rate = 48_000;
        let tone = synth::sine(rate, 5.0, 997.0, amplitude(-20.0));
        let silent = synth::silence(rate, 5.0);
        // Tone only in the LFE channel (index 3 of 5.1) contributes nothing.
        let lfe_only = interleave(&[
            silent.clone(),
            silent.clone(),
            silent.clone(),
            tone.clone(),
            silent.clone(),
            silent.clone(),
        ]);
        assert_eq!(
            meter(&lfe_only, rate, 6).integrated(),
            Err("below_absolute_gate")
        );
        // A surround channel weighs +1.5 dB relative to a front channel.
        let front = interleave(&[
            tone.clone(),
            silent.clone(),
            silent.clone(),
            silent.clone(),
            silent.clone(),
        ]);
        let surround = interleave(&[
            silent.clone(),
            silent.clone(),
            silent.clone(),
            tone.clone(),
            silent,
        ]);
        let diff = meter(&surround, rate, 5).integrated().unwrap()
            - meter(&front, rate, 5).integrated().unwrap();
        assert!((diff - 1.494).abs() < 0.01, "{diff}");
    }

    #[test]
    fn unavailable_states_have_reasons() {
        let silence = synth::silence(48_000, 5.0);
        assert_eq!(
            meter(&silence, 48_000, 1).integrated(),
            Err("below_absolute_gate")
        );
        let short = synth::sine(48_000, 0.3, 997.0, 0.5);
        assert_eq!(
            meter(&short, 48_000, 1).integrated(),
            Err("signal_shorter_than_block")
        );
        assert_eq!(
            meter(&short, 48_000, 1).range(),
            Err("signal_shorter_than_short_term_window")
        );
        let quad = vec![0.1f32; 4 * 48_000];
        assert_eq!(
            meter(&quad, 48_000, 4).integrated(),
            Err("unsupported_channel_layout")
        );
    }

    #[test]
    fn features_never_carry_values_when_unavailable() {
        let f = meter(&synth::silence(48_000, 5.0), 48_000, 2).features();
        assert_eq!(f.len(), 2);
        assert!(f.iter().all(|x| !x.is_valid() && x.value.is_none()));
    }
}
