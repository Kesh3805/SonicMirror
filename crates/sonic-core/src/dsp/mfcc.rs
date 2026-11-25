//! Mel-frequency cepstral coefficients (MFCC) from short-time power spectra.
//!
//! Configuration (versioned by [`ALGORITHM_VERSION`]):
//! * 40 triangular mel bands (HTK mel scale), 20 Hz to Nyquist, unit-height
//!   triangles applied to the one-sided power spectrum;
//! * log compression `ln(max(E, 1e-10))`;
//! * orthonormal DCT-II, keeping coefficients c0…c12.
//!
//! Per-frame coefficients are aggregated into a 13-dimensional mean and
//! standard deviation. MFCCs summarize broad timbre (spectral envelope); they
//! are not perceptual descriptors on their own.

use std::f64::consts::PI;

pub const ALGORITHM_VERSION: &str = "mfcc/1.0.0";
pub const BANDS: usize = 40;
pub const COEFFICIENTS: usize = 13;
pub const MIN_HZ: f64 = 20.0;
const LOG_FLOOR: f64 = 1e-10;

/// HTK mel scale.
pub fn hz_to_mel(hz: f64) -> f64 {
    2595.0 * (1.0 + hz / 700.0).log10()
}

pub fn mel_to_hz(mel: f64) -> f64 {
    700.0 * (10f64.powf(mel / 2595.0) - 1.0)
}

/// Precomputed mel filterbank and DCT matrix for one FFT configuration.
#[derive(Debug, Clone)]
pub struct MfccExtractor {
    /// Per band: (first bin, weights for consecutive bins).
    filters: Vec<(usize, Vec<f64>)>,
    dct: Vec<[f64; BANDS]>,
    log_mel: Vec<f64>,
}

impl MfccExtractor {
    /// Build for a one-sided spectrum of `bins` bins at `sample_rate`.
    pub fn new(sample_rate: u32, bins: usize) -> Self {
        let nyquist = f64::from(sample_rate) / 2.0;
        let bin_hz = nyquist / (bins.saturating_sub(1).max(1)) as f64;
        let (lo, hi) = (hz_to_mel(MIN_HZ), hz_to_mel(nyquist));
        let edges: Vec<f64> = (0..BANDS + 2)
            .map(|i| mel_to_hz(lo + (hi - lo) * i as f64 / (BANDS + 1) as f64))
            .collect();

        let filters = (0..BANDS)
            .map(|b| {
                let (left, centre, right) = (edges[b], edges[b + 1], edges[b + 2]);
                #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
                let first = (left / bin_hz).floor().max(0.0) as usize;
                #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
                let last = ((right / bin_hz).ceil() as usize).min(bins - 1);
                let weights = (first..=last)
                    .map(|k| {
                        let f = k as f64 * bin_hz;
                        if f <= left || f >= right {
                            0.0
                        } else if f <= centre {
                            (f - left) / (centre - left)
                        } else {
                            (right - f) / (right - centre)
                        }
                    })
                    .collect();
                (first, weights)
            })
            .collect();

        // Orthonormal DCT-II rows for the kept coefficients.
        let n = BANDS as f64;
        let dct = (0..COEFFICIENTS)
            .map(|k| {
                let scale = if k == 0 {
                    (1.0 / n).sqrt()
                } else {
                    (2.0 / n).sqrt()
                };
                let mut row = [0.0; BANDS];
                for (m, cell) in row.iter_mut().enumerate() {
                    *cell = scale * (PI * k as f64 * (m as f64 + 0.5) / n).cos();
                }
                row
            })
            .collect();

        Self {
            filters,
            dct,
            log_mel: vec![0.0; BANDS],
        }
    }

    /// Mel band energies for one power spectrum.
    pub fn mel_energies(&self, power: &[f64]) -> Vec<f64> {
        self.filters
            .iter()
            .map(|(first, weights)| {
                weights
                    .iter()
                    .zip(&power[*first..])
                    .map(|(w, p)| w * p)
                    .sum()
            })
            .collect()
    }

    /// Coefficients c0…c12 for one frame's one-sided power spectrum.
    pub fn coefficients(&mut self, power: &[f64]) -> [f64; COEFFICIENTS] {
        let energies = self.mel_energies(power);
        for (dst, e) in self.log_mel.iter_mut().zip(energies) {
            *dst = e.max(LOG_FLOOR).ln();
        }
        let mut out = [0.0; COEFFICIENTS];
        for (c, row) in out.iter_mut().zip(&self.dct) {
            *c = row.iter().zip(&self.log_mel).map(|(a, b)| a * b).sum();
        }
        out
    }
}

