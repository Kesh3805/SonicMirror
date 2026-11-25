//! Streaming short-time spectral features.
//!
//! Samples are pushed incrementally; frames of [`SpectralConfig::frame_size`]
//! samples are taken every [`SpectralConfig::hop_size`] samples, windowed with
//! a periodic Hann window and transformed with an FFT. Per-frame descriptors
//! are aggregated into mean and standard deviation without holding the signal
//! in memory.

use std::sync::Arc;

use rustfft::{Fft, FftPlanner, num_complex::Complex32};

use super::window::hann;
use crate::domain::AudioFeature;

/// Version of the spectral analyzers. Bump when results can change.
pub const ALGORITHM_VERSION: &str = "spectral/1.0.0";

/// Frames whose total power is below this are treated as silent and skipped.
const SILENT_FRAME_POWER: f64 = 1e-12;

/// Floor that keeps logarithms and divisions finite on empty bins.
const FLOOR: f64 = 1e-20;

/// Onset envelope floor, in dB relative to the bin magnitude of a full-scale
/// sine. Dither and quantization noise sit well below this and so contribute
/// no spurious onset strength.
const ONSET_FLOOR_DB: f64 = -90.0;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SpectralConfig {
    pub sample_rate: u32,
    pub frame_size: usize,
    pub hop_size: usize,
    /// Fraction of spectral energy below the rolloff frequency.
    pub rolloff_fraction: f64,
}

impl Default for SpectralConfig {
    /// PRD §11 baseline: 22,050 Hz, 2048-sample Hann frames, 512 hop, 85% rolloff.
    fn default() -> Self {
        Self {
            sample_rate: 22_050,
            frame_size: 2048,
            hop_size: 512,
            rolloff_fraction: 0.85,
        }
    }
}

/// Descriptors of a single analysis frame.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct FrameDescriptors {
    pub centroid_hz: f64,
    pub bandwidth_hz: f64,
    pub rolloff_hz: f64,
    pub flatness: f64,
    /// Distance between consecutive L2-normalized spectra, in `[0, √2]`.
    pub flux: Option<f64>,
}

/// Welford running mean and population variance.
#[derive(Debug, Clone, Copy, Default)]
struct Running {
    n: u64,
    mean: f64,
    m2: f64,
}

impl Running {
    fn push(&mut self, x: f64) {
        self.n += 1;
        let delta = x - self.mean;
        self.mean += delta / self.n as f64;
        self.m2 += delta * (x - self.mean);
    }

    fn std(&self) -> f64 {
        if self.n < 2 {
            0.0
        } else {
            (self.m2 / self.n as f64).sqrt()
        }
    }
}

const FEATURE_KEYS: [(&str, Option<&str>); 6] = [
    ("spectral_centroid_mean", Some("Hz")),
    ("spectral_centroid_std", Some("Hz")),
    ("spectral_bandwidth_mean", Some("Hz")),
    ("spectral_rolloff_mean", Some("Hz")),
    ("spectral_flatness_mean", Some("ratio")),
    ("spectral_flux_mean", None),
];

/// Streaming spectral analyzer.
pub struct SpectralAnalyzer {
    config: SpectralConfig,
    fft: Arc<dyn Fft<f32>>,
    window: Vec<f32>,
    pending: Vec<f32>,
    scratch: Vec<Complex32>,
    magnitudes: Vec<f64>,
    previous: Option<Vec<f64>>,
    log_previous: Vec<f64>,
    onset: Vec<f32>,
    frames: u64,
    centroid: Running,
    bandwidth: Running,
    rolloff: Running,
    flatness: Running,
    flux: Running,
}

impl std::fmt::Debug for SpectralAnalyzer {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("SpectralAnalyzer")
            .field("config", &self.config)
            .field("frames", &self.frames)
            .finish_non_exhaustive()
    }
}

impl SpectralAnalyzer {
    /// # Panics
    ///
    /// Panics if `frame_size` or `hop_size` is zero, or `hop_size > frame_size`.
    pub fn new(config: SpectralConfig) -> Self {
        assert!(
            config.frame_size > 0 && config.hop_size > 0,
            "frame and hop must be non-zero"
        );
        assert!(
            config.hop_size <= config.frame_size,
            "hop must not exceed frame size"
        );
        let fft = FftPlanner::<f32>::new().plan_fft_forward(config.frame_size);
        Self {
            config,
            fft,
            window: hann(config.frame_size),
            pending: Vec::with_capacity(config.frame_size * 2),
            scratch: vec![Complex32::default(); config.frame_size],
            magnitudes: vec![0.0; config.frame_size / 2 + 1],
            previous: None,
            log_previous: vec![ONSET_FLOOR_DB; config.frame_size / 2 + 1],
            onset: Vec::new(),
            frames: 0,
            centroid: Running::default(),
            bandwidth: Running::default(),
            rolloff: Running::default(),
            flatness: Running::default(),
            flux: Running::default(),
        }
    }

