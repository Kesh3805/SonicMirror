//! Single-pass track analysis (SAD §23–25).
//!
//! One streaming pass over the decoded signal feeds every analyzer:
//!
//! ```text
//! decoder ─┬─► level accumulator        (native rate, all channels)
//!          ├─► BS.1770 loudness meter    (native rate, K-weighted per channel)
//!          ├─► waveform envelope         (native rate, channels combined)
//!          └─► downmix ─► resample ─► spectral analyzer (22,050 Hz mono)
//!                                         └─► onset envelope ─► tempo
//! ```
//!
//! Cancellation is checked between decoded packets.

use std::sync::atomic::{AtomicBool, Ordering};

use serde::Serialize;

use crate::domain::AudioFeature;
use crate::dsp::level::LevelAccumulator;
use crate::dsp::loudness::LoudnessMeter;
use crate::dsp::resample::{MonoResampler, downmix_mean};
use crate::dsp::spectral::{SpectralAnalyzer, SpectralConfig};
use crate::dsp::tempo::tempo_feature;
use crate::dsp::waveform::{EnvelopeBuilder, WaveformEnvelope};
use crate::media::{DecodedStream, MediaError, TechnicalProperties};

/// Version of the analysis engine as a whole. Individual features carry their
/// own algorithm versions.
pub const ENGINE_VERSION: &str = "sonic-engine/0.1.0";

/// Version of the set of features the engine produces.
pub const FEATURE_SCHEMA_VERSION: &str = "features/0.2.0";

const TECHNICAL_VERSION: &str = "technical/1.0.0";

/// Result of analyzing one recording.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisOutput {
    pub engine_version: &'static str,
    pub feature_schema_version: &'static str,
    pub technical: TechnicalSummary,
    pub features: Vec<AudioFeature>,
    #[serde(skip)]
    pub waveform: WaveformEnvelope,
}

/// Technical properties measured from the decoded stream.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TechnicalSummary {
    pub codec: String,
    pub sample_rate: u32,
    pub channels: u16,
    pub decoded_frames: u64,
    pub duration_seconds: f64,
    /// Packets that failed to decode and were skipped.
    pub skipped_packets: u64,
}

#[derive(Debug, thiserror::Error)]
pub enum AnalysisError {
    #[error(transparent)]
    Media(#[from] MediaError),
    #[error("analysis was cancelled")]
    Cancelled,
    #[error("the file contains no audio samples")]
    Empty,
}

impl AnalysisError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Media(e) => e.code(),
            Self::Cancelled => "analysis.cancelled",
            Self::Empty => "analysis.empty",
        }
    }
}

/// Analyze an opened stream to completion.
///
/// # Errors
///
/// Returns [`AnalysisError::Cancelled`] if `cancelled` becomes true, a media
/// error if decoding fails, or [`AnalysisError::Empty`] when no samples decode.
pub fn analyze(
    stream: &mut DecodedStream,
    cancelled: &AtomicBool,
) -> Result<AnalysisOutput, AnalysisError> {
    let TechnicalProperties {
        sample_rate,
        channels,
        ref codec,
        ..
    } = *stream.properties();
    let codec = codec.clone();

    let spectral_config = SpectralConfig::default();
    let mut level = LevelAccumulator::default();
    let mut loudness = LoudnessMeter::new(sample_rate, usize::from(channels));
    let mut envelope = EnvelopeBuilder::new(sample_rate);
    let mut resampler = MonoResampler::new(sample_rate, spectral_config.sample_rate);
    let mut spectral = SpectralAnalyzer::new(spectral_config);
    let mut mono = Vec::new();
    let mut frames: u64 = 0;

    while let Some(block) = stream.next_block()? {
        if cancelled.load(Ordering::Relaxed) {
            return Err(AnalysisError::Cancelled);
        }
        level.push(block.samples);
        loudness.push(block.samples);
        envelope.push(block.samples, block.channels);
        downmix_mean(block.samples, block.channels, &mut mono);
        resampler.push(&mono, &mut |b| {
            spectral.push(b);
        });
        frames += block.frames() as u64;
    }
    resampler.finish(&mut |b| {
        spectral.push(b);
    });

    if frames == 0 {
        return Err(AnalysisError::Empty);
    }

    #[allow(clippy::cast_precision_loss)]
    let duration_seconds = frames as f64 / f64::from(sample_rate);

    let mut features = vec![
        AudioFeature::scalar("duration", duration_seconds, Some("s"), TECHNICAL_VERSION),
        AudioFeature::scalar(
            "sample_rate",
            f64::from(sample_rate),
            Some("Hz"),
            TECHNICAL_VERSION,
        ),
        AudioFeature::scalar(
            "channel_count",
            f64::from(channels),
            None,
            TECHNICAL_VERSION,
        ),
    ];
    features.extend(level.features());
    features.extend(loudness.features());
    features.extend(spectral.finish());
    features.push(tempo_feature(
        spectral.onset_envelope(),
        spectral.frame_rate(),
    ));

    Ok(AnalysisOutput {
        engine_version: ENGINE_VERSION,
        feature_schema_version: FEATURE_SCHEMA_VERSION,
        technical: TechnicalSummary {
            codec,
            sample_rate,
            channels,
            decoded_frames: frames,
            duration_seconds,
            skipped_packets: stream.skipped_packets(),
        },
        features,
        waveform: envelope.finish(),
    })
}

