//! K-weighting pre-filter from ITU-R BS.1770-4.
//!
//! Two cascaded biquads: a high-shelf modelling the acoustic effect of the
//! head ("stage 1") and a high-pass RLB filter ("stage 2"). BS.1770 publishes
//! coefficients only for 48 kHz; for other rates the analogue prototypes are
//! re-derived with the bilinear transform, matching the published 48 kHz
//! values to better than 1e-6.

use std::f64::consts::PI;

/// Normalized biquad `y = b0 x + b1 x₁ + b2 x₂ − a1 y₁ − a2 y₂` in transposed
/// direct form II, accumulated in `f64`.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Biquad {
    pub b0: f64,
    pub b1: f64,
    pub b2: f64,
    pub a1: f64,
    pub a2: f64,
    s1: f64,
    s2: f64,
}

impl Biquad {
    pub fn new(b0: f64, b1: f64, b2: f64, a1: f64, a2: f64) -> Self {
        Self {
            b0,
            b1,
            b2,
            a1,
            a2,
            s1: 0.0,
            s2: 0.0,
        }
    }

    #[inline]
    pub fn process(&mut self, x: f64) -> f64 {
        let y = self.b0 * x + self.s1;
        self.s1 = self.b1 * x - self.a1 * y + self.s2;
        self.s2 = self.b2 * x - self.a2 * y;
        y
    }

    /// Magnitude response in dB at `freq` Hz.
    pub fn gain_db(&self, freq: f64, sample_rate: f64) -> f64 {
        let w = 2.0 * PI * freq / sample_rate;
        let (c1, s1, c2, s2) = (w.cos(), w.sin(), (2.0 * w).cos(), (2.0 * w).sin());
        let num_re = self.b0 + self.b1 * c1 + self.b2 * c2;
        let num_im = -(self.b1 * s1 + self.b2 * s2);
        let den_re = 1.0 + self.a1 * c1 + self.a2 * c2;
        let den_im = -(self.a1 * s1 + self.a2 * s2);
        let num = num_re.hypot(num_im);
        let den = den_re.hypot(den_im);
        20.0 * (num / den).log10()
    }
}

/// Stage 1: high-shelf, +4 dB above ~1.5 kHz.
pub fn shelf(sample_rate: f64) -> Biquad {
    const F0: f64 = 1_681.974_450_955_533;
    const GAIN_DB: f64 = 3.999_843_853_973_347;
    const Q: f64 = 0.707_175_236_955_419_6;
    let k = (PI * F0 / sample_rate).tan();
    let vh = 10f64.powf(GAIN_DB / 20.0);
    let vb = vh.powf(0.499_666_774_154_541_6);
    let a0 = 1.0 + k / Q + k * k;
    Biquad::new(
        (vh + vb * k / Q + k * k) / a0,
        2.0 * (k * k - vh) / a0,
        (vh - vb * k / Q + k * k) / a0,
        2.0 * (k * k - 1.0) / a0,
        (1.0 - k / Q + k * k) / a0,
    )
}

/// Stage 2: RLB high-pass at ~38 Hz.
pub fn high_pass(sample_rate: f64) -> Biquad {
    const F0: f64 = 38.135_470_876_024_44;
    const Q: f64 = 0.500_327_037_323_877_3;
    let k = (PI * F0 / sample_rate).tan();
    let a0 = 1.0 + k / Q + k * k;
    Biquad::new(
        1.0,
        -2.0,
        1.0,
        2.0 * (k * k - 1.0) / a0,
        (1.0 - k / Q + k * k) / a0,
    )
}

/// The full K-weighting cascade for one channel.
#[derive(Debug, Clone, Copy)]
pub struct KWeighting {
    shelf: Biquad,
    high_pass: Biquad,
}

impl KWeighting {
    pub fn new(sample_rate: u32) -> Self {
        let fs = f64::from(sample_rate);
        Self {
            shelf: shelf(fs),
            high_pass: high_pass(fs),
        }
    }

    #[inline]
    pub fn process(&mut self, x: f64) -> f64 {
        self.high_pass.process(self.shelf.process(x))
    }

    /// Combined magnitude response in dB.
    pub fn gain_db(&self, freq: f64, sample_rate: f64) -> f64 {
        self.shelf.gain_db(freq, sample_rate) + self.high_pass.gain_db(freq, sample_rate)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn close(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-6
    }

    /// Coefficients published in ITU-R BS.1770-4, Tables 1 and 2 (48 kHz).
    #[test]
    fn matches_published_48k_coefficients() {
        let s = shelf(48_000.0);
        assert!(close(s.b0, 1.535_124_859_586_97), "{}", s.b0);
        assert!(close(s.b1, -2.691_696_189_406_38), "{}", s.b1);
        assert!(close(s.b2, 1.198_392_810_852_85), "{}", s.b2);
        assert!(close(s.a1, -1.690_659_293_182_41), "{}", s.a1);
        assert!(close(s.a2, 0.732_480_774_215_85), "{}", s.a2);

        let h = high_pass(48_000.0);
        assert!(close(h.a1, -1.990_047_454_833_98), "{}", h.a1);
        assert!(close(h.a2, 0.990_072_250_366_21), "{}", h.a2);
    }

    #[test]
    fn response_shape_is_rate_independent() {
        for rate in [44_100u32, 48_000, 96_000] {
            let k = KWeighting::new(rate);
            let fs = f64::from(rate);
            // Roughly +0.7 dB at 1 kHz, +4 dB shelf at 10 kHz, steep cut below 40 Hz.
            assert!((k.gain_db(997.0, fs) - 0.69).abs() < 0.05, "1k at {fs}");
            assert!((k.gain_db(10_000.0, fs) - 4.0).abs() < 0.2, "10k at {fs}");
            assert!(k.gain_db(20.0, fs) < -9.0, "20 Hz at {fs}");
        }
    }

    #[test]
    fn filter_is_stable_on_dc() {
        let mut k = KWeighting::new(44_100);
        let mut y = 0.0;
        for _ in 0..44_100 {
            y = k.process(1.0);
        }
        assert!(y.abs() < 1e-3, "DC must be removed, got {y}");
    }
}
