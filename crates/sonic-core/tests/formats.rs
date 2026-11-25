//! Every supported codec decodes and measures the shared fixture signal
//! (tests/fixtures/media/README.md): 2.0 s, 44.1 kHz stereo, 440 Hz sine at
//! amplitude 0.5. Lossless codecs must match the source sample for sample.

use std::fs::File;
use std::path::PathBuf;
use std::sync::atomic::AtomicBool;

use sonic_core::analysis::analyze;
use sonic_core::domain::FeatureValue;
use sonic_core::media::DecodedStream;

fn fixture(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/fixtures/media")
        .join(name)
}

fn open(name: &str) -> DecodedStream {
    let path = fixture(name);
    let ext = path.extension().and_then(|e| e.to_str()).map(str::to_owned);
    DecodedStream::open(Box::new(File::open(&path).unwrap()), ext.as_deref())
        .unwrap_or_else(|e| panic!("{name}: {e}"))
}

fn decode_all(name: &str) -> Vec<f32> {
    let mut stream = open(name);
    let mut samples = Vec::new();
    while let Some(block) = stream.next_block().unwrap() {
        samples.extend_from_slice(block.samples);
    }
    samples
}

fn scalar(features: &[sonic_core::domain::AudioFeature], key: &str) -> f64 {
    match features
        .iter()
        .find(|f| f.key == key)
        .and_then(|f| f.value.clone())
    {
        Some(FeatureValue::Scalar(v)) => v,
        other => panic!("{key}: {other:?}"),
    }
}

/// Codec, allowed duration error (ms) and allowed level error (dB).
const CASES: &[(&str, u64, f64)] = &[
    ("sine440.wav", 0, 0.01),
    ("sine440.aiff", 0, 0.01),
    ("sine440.flac", 0, 0.01),
    ("sine440_alac.m4a", 0, 0.01),
    ("sine440.mp3", 60, 0.5),
    ("sine440.ogg", 60, 0.5),
    ("sine440_aac.m4a", 60, 0.5),
];

#[test]
fn every_codec_reports_signal_properties() {
    for &(name, _, _) in CASES {
        let stream = open(name);
        let p = stream.properties();
        assert_eq!(p.sample_rate, 44_100, "{name}");
        assert_eq!(p.channels, 2, "{name}");
    }
}

#[test]
fn every_codec_measures_the_fixture_signal() {
    for &(name, duration_tolerance_ms, level_tolerance_db) in CASES {
        let mut stream = open(name);
        let out =
            analyze(&mut stream, &AtomicBool::new(false)).unwrap_or_else(|e| panic!("{name}: {e}"));

        #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
        let duration_ms = (out.technical.duration_seconds * 1000.0).round() as u64;
        assert!(
            duration_ms.abs_diff(2000) <= duration_tolerance_ms,
            "{name}: duration {duration_ms} ms"
        );

        let rms = scalar(&out.features, "rms_dbfs");
        assert!((rms + 9.03).abs() < level_tolerance_db, "{name}: rms {rms}");

        let centroid = scalar(&out.features, "spectral_centroid_mean");
        assert!(
            (centroid - 440.0).abs() < 25.0,
            "{name}: centroid {centroid}"
        );

        assert_eq!(out.technical.skipped_packets, 0, "{name}: skipped packets");
    }
}

#[test]
fn lossless_codecs_reproduce_the_source_exactly() {
    let source = decode_all("sine440.wav");
    assert_eq!(source.len(), 2 * 88_200);
    for name in ["sine440.aiff", "sine440.flac", "sine440_alac.m4a"] {
        let decoded = decode_all(name);
        assert_eq!(decoded.len(), source.len(), "{name}: length");
        let max_err = source
            .iter()
            .zip(&decoded)
            .map(|(a, b)| (a - b).abs())
            .fold(0.0f32, f32::max);
        assert!(max_err < 1e-6, "{name}: max sample error {max_err}");
    }
}