#[cfg(test)]
mod tests {
    use std::io::Cursor;

    use super::*;
    use crate::domain::{FeatureStatus, FeatureValue};
    use crate::dsp::synth;
    use crate::media::wav;

    fn run(signal: &[f32], channels: u16, rate: u32) -> AnalysisOutput {
        let bytes = wav::encode_pcm16(signal, channels, rate);
        let mut stream = DecodedStream::open(Box::new(Cursor::new(bytes)), Some("wav")).unwrap();
        analyze(&mut stream, &AtomicBool::new(false)).unwrap()
    }

    fn value(out: &AnalysisOutput, key: &str) -> f64 {
        match out.features.iter().find(|f| f.key == key).map(|f| &f.value) {
            Some(Some(FeatureValue::Scalar(v))) => *v,
            other => panic!("{key}: {other:?}"),
        }
    }

    #[test]
    fn sine_through_the_whole_pipeline() {
        let out = run(&synth::sine(44_100, 3.0, 440.0, 0.5), 1, 44_100);
        assert_eq!(out.technical.decoded_frames, 132_300);
        assert!((value(&out, "duration") - 3.0).abs() < 1e-9);
        // 0.5 amplitude sine → −9.03 dBFS RMS, −6.02 dBFS peak.
        assert!((value(&out, "rms_dbfs") + 9.031).abs() < 0.02);
        assert!((value(&out, "sample_peak_dbfs") + 6.021).abs() < 0.02);
        let centroid = value(&out, "spectral_centroid_mean");
        assert!((centroid - 440.0).abs() < 22.0, "centroid {centroid}");
        assert_eq!(out.waveform.levels[0].len(), 300);
    }

    #[test]
    fn stereo_peak_uses_loudest_channel() {
        let left = synth::sine(22_050, 1.0, 220.0, 0.25);
        let right = synth::sine(22_050, 1.0, 220.0, 1.0);
        let stereo: Vec<f32> = left
            .iter()
            .zip(&right)
            .flat_map(|(l, r)| [*l, *r])
            .collect();
        let out = run(&stereo, 2, 22_050);
        assert!(value(&out, "sample_peak_dbfs").abs() < 0.01);
        assert_eq!(value(&out, "channel_count"), 2.0);
    }

    #[test]
    fn silence_produces_unavailable_measurements_not_zeros() {
        let out = run(&synth::silence(22_050, 1.0), 1, 22_050);
        let unavailable: Vec<&str> = out
            .features
            .iter()
            .filter(|f| f.status == FeatureStatus::Unavailable)
            .map(|f| f.key.as_str())
            .collect();
        assert!(unavailable.contains(&"rms_dbfs"));
        assert!(unavailable.contains(&"spectral_centroid_mean"));
        assert!(
            out.features
                .iter()
                .filter(|f| f.status != FeatureStatus::Valid)
                .all(|f| f.value.is_none())
        );
    }

    #[test]
    fn analysis_is_deterministic() {
        let signal = synth::white_noise(44_100, 1.0, 0.3, 11);
        let a = run(&signal, 1, 44_100);
        let b = run(&signal, 1, 44_100);
        assert_eq!(a.features, b.features);
        assert_eq!(a.waveform, b.waveform);
    }

    #[test]
    fn loudness_and_tempo_through_the_pipeline() {
        // −23 dBFS stereo sine with a 120 BPM click layer, 20 s at 44.1 kHz.
        #[allow(clippy::cast_possible_truncation)]
        let amp = 10f64.powf(-23.0 / 20.0) as f32;
        let tone = synth::sine(44_100, 20.0, 997.0, amp);
        let clicks = synth::click_track(44_100, 20.0, 120.0, 0.5);
        let left: Vec<f32> = tone.iter().zip(&clicks).map(|(a, b)| a + b).collect();
        let stereo: Vec<f32> = left.iter().zip(&tone).flat_map(|(l, r)| [*l, *r]).collect();
        let out = run(&stereo, 2, 44_100);

        let tempo = out.features.iter().find(|f| f.key == "tempo_bpm").unwrap();
        assert!(tempo.is_valid(), "{tempo:?}");
        assert!((value(&out, "tempo_bpm") - 120.0).abs() < 2.0);
        assert!(tempo.confidence.is_some());

        assert!(value(&out, "integrated_loudness") > -23.5);
        assert!(value(&out, "loudness_range") >= 0.0);
    }

    #[test]
    fn cancellation_stops_analysis() {
        let bytes = wav::encode_pcm16(&synth::sine(8000, 1.0, 440.0, 0.5), 1, 8000);
        let mut stream = DecodedStream::open(Box::new(Cursor::new(bytes)), Some("wav")).unwrap();
        let err = analyze(&mut stream, &AtomicBool::new(true)).unwrap_err();
        assert_eq!(err.code(), "analysis.cancelled");
    }
}