    pub fn config(&self) -> &SpectralConfig {
        &self.config
    }

    /// Onset strength per frame (one value per hop, silent frames included):
    /// the half-wave rectified increase in bin level (dB, floored at
    /// [`ONSET_FLOOR_DB`]), summed over bins. Rises sharply at note and
    /// percussion onsets and ignores the noise floor.
    pub fn onset_envelope(&self) -> &[f32] {
        &self.onset
    }

    /// Frames per second of the onset envelope.
    pub fn frame_rate(&self) -> f64 {
        f64::from(self.config.sample_rate) / self.config.hop_size as f64
    }

    fn push_onset(&mut self) {
        // A full-scale sine peaks at N/4 in a Hann-windowed FFT bin.
        let reference = self.config.frame_size as f64 / 4.0;
        let mut rise = 0.0;
        for (m, prev) in self.magnitudes.iter().zip(self.log_previous.iter_mut()) {
            let level = (20.0 * (m / reference).max(FLOOR).log10()).max(ONSET_FLOOR_DB);
            rise += (level - *prev).max(0.0);
            *prev = level;
        }
        #[allow(clippy::cast_possible_truncation)]
        self.onset.push(rise as f32);
    }

    /// Feed mono samples at `config.sample_rate`. Returns descriptors for every
    /// non-silent frame completed by this call.
    pub fn push(&mut self, samples: &[f32]) -> Vec<FrameDescriptors> {
        self.pending.extend_from_slice(samples);
        let (frame, hop) = (self.config.frame_size, self.config.hop_size);
        let mut out = Vec::new();
        let mut start = 0;
        while self.pending.len() - start >= frame {
            if let Some(d) = self.process_frame(start) {
                out.push(d);
            }
            start += hop;
        }
        self.pending.drain(..start);
        out
    }

    fn process_frame(&mut self, start: usize) -> Option<FrameDescriptors> {
        let frame = &self.pending[start..start + self.config.frame_size];
        for ((dst, &s), &w) in self.scratch.iter_mut().zip(frame).zip(&self.window) {
            *dst = Complex32::new(s * w, 0.0);
        }
        self.fft.process(&mut self.scratch);
        for (m, c) in self.magnitudes.iter_mut().zip(&self.scratch) {
            *m = f64::from(c.norm());
        }
        self.frames += 1;
        self.push_onset();

        let power: f64 = self.magnitudes.iter().map(|m| m * m).sum();
        if power < SILENT_FRAME_POWER {
            return None;
        }

        let bin_hz = f64::from(self.config.sample_rate) / self.config.frame_size as f64;
        let d = describe(
            &self.magnitudes,
            bin_hz,
            self.config.rolloff_fraction,
            self.previous.as_deref(),
        );
        self.centroid.push(d.centroid_hz);
        self.bandwidth.push(d.bandwidth_hz);
        self.rolloff.push(d.rolloff_hz);
        self.flatness.push(d.flatness);
        if let Some(flux) = d.flux {
            self.flux.push(flux);
        }
        match &mut self.previous {
            Some(prev) => prev.copy_from_slice(&self.magnitudes),
            None => self.previous = Some(self.magnitudes.clone()),
        }
        Some(d)
    }

    /// Aggregate mean / standard deviation features over all frames seen.
    pub fn finish(&self) -> Vec<AudioFeature> {
        let v = ALGORITHM_VERSION;
        if self.centroid.n == 0 {
            let reason = if self.frames == 0 {
                "signal_shorter_than_frame"
            } else {
                "digital_silence"
            };
            return FEATURE_KEYS
                .iter()
                .map(|(key, unit)| AudioFeature::unavailable(*key, *unit, v, reason))
                .collect();
        }
        let flux_mean = if self.flux.n == 0 {
            AudioFeature::unavailable("spectral_flux_mean", None, v, "single_frame")
        } else {
            AudioFeature::scalar("spectral_flux_mean", self.flux.mean, None, v)
        };
        vec![
            AudioFeature::scalar("spectral_centroid_mean", self.centroid.mean, Some("Hz"), v),
            AudioFeature::scalar("spectral_centroid_std", self.centroid.std(), Some("Hz"), v),
            AudioFeature::scalar(
                "spectral_bandwidth_mean",
                self.bandwidth.mean,
                Some("Hz"),
                v,
            ),
            AudioFeature::scalar("spectral_rolloff_mean", self.rolloff.mean, Some("Hz"), v),
            AudioFeature::scalar(
                "spectral_flatness_mean",
                self.flatness.mean,
                Some("ratio"),
                v,
            ),
            flux_mean,
        ]
    }
}

