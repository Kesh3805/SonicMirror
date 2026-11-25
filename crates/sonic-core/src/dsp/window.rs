//! Window functions for short-time spectral analysis.

use std::f64::consts::TAU;

/// Periodic Hann window of length `n`, suitable for overlapped STFT frames.
///
/// The periodic form (denominator `n`, not `n - 1`) gives constant overlap-add
/// at 50% and 75% overlap.
pub fn hann(n: usize) -> Vec<f32> {
    if n == 0 {
        return Vec::new();
    }
    let len = n as f64;
    (0..n)
        .map(|i| {
            #[allow(clippy::cast_possible_truncation)]
            let w = (0.5 - 0.5 * (TAU * i as f64 / len).cos()) as f32;
            w
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hann_endpoints_and_peak() {
        let w = hann(8);
        assert!(w[0].abs() < 1e-7);
        assert!((w[4] - 1.0).abs() < 1e-6);
        assert!((w[2] - w[6]).abs() < 1e-6, "symmetric about the centre");
    }

    #[test]
    fn hann_constant_overlap_add_at_75_percent() {
        let n = 2048;
        let hop = 512;
        let w = hann(n);
        // Sum of four shifted windows is constant (= 2.0) away from the edges.
        for i in 0..hop {
            let sum: f32 = (0..4).map(|k| w[i + k * hop]).sum();
            assert!((sum - 2.0).abs() < 1e-4, "sum {sum} at {i}");
        }
    }

    #[test]
    fn empty_window() {
        assert_eq!(hann(0).len(), 0);
    }
}