/// Running mean and standard deviation of MFCC vectors.
#[derive(Debug, Clone, Default)]
pub struct MfccSummary {
    n: u64,
    mean: [f64; COEFFICIENTS],
    m2: [f64; COEFFICIENTS],
}

impl MfccSummary {
    pub fn push(&mut self, c: &[f64; COEFFICIENTS]) {
        self.n += 1;
        let n = self.n as f64;
        for ((x, mean), m2) in c.iter().zip(&mut self.mean).zip(&mut self.m2) {
            let delta = x - *mean;
            *mean += delta / n;
            *m2 += delta * (x - *mean);
        }
    }

    pub fn frames(&self) -> u64 {
        self.n
    }

    pub fn mean(&self) -> Vec<f64> {
        self.mean.to_vec()
    }

    pub fn std(&self) -> Vec<f64> {
        if self.n < 2 {
            return vec![0.0; COEFFICIENTS];
        }
        let n = self.n as f64;
        self.m2.iter().map(|m| (m / n).sqrt()).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SR: u32 = 22_050;
    const BINS: usize = 1025;

    fn tone_power(freq: f64, level: f64) -> Vec<f64> {
        let bin_hz = f64::from(SR) / 2.0 / (BINS - 1) as f64;
        let mut p = vec![0.0; BINS];
        #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
        let k = (freq / bin_hz).round() as usize;
        p[k] = level;
        p
    }

    #[test]
    fn mel_scale_round_trips() {
        for hz in [20.0, 440.0, 1000.0, 8000.0] {
            assert!((mel_to_hz(hz_to_mel(hz)) - hz).abs() < 1e-9);
        }
        assert!(
            (hz_to_mel(1000.0) - 999.985).abs() < 0.01,
            "HTK: 1 kHz ≈ 1000 mel"
        );
    }

    #[test]
    fn dct_rows_are_orthonormal() {
        let m = MfccExtractor::new(SR, BINS);
        for i in 0..COEFFICIENTS {
            for j in 0..COEFFICIENTS {
                let dot: f64 = m.dct[i].iter().zip(&m.dct[j]).map(|(a, b)| a * b).sum();
                let expected = if i == j { 1.0 } else { 0.0 };
                assert!((dot - expected).abs() < 1e-12, "rows {i},{j}: {dot}");
            }
        }
    }

    #[test]
    fn a_tone_lands_in_the_matching_band() {
        let m = MfccExtractor::new(SR, BINS);
        let energies = m.mel_energies(&tone_power(1000.0, 1.0));
        let (best, _) = energies
            .iter()
            .enumerate()
            .max_by(|a, b| a.1.total_cmp(b.1))
            .unwrap();
        let lo = hz_to_mel(MIN_HZ);
        let hi = hz_to_mel(f64::from(SR) / 2.0);
        let centre = mel_to_hz(lo + (hi - lo) * (best + 1) as f64 / (BANDS + 1) as f64);
        assert!((centre - 1000.0).abs() < 120.0, "band centre {centre}");
    }

    #[test]
    fn c0_rises_with_level_and_higher_coefficients_do_not() {
        let mut m = MfccExtractor::new(SR, BINS);
        let flat_quiet = vec![1e-4; BINS];
        let flat_loud = vec![1e-2; BINS];
        let q = m.coefficients(&flat_quiet);
        let l = m.coefficients(&flat_loud);
        // Scaling power by 100 adds ln(100)·√40 to c0 only.
        assert!((l[0] - q[0] - 100f64.ln() * (BANDS as f64).sqrt()).abs() < 1e-6);
        for k in 1..COEFFICIENTS {
            assert!((l[k] - q[k]).abs() < 1e-9, "c{k} changed with level");
        }
    }

    #[test]
    fn summary_tracks_mean_and_spread() {
        let mut s = MfccSummary::default();
        s.push(&[1.0; COEFFICIENTS]);
        s.push(&[3.0; COEFFICIENTS]);
        assert_eq!(s.frames(), 2);
        assert!(s.mean().iter().all(|v| (v - 2.0).abs() < 1e-12));
        assert!(s.std().iter().all(|v| (v - 1.0).abs() < 1e-12));
    }
}