/// Compute descriptors from a one-sided magnitude spectrum.
fn describe(
    mag: &[f64],
    bin_hz: f64,
    rolloff_fraction: f64,
    previous: Option<&[f64]>,
) -> FrameDescriptors {
    let freq = |k: usize| k as f64 * bin_hz;
    let total: f64 = mag.iter().sum::<f64>().max(FLOOR);

    let centroid = mag
        .iter()
        .enumerate()
        .map(|(k, m)| freq(k) * m)
        .sum::<f64>()
        / total;
    let bandwidth = (mag
        .iter()
        .enumerate()
        .map(|(k, m)| (freq(k) - centroid).powi(2) * m)
        .sum::<f64>()
        / total)
        .sqrt();

    let energy: Vec<f64> = mag.iter().map(|m| m * m).collect();
    let threshold = rolloff_fraction * energy.iter().sum::<f64>();
    let mut cumulative = 0.0;
    let rolloff_bin = energy
        .iter()
        .position(|e| {
            cumulative += e;
            cumulative >= threshold
        })
        .unwrap_or(mag.len() - 1);

    // Flatness of the power spectrum: geometric mean over arithmetic mean.
    let n = energy.len() as f64;
    let log_mean = energy.iter().map(|e| (e + FLOOR).ln()).sum::<f64>() / n;
    let arith = energy.iter().sum::<f64>() / n + FLOOR;
    let flatness = (log_mean.exp() / arith).clamp(0.0, 1.0);

    let flux = previous.map(|prev| {
        let norm = |v: &[f64]| v.iter().map(|x| x * x).sum::<f64>().sqrt().max(FLOOR);
        let (a, b) = (norm(mag), norm(prev));
        mag.iter()
            .zip(prev)
            .map(|(x, y)| (x / a - y / b).powi(2))
            .sum::<f64>()
            .sqrt()
    });

    FrameDescriptors {
        centroid_hz: centroid,
        bandwidth_hz: bandwidth,
        rolloff_hz: freq(rolloff_bin),
        flatness,
        flux,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{FeatureStatus, FeatureValue};
    use crate::dsp::synth;

    const SR: u32 = 22_050;
    const BIN_HZ: f64 = 22_050.0 / 2048.0;

    fn analyze(signal: &[f32]) -> (Vec<FrameDescriptors>, Vec<AudioFeature>) {
        let mut a = SpectralAnalyzer::new(SpectralConfig::default());
        // Uneven chunks exercise the streaming frame boundaries.
        let mut frames = Vec::new();
        for chunk in signal.chunks(1000) {
            frames.extend(a.push(chunk));
        }
        (frames, a.finish())
    }

    fn get(features: &[AudioFeature], key: &str) -> f64 {
        match features
            .iter()
            .find(|f| f.key == key)
            .and_then(|f| f.value.clone())
        {
            Some(FeatureValue::Scalar(v)) => v,
            other => panic!("{key}: {other:?}"),
        }
    }

    #[test]
    fn sine_440_centroid_and_rolloff_within_two_bins() {
        let (_, f) = analyze(&synth::sine(SR, 2.0, 440.0, 0.8));
        let centroid = get(&f, "spectral_centroid_mean");
        let rolloff = get(&f, "spectral_rolloff_mean");
        assert!(
            (centroid - 440.0).abs() < 2.0 * BIN_HZ,
            "centroid {centroid}"
        );
        assert!((rolloff - 440.0).abs() < 2.0 * BIN_HZ, "rolloff {rolloff}");
    }

    #[test]
    fn centroid_tracks_frequency() {
        let (_, low) = analyze(&synth::sine(SR, 1.0, 220.0, 0.5));
        let (_, high) = analyze(&synth::sine(SR, 1.0, 3520.0, 0.5));
        let (l, h) = (
            get(&low, "spectral_centroid_mean"),
            get(&high, "spectral_centroid_mean"),
        );
        assert!(h > 10.0 * l, "low {l}, high {h}");
    }

    #[test]
    fn noise_is_flat_and_sine_is_tonal() {
        let (_, noise) = analyze(&synth::white_noise(SR, 2.0, 0.5, 9));
        let (_, sine) = analyze(&synth::sine(SR, 2.0, 1000.0, 0.5));
        let flat_noise = get(&noise, "spectral_flatness_mean");
        let flat_sine = get(&sine, "spectral_flatness_mean");
        assert!(flat_noise > 0.4, "noise flatness {flat_noise}");
        assert!(flat_sine < 0.05, "sine flatness {flat_sine}");
        // White noise spreads energy evenly: centroid near half of Nyquist.
        let centroid = get(&noise, "spectral_centroid_mean");
        assert!(
            (centroid - 5512.5).abs() < 600.0,
            "noise centroid {centroid}"
        );
    }

    #[test]
    fn stationary_sine_has_low_flux_and_chirp_higher() {
        let (_, sine) = analyze(&synth::sine(SR, 2.0, 1000.0, 0.5));
        let (_, chirp) = analyze(&synth::chirp(SR, 2.0, 100.0, 8000.0, 0.5));
        let a = get(&sine, "spectral_flux_mean");
        let b = get(&chirp, "spectral_flux_mean");
        assert!(a < 0.05, "sine flux {a}");
        assert!(b > a * 4.0, "chirp flux {b} vs sine {a}");
    }

    #[test]
    fn silence_reports_unavailable() {
        let (frames, f) = analyze(&synth::silence(SR, 1.0));
        assert_eq!(frames.len(), 0);
        assert!(f.iter().all(|x| x.status == FeatureStatus::Unavailable));
        assert_eq!(f[0].diagnostic_code.as_deref(), Some("digital_silence"));
    }

    #[test]
    fn short_signal_reports_unavailable() {
        let (_, f) = analyze(&synth::sine(SR, 0.01, 440.0, 0.5));
        assert_eq!(
            f[0].diagnostic_code.as_deref(),
            Some("signal_shorter_than_frame")
        );
    }

    #[test]
    fn frame_count_matches_hop() {
        let mut a = SpectralAnalyzer::new(SpectralConfig::default());
        let frames = a.push(&synth::sine(SR, 1.0, 440.0, 0.5));
        // floor((22050 - 2048) / 512) + 1 = 40
        assert_eq!(frames.len(), 40);
    }

    #[test]
    fn chunking_does_not_change_results() {
        let s = synth::white_noise(SR, 1.0, 0.5, 3);
        let mut whole = SpectralAnalyzer::new(SpectralConfig::default());
        whole.push(&s);
        let (_, chunked) = analyze(&s);
        assert_eq!(whole.finish(), chunked);
    }

    #[test]
    fn onset_envelope_has_one_value_per_frame() {
        let mut a = SpectralAnalyzer::new(SpectralConfig::default());
        a.push(&synth::silence(SR, 1.0));
        assert_eq!(a.onset_envelope().len(), 40);
        assert!(a.onset_envelope().iter().all(|&o| o == 0.0));
        assert!((a.frame_rate() - 43.066).abs() < 0.01);
    }

    #[test]
    fn onset_envelope_peaks_at_clicks() {
        let mut a = SpectralAnalyzer::new(SpectralConfig::default());
        a.push(&synth::click_track(SR, 4.0, 60.0, 0.8));
        let env = a.onset_envelope();
        let max = env.iter().copied().fold(0.0f32, f32::max);
        // Strong frames sit within one hop of each one-second click.
        let peaks: Vec<f64> = env
            .iter()
            .enumerate()
            .filter(|(_, v)| **v > max * 0.5)
            .map(|(i, _)| (i * 512 + 2048) as f64 / f64::from(SR))
            .collect();
        assert_ne!(peaks.len(), 0);
        for p in peaks {
            let nearest = p.round();
            assert!((p - nearest).abs() < 0.1, "onset frame at {p}s");
        }
    }

    #[test]
    fn onset_envelope_ignores_quantization_noise() {
        // Amplitude pulses (6 dB) on a sustained tone at 2 Hz, quantized to
        // 16 bits like a real file: the pulse must dominate the envelope.
        let tone = synth::sine(SR, 8.0, 330.0, 0.4);
        let pulsed: Vec<f32> = tone
            .iter()
            .enumerate()
            .map(|(i, s)| {
                let t = i as f64 / f64::from(SR);
                let phase = (t * 2.0).fract();
                #[allow(clippy::cast_possible_truncation)]
                let gain = if phase < 0.05 { 1.0 } else { 0.5 } as f32;
                (s * gain * 32767.0).round() / 32767.0
            })
            .collect();
        let mut a = SpectralAnalyzer::new(SpectralConfig::default());
        a.push(&pulsed);
        let env = a.onset_envelope();
        let mut sorted: Vec<f32> = env.to_vec();
        sorted.sort_by(f32::total_cmp);
        let median = sorted[sorted.len() / 2];
        let max = sorted[sorted.len() - 1];
        assert!(max > 20.0 * median.max(1e-3), "max {max}, median {median}");
    }
}
