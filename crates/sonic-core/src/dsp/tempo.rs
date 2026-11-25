//! Global tempo estimation from an onset strength envelope.
//!
//! 1. Remove the slow trend from the envelope with a centred 1 s moving mean.
//! 2. Autocorrelate over lags covering 40–220 BPM.
//! 3. Weight lags with a log-normal prior centred on 120 BPM (σ = 1 octave),
//!    which resolves the usual half/double-time ambiguity towards the more
//!    common tempo, and pick the strongest.
//! 4. Refine the lag by parabolic interpolation.
//!
//! Confidence is the autocorrelation at the chosen lag normalized by the
//! zero-lag energy. Below [`MIN_CONFIDENCE`] the tempo is reported as
//! unavailable instead of guessed. The result is always an *estimate*: music
//! with changing or ambiguous pulse has no single correct tempo.

use crate::domain::AudioFeature;

/// Version of the tempo estimator. Bump when results can change.
pub const ALGORITHM_VERSION: &str = "tempo/1.0.0";

pub const MIN_BPM: f64 = 40.0;
pub const MAX_BPM: f64 = 220.0;
const PRIOR_CENTER_BPM: f64 = 120.0;
const PRIOR_OCTAVES: f64 = 1.0;
/// Shortest signal for which a global tempo is attempted.
pub const MIN_SECONDS: f64 = 8.0;
/// Below this normalized autocorrelation the estimate is withheld.
pub const MIN_CONFIDENCE: f64 = 0.25;

/// A tempo estimate with its confidence in `[0, 1]`.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TempoEstimate {
    pub bpm: f64,
    pub confidence: f64,
}

/// Estimate the dominant tempo.
///
/// # Errors
///
/// Returns a diagnostic code when the signal is too short, has no onsets, or
/// the periodicity is too weak to report.
pub fn estimate(onset: &[f32], frame_rate: f64) -> Result<TempoEstimate, &'static str> {
    let n = onset.len();
    if frame_rate <= 0.0 || (n as f64) < MIN_SECONDS * frame_rate {
        return Err("signal_too_short_for_tempo");
    }

    let x = detrend(onset, frame_rate);
    let energy = x.iter().map(|v| v * v).sum::<f64>() / n as f64;
    if energy < 1e-12 {
        return Err("no_rhythmic_onsets");
    }

    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    let lag_min = ((60.0 * frame_rate / MAX_BPM).floor() as usize).max(1);
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    let lag_max = ((60.0 * frame_rate / MIN_BPM).ceil() as usize).min(n / 2);
    if lag_max <= lag_min + 1 {
        return Err("signal_too_short_for_tempo");
    }

    // Normalized autocorrelation for lags lag_min-1 ..= lag_max+1 so the peak
    // can always be interpolated.
    let autocorr = |lag: usize| -> f64 {
        let sum: f64 = x[..n - lag].iter().zip(&x[lag..]).map(|(a, b)| a * b).sum();
        sum / (n - lag) as f64 / energy
    };
    let r: Vec<f64> = (lag_min - 1..=lag_max + 1).map(autocorr).collect();
    let at = |lag: usize| r[lag - (lag_min - 1)];

    let bpm_of = |lag: f64| 60.0 * frame_rate / lag;
    let prior = |lag: f64| {
        let octaves = (bpm_of(lag) / PRIOR_CENTER_BPM).log2() / PRIOR_OCTAVES;
        (-0.5 * octaves * octaves).exp()
    };

    let best = (lag_min..=lag_max)
        .max_by(|&a, &b| {
            let (wa, wb) = (at(a) * prior(a as f64), at(b) * prior(b as f64));
            wa.total_cmp(&wb)
        })
        .ok_or("signal_too_short_for_tempo")?;

    let (y0, y1, y2) = (at(best - 1), at(best), at(best + 1));
    let denom = y0 - 2.0 * y1 + y2;
    let offset = if denom.abs() > 1e-12 {
        (0.5 * (y0 - y2) / denom).clamp(-0.5, 0.5)
    } else {
        0.0
    };
    let lag = best as f64 + offset;
    let confidence = y1.clamp(0.0, 1.0);

    if confidence < MIN_CONFIDENCE {
        return Err("low_confidence");
    }
    Ok(TempoEstimate {
        bpm: bpm_of(lag),
        confidence,
    })
}

