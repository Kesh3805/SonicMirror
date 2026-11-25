//! Deterministic synthetic signals used as analysis fixtures and benchmarks.
//!
//! Every generator is pure: equal arguments always produce equal samples.

use std::f64::consts::TAU;

/// Number of samples for `seconds` of audio at `sample_rate`.
fn sample_count(sample_rate: u32, seconds: f64) -> usize {
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    let n = (f64::from(sample_rate) * seconds.max(0.0)).round() as usize;
    n
}

/// Digital silence.
pub fn silence(sample_rate: u32, seconds: f64) -> Vec<f32> {
    vec![0.0; sample_count(sample_rate, seconds)]
}

/// A sine wave of `frequency` Hz with peak `amplitude`.
pub fn sine(sample_rate: u32, seconds: f64, frequency: f64, amplitude: f32) -> Vec<f32> {
    let sr = f64::from(sample_rate);
    (0..sample_count(sample_rate, seconds))
        .map(|i| {
            #[allow(clippy::cast_possible_truncation)]
            let s = (TAU * frequency * i as f64 / sr).sin() as f32;
            amplitude * s
        })
        .collect()
}

/// A single full-scale impulse at `position` seconds, silence elsewhere.
pub fn impulse(sample_rate: u32, seconds: f64, position: f64, amplitude: f32) -> Vec<f32> {
    let mut out = silence(sample_rate, seconds);
    let idx = sample_count(sample_rate, position);
    if let Some(s) = out.get_mut(idx) {
        *s = amplitude;
    }
    out
}

/// A linear frequency sweep from `f0` to `f1` Hz.
pub fn chirp(sample_rate: u32, seconds: f64, f0: f64, f1: f64, amplitude: f32) -> Vec<f32> {
    let sr = f64::from(sample_rate);
    let k = if seconds > 0.0 {
        (f1 - f0) / seconds
    } else {
        0.0
    };
    (0..sample_count(sample_rate, seconds))
        .map(|i| {
            let t = i as f64 / sr;
            #[allow(clippy::cast_possible_truncation)]
            let s = (TAU * (f0 * t + 0.5 * k * t * t)).sin() as f32;
            amplitude * s
        })
        .collect()
}

/// Uniform white noise from a seeded xorshift generator.
pub fn white_noise(sample_rate: u32, seconds: f64, amplitude: f32, seed: u64) -> Vec<f32> {
    let mut state = seed.max(1);
    (0..sample_count(sample_rate, seconds))
        .map(|_| {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            // Top 24 bits → [0, 1) → [-1, 1)
            #[allow(clippy::cast_possible_truncation)]
            let unit = (state >> 40) as f32 / (1u64 << 24) as f32;
            amplitude * (unit * 2.0 - 1.0)
        })
        .collect()
}

/// A click track: short impulses every beat at `bpm`.
pub fn click_track(sample_rate: u32, seconds: f64, bpm: f64, amplitude: f32) -> Vec<f32> {
    let mut out = silence(sample_rate, seconds);
    if bpm <= 0.0 {
        return out;
    }
    let period = 60.0 / bpm;
    let click_len = sample_count(sample_rate, 0.005).max(1);
    let mut t = 0.0;
    while t < seconds {
        let start = sample_count(sample_rate, t);
        for s in out.iter_mut().skip(start).take(click_len) {
            *s = amplitude;
        }
        t += period;
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lengths_match_duration() {
        assert_eq!(silence(48_000, 1.5).len(), 72_000);
        assert_eq!(sine(22_050, 1.0, 440.0, 1.0).len(), 22_050);
        assert_eq!(silence(44_100, -1.0).len(), 0);
    }

    #[test]
    fn sine_respects_amplitude() {
        let s = sine(44_100, 1.0, 1000.0, 0.5);
        let peak = s.iter().fold(0.0f32, |m, x| m.max(x.abs()));
        assert!((peak - 0.5).abs() < 1e-3);
    }

    #[test]
    fn impulse_is_single_sample() {
        let s = impulse(1000, 1.0, 0.25, 1.0);
        assert_eq!(s.iter().filter(|x| **x != 0.0).count(), 1);
        assert!((s[250] - 1.0).abs() < f32::EPSILON);
    }

    #[test]
    fn noise_is_deterministic_and_bounded() {
        let a = white_noise(8000, 1.0, 1.0, 42);
        let b = white_noise(8000, 1.0, 1.0, 42);
        assert_eq!(a, b);
        assert!(a.iter().all(|x| (-1.0..1.0).contains(x)));
        assert_ne!(a, white_noise(8000, 1.0, 1.0, 7));
    }

    #[test]
    fn click_track_has_expected_beats() {
        // 120 BPM for 2 s → clicks at 0.0, 0.5, 1.0, 1.5
        let s = click_track(1000, 2.0, 120.0, 1.0);
        let onsets =
            s.windows(2).filter(|w| w[0] == 0.0 && w[1] != 0.0).count() + usize::from(s[0] != 0.0);
        assert_eq!(onsets, 4);
    }
}
