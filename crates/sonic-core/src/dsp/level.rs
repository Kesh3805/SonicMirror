//! Sample-level measurements: RMS level, sample peak and crest factor.
//!
//! Levels are reported in dBFS where a full-scale sine has an RMS of
//! −3.01 dBFS and a peak of 0 dBFS. Digital silence has no defined level,
//! so it is reported as unavailable rather than as −∞ or a fabricated floor.

use crate::domain::AudioFeature;

/// Version of the level analyzers. Bump when results can change.
pub const ALGORITHM_VERSION: &str = "level/1.0.0";

/// Linear amplitudes at or below this are treated as digital silence
/// (≈ −200 dBFS, well below 24-bit quantization).
const SILENCE_THRESHOLD: f64 = 1e-10;

/// Raw level statistics for a block of mono samples.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LevelStats {
    /// Root-mean-square amplitude (linear).
    pub rms: f64,
    /// Maximum absolute sample value (linear).
    pub peak: f64,
    /// Number of samples measured.
    pub samples: usize,
}

impl LevelStats {
    /// Measure a slice of samples. Accumulates in `f64` for long signals.
    pub fn measure(samples: &[f32]) -> Self {
        let mut acc = LevelAccumulator::default();
        acc.push(samples);
        acc.stats()
    }

    pub fn is_silent(&self) -> bool {
        self.peak <= SILENCE_THRESHOLD
    }
}

/// Streaming accumulator for [`LevelStats`].
///
/// Interleaved multichannel input is measured over every sample of every
/// channel: the peak is the largest absolute sample on any channel and the RMS
/// is the root of the mean power across all channels.
#[derive(Debug, Clone, Copy, Default)]
pub struct LevelAccumulator {
    sum_sq: f64,
    peak: f64,
    samples: usize,
}

impl LevelAccumulator {
    pub fn push(&mut self, samples: &[f32]) {
        for &s in samples {
            let s = f64::from(s);
            self.sum_sq += s * s;
            self.peak = self.peak.max(s.abs());
        }
        self.samples += samples.len();
    }

    pub fn stats(&self) -> LevelStats {
        let rms = if self.samples == 0 {
            0.0
        } else {
            (self.sum_sq / self.samples as f64).sqrt()
        };
        LevelStats {
            rms,
            peak: self.peak,
            samples: self.samples,
        }
    }

    /// Compute the level features from everything pushed so far.
    pub fn features(&self) -> Vec<AudioFeature> {
        features_from(self.stats())
    }
}

/// Convert a linear amplitude to dBFS. Returns `None` for silence.
pub fn to_dbfs(linear: f64) -> Option<f64> {
    (linear > SILENCE_THRESHOLD).then(|| 20.0 * linear.log10())
}

/// Compute `rms_dbfs`, `sample_peak_dbfs` and `crest_factor_db` features.
pub fn level_features(samples: &[f32]) -> Vec<AudioFeature> {
    features_from(LevelStats::measure(samples))
}

fn features_from(stats: LevelStats) -> Vec<AudioFeature> {
    let reason = if stats.samples == 0 {
        "empty_signal"
    } else {
        "digital_silence"
    };

    let rms = to_dbfs(stats.rms);
    let peak = to_dbfs(stats.peak);

    let feature = |key: &str, unit: &str, value: Option<f64>| match value {
        Some(v) => AudioFeature::scalar(key, v, Some(unit), ALGORITHM_VERSION),
        None => AudioFeature::unavailable(key, Some(unit), ALGORITHM_VERSION, reason),
    };

    vec![
        feature("rms_dbfs", "dBFS", rms),
        feature("sample_peak_dbfs", "dBFS", peak),
        feature("crest_factor_db", "dB", rms.zip(peak).map(|(r, p)| p - r)),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{FeatureStatus, FeatureValue};
    use crate::dsp::synth;

    fn value(features: &[AudioFeature], key: &str) -> Option<f64> {
        features
            .iter()
            .find(|f| f.key == key)
            .and_then(|f| match f.value {
                Some(FeatureValue::Scalar(v)) => Some(v),
                _ => None,
            })
    }

    #[test]
    fn full_scale_sine_levels() {
        // Integer number of cycles so RMS is exactly 1/√2.
        let s = synth::sine(48_000, 1.0, 1000.0, 1.0);
        let f = level_features(&s);
        let rms = value(&f, "rms_dbfs").unwrap();
        let peak = value(&f, "sample_peak_dbfs").unwrap();
        let crest = value(&f, "crest_factor_db").unwrap();
        assert!((rms - (-3.0103)).abs() < 0.01, "rms {rms}");
        assert!(peak.abs() < 0.01, "peak {peak}");
        assert!((crest - 3.0103).abs() < 0.01, "crest {crest}");
    }

    #[test]
    fn known_amplitude_scales_by_6db_per_halving() {
        let full = LevelStats::measure(&synth::sine(48_000, 1.0, 500.0, 1.0));
        let half = LevelStats::measure(&synth::sine(48_000, 1.0, 500.0, 0.5));
        let delta = to_dbfs(full.rms).unwrap() - to_dbfs(half.rms).unwrap();
        assert!((delta - 6.0206).abs() < 0.01);
    }

    #[test]
    fn square_wave_has_zero_crest_factor() {
        let s: Vec<f32> = (0..1000)
            .map(|i| if i % 2 == 0 { 0.25 } else { -0.25 })
            .collect();
        let crest = value(&level_features(&s), "crest_factor_db").unwrap();
        assert!(crest.abs() < 1e-9);
    }

    #[test]
    fn silence_is_unavailable_not_negative_infinity() {
        let f = level_features(&synth::silence(44_100, 1.0));
        assert_eq!(f.len(), 3);
        for feat in &f {
            assert_eq!(feat.status, FeatureStatus::Unavailable);
            assert!(feat.value.is_none());
            assert_eq!(feat.diagnostic_code.as_deref(), Some("digital_silence"));
        }
    }

    #[test]
    fn empty_signal_is_unavailable() {
        let f = level_features(&[]);
        assert!(
            f.iter()
                .all(|x| x.diagnostic_code.as_deref() == Some("empty_signal"))
        );
    }

    #[test]
    fn impulse_peak_is_full_scale() {
        let f = level_features(&synth::impulse(8000, 1.0, 0.5, -1.0));
        assert!(value(&f, "sample_peak_dbfs").unwrap().abs() < 1e-9);
    }
}