/// Subtract a centred moving mean of about one second.
fn detrend(onset: &[f32], frame_rate: f64) -> Vec<f64> {
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    let half = ((frame_rate / 2.0).round() as usize).max(1);
    let n = onset.len();
    let mut prefix = Vec::with_capacity(n + 1);
    prefix.push(0.0f64);
    for &v in onset {
        prefix.push(prefix.last().copied().unwrap_or(0.0) + f64::from(v));
    }
    (0..n)
        .map(|i| {
            let lo = i.saturating_sub(half);
            let hi = (i + half + 1).min(n);
            let mean = (prefix[hi] - prefix[lo]) / (hi - lo) as f64;
            f64::from(onset[i]) - mean
        })
        .collect()
}

/// The tempo feature for an onset envelope.
pub fn tempo_feature(onset: &[f32], frame_rate: f64) -> AudioFeature {
    match estimate(onset, frame_rate) {
        Ok(t) => AudioFeature::scalar("tempo_bpm", t.bpm, Some("BPM"), ALGORITHM_VERSION)
            .with_confidence(t.confidence),
        Err(code) => AudioFeature::unavailable("tempo_bpm", Some("BPM"), ALGORITHM_VERSION, code),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dsp::spectral::{SpectralAnalyzer, SpectralConfig};
    use crate::dsp::synth;

    const SR: u32 = 22_050;

    fn envelope(signal: &[f32]) -> (Vec<f32>, f64) {
        let mut a = SpectralAnalyzer::new(SpectralConfig::default());
        a.push(signal);
        (a.onset_envelope().to_vec(), a.frame_rate())
    }

    #[test]
    fn click_tracks_within_two_bpm() {
        for bpm in [72.0, 90.0, 120.0, 128.0, 140.0, 174.0] {
            let (env, fr) = envelope(&synth::click_track(SR, 30.0, bpm, 0.8));
            let t = estimate(&env, fr).unwrap_or_else(|e| panic!("{bpm}: {e}"));
            assert!(
                (t.bpm - bpm).abs() < 2.0,
                "{bpm} BPM estimated as {}",
                t.bpm
            );
            assert!(t.confidence > 0.5, "{bpm}: confidence {}", t.confidence);
        }
    }

    #[test]
    fn rhythm_on_a_tonal_bed_is_found() {
        let rate = SR;
        let clicks = synth::click_track(rate, 30.0, 100.0, 0.6);
        let bed = synth::sine(rate, 30.0, 220.0, 0.3);
        let mix: Vec<f32> = clicks.iter().zip(&bed).map(|(a, b)| a + b).collect();
        let (env, fr) = envelope(&mix);
        let t = estimate(&env, fr).unwrap();
        assert!((t.bpm - 100.0).abs() < 2.0, "{}", t.bpm);
    }

    #[test]
    fn steady_tone_has_no_tempo() {
        let (env, fr) = envelope(&synth::sine(SR, 30.0, 440.0, 0.5));
        assert!(estimate(&env, fr).is_err());
    }

    #[test]
    fn noise_has_low_confidence() {
        let (env, fr) = envelope(&synth::white_noise(SR, 30.0, 0.5, 3));
        assert_eq!(estimate(&env, fr), Err("low_confidence"));
    }

    #[test]
    fn silence_has_no_onsets() {
        let (env, fr) = envelope(&synth::silence(SR, 30.0));
        assert_eq!(estimate(&env, fr), Err("no_rhythmic_onsets"));
    }

    #[test]
    fn short_signals_are_not_estimated() {
        let (env, fr) = envelope(&synth::click_track(SR, 5.0, 120.0, 0.8));
        assert_eq!(estimate(&env, fr), Err("signal_too_short_for_tempo"));
    }

    #[test]
    fn feature_carries_confidence_or_reason() {
        let (env, fr) = envelope(&synth::click_track(SR, 20.0, 120.0, 0.8));
        let f = tempo_feature(&env, fr);
        assert!(f.is_valid());
        assert!(f.confidence.is_some_and(|c| c > 0.5));

        let (env, fr) = envelope(&synth::silence(SR, 20.0));
        let f = tempo_feature(&env, fr);
        assert_eq!(f.value, None);
        assert_eq!(f.diagnostic_code.as_deref(), Some("no_rhythmic_onsets"));
    }
}
