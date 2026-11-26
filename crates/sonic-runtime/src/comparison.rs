//! Two-track comparison (PRD FR-07, SAD §46).
//!
//! Raw measurements side by side with `B − A` differences in their own
//! units, and the original-space distance broken down by feature group. A
//! difference is stated only when both sides are valid, of the same kind and
//! measured by the same algorithm; missing values are never treated as zero.

use std::collections::BTreeMap;

use serde::Serialize;
use sonic_catalog::{StoredAnalysis, TrackRecord};
use sonic_core::domain::{AudioFeature, FeatureStatus, FeatureValue};
use sonic_core::similarity::VECTOR_VERSION;

use crate::atlas::{self, PairUnavailable};

/// One side of a comparison.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComparisonSide {
    pub track_id: String,
    pub title: String,
    pub artist: Option<String>,
    pub analyzed: bool,
    pub engine_version: Option<String>,
    pub feature_schema_version: Option<String>,
}

/// A measurement on both sides.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComparisonMeasurement {
    pub feature_key: String,
    pub unit: Option<String>,
    pub left_value: Option<FeatureValue>,
    pub right_value: Option<FeatureValue>,
    /// `right − left`, per component for vectors; absent when not comparable.
    pub difference: Option<FeatureValue>,
    /// `valid`, `unavailable`, `failed`, or `missing` when not reported at all.
    pub left_status: &'static str,
    pub right_status: &'static str,
    pub left_diagnostic: Option<String>,
    pub right_diagnostic: Option<String>,
    /// Why no difference is shown although both sides have a value.
    pub incompatible: Option<&'static str>,
}

/// The reference space the distance was measured in.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SimilarityContext {
    pub vector_version: &'static str,
    pub normalization: &'static str,
    pub reference_tracks: usize,
}

/// The full comparison.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackComparison {
    pub left: ComparisonSide,
    pub right: ComparisonSide,
    pub measurements: Vec<ComparisonMeasurement>,
    pub distance: Option<f64>,
    pub contributions: BTreeMap<&'static str, f64>,
    pub model_context: Option<SimilarityContext>,
    /// Plain statements of what this comparison cannot show.
    pub limitations: Vec<String>,
}

fn side(track: &TrackRecord, analysis: Option<&StoredAnalysis>) -> ComparisonSide {
    ComparisonSide {
        track_id: track.id.clone(),
        title: track.title.clone(),
        artist: track.artist.clone(),
        analyzed: analysis.is_some(),
        engine_version: analysis.map(|a| a.engine_version.clone()),
        feature_schema_version: analysis.map(|a| a.feature_schema_version.clone()),
    }
}

fn status(f: Option<&AudioFeature>) -> &'static str {
    match f.map(|f| f.status) {
        None => "missing",
        Some(FeatureStatus::Valid) => "valid",
        Some(FeatureStatus::Unavailable) => "unavailable",
        Some(FeatureStatus::Failed) => "failed",
    }
}

fn valid_value(f: Option<&AudioFeature>) -> Option<&FeatureValue> {
    f.filter(|f| f.is_valid()).and_then(|f| f.value.as_ref())
}

/// `right − left` when both are valid and measured the same way.
fn difference(
    l: Option<&AudioFeature>,
    r: Option<&AudioFeature>,
) -> (Option<FeatureValue>, Option<&'static str>) {
    let (Some(lf), Some(rf)) = (l, r) else {
        return (None, None);
    };
    let (Some(lv), Some(rv)) = (valid_value(l), valid_value(r)) else {
        return (None, None);
    };
    if lf.algorithm_version != rf.algorithm_version {
        return (None, Some("different algorithm versions"));
    }
    if lf.unit != rf.unit {
        return (None, Some("different units"));
    }
    match (lv, rv) {
        (FeatureValue::Scalar(a), FeatureValue::Scalar(b)) => {
            (Some(FeatureValue::Scalar(b - a)), None)
        }
        (FeatureValue::Vector(a), FeatureValue::Vector(b)) if a.len() == b.len() => (
            Some(FeatureValue::Vector(
                a.iter().zip(b).map(|(x, y)| y - x).collect(),
            )),
            None,
        ),
        _ => (None, Some("different shapes")),
    }
}

/// Every feature reported by either side, in the left side's order and then
/// any the right side adds.
fn keys<'a>(l: &'a [AudioFeature], r: &'a [AudioFeature]) -> Vec<&'a str> {
    let mut out: Vec<&str> = l.iter().map(|f| f.key.as_str()).collect();
    for f in r {
        if !out.contains(&f.key.as_str()) {
            out.push(&f.key);
        }
    }
    out
}

/// Compare two tracks. `catalog` supplies the reference space for distance.
pub fn compare(
    left: (&TrackRecord, Option<&StoredAnalysis>),
    right: (&TrackRecord, Option<&StoredAnalysis>),
    catalog: &[(TrackRecord, Option<Vec<AudioFeature>>)],
) -> TrackComparison {
    let empty: &[AudioFeature] = &[];
    let lf = left.1.map_or(empty, |a| a.features.as_slice());
    let rf = right.1.map_or(empty, |a| a.features.as_slice());
    let find = |fs: &[AudioFeature], k: &str| fs.iter().position(|f| f.key == k);

    let measurements = keys(lf, rf)
        .into_iter()
        .map(|key| {
            let l = find(lf, key).map(|i| &lf[i]);
            let r = find(rf, key).map(|i| &rf[i]);
            let (difference, incompatible) = difference(l, r);
            ComparisonMeasurement {
                feature_key: key.to_owned(),
                unit: l.or(r).and_then(|f| f.unit.clone()),
                left_value: valid_value(l).cloned(),
                right_value: valid_value(r).cloned(),
                difference,
                left_status: status(l),
                right_status: status(r),
                left_diagnostic: l.and_then(|f| f.diagnostic_code.clone()),
                right_diagnostic: r.and_then(|f| f.diagnostic_code.clone()),
                incompatible,
            }
        })
        .collect();

    let mut limitations = Vec::new();
    for (name, s) in [("A", &left), ("B", &right)] {
        if s.1.is_none() {
            limitations.push(format!("Track {name} has not been analyzed."));
        }
    }
    let schemas = (
        left.1.map(|a| a.feature_schema_version.as_str()),
        right.1.map(|a| a.feature_schema_version.as_str()),
    );
    let mixed = matches!(schemas, (Some(a), Some(b)) if a != b);
    if mixed {
        limitations.push(
            "The tracks were analyzed with different feature schemas, so no shared distance is \
             calculated. Reanalyze both to compare them in one space."
                .to_owned(),
        );
    }

    let pair = if mixed || left.1.is_none() || right.1.is_none() {
        None
    } else {
        match atlas::pair(catalog, &left.0.id, &right.0.id) {
            Ok(p) => Some(p),
            Err(PairUnavailable::Ineligible) => {
                limitations.push(
                    "Distance needs timbre, spectral balance, texture and dynamics measured on \
                     both tracks."
                        .to_owned(),
                );
                None
            }
            Err(PairUnavailable::TooFewTracks) => {
                limitations.push(
                    "Distance is normalized across the library and needs at least three \
                     comparable analyzed tracks."
                        .to_owned(),
                );
                None
            }
        }
    };

    TrackComparison {
        left: side(left.0, left.1),
        right: side(right.0, right.1),
        measurements,
        distance: pair.as_ref().map(|p| p.distance),
        contributions: pair
            .as_ref()
            .map(|p| p.contributions.clone())
            .unwrap_or_default(),
        model_context: pair.map(|p| SimilarityContext {
            vector_version: VECTOR_VERSION,
            normalization: "median and interquartile range over the library",
            reference_tracks: p.reference_tracks,
        }),
        limitations,
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use super::*;

    fn track(id: &str) -> TrackRecord {
        TrackRecord {
            id: id.into(),
            title: format!("Track {id}"),
            artist: None,
            album: None,
            genre: None,
            release_year: None,
            duration_ms: Some(1000),
            sample_rate_hz: Some(44_100),
            channel_count: Some(2),
            codec: None,
            availability: "available".into(),
            path: PathBuf::new(),
            content_hash: None,
            created_at_ms: 0,
        }
    }

    /// Every dimension the similarity vector needs, shaped by `b` and `t`.
    fn features(b: f64, t: f64) -> Vec<AudioFeature> {
        let mut f: Vec<AudioFeature> = [
            ("spectral_centroid_mean", 1000.0 + 900.0 * b),
            ("spectral_bandwidth_mean", 700.0 + 300.0 * b),
            ("spectral_rolloff_mean", 2000.0 + 1500.0 * b),
            ("spectral_flatness_mean", 0.05 + 0.3 * t),
            ("spectral_flux_mean", 0.1 + 0.2 * t),
            ("crest_factor_db", 10.0 + 2.0 * t),
            ("loudness_range", 4.0 + 3.0 * b),
            ("integrated_loudness", -14.0 + b),
        ]
        .iter()
        .map(|(k, v)| AudioFeature::scalar(*k, *v, None, "t/1"))
        .collect();
        f.push(AudioFeature::vector(
            "mfcc_mean",
            (0..13).map(|i| f64::from(i) * (1.0 + b) - t).collect(),
            None,
            "m/1",
        ));
        f
    }

    fn analysis(features: Vec<AudioFeature>, schema: &str) -> StoredAnalysis {
        StoredAnalysis {
            analysis_id: "r".into(),
            engine_version: "e/1".into(),
            feature_schema_version: schema.into(),
            status: "complete".into(),
            completed_at_ms: 0,
            features,
            waveform_path: None,
            spectrogram_path: None,
        }
    }

    fn library() -> Vec<(TrackRecord, Option<Vec<AudioFeature>>)> {
        vec![
            (track("a"), Some(features(0.0, 0.0))),
            (track("b"), Some(features(1.0, 0.1))),
            (track("c"), Some(features(0.5, 1.0))),
        ]
    }

    fn row<'a>(c: &'a TrackComparison, key: &str) -> &'a ComparisonMeasurement {
        c.measurements
            .iter()
            .find(|m| m.feature_key == key)
            .unwrap()
    }

    #[test]
    fn differences_are_right_minus_left_in_raw_units() {
        let (a, b) = (track("a"), track("b"));
        let (fa, fb) = (
            analysis(features(0.0, 0.0), "s"),
            analysis(features(1.0, 0.1), "s"),
        );
        let c = compare((&a, Some(&fa)), (&b, Some(&fb)), &library());

        let centroid = row(&c, "spectral_centroid_mean");
        assert_eq!(centroid.left_value, Some(FeatureValue::Scalar(1000.0)));
        assert_eq!(centroid.right_value, Some(FeatureValue::Scalar(1900.0)));
        assert_eq!(centroid.difference, Some(FeatureValue::Scalar(900.0)));

        let mfcc = row(&c, "mfcc_mean");
        let Some(FeatureValue::Vector(d)) = &mfcc.difference else {
            panic!("vector difference expected");
        };
        assert_eq!(d.len(), 13);
        assert!((d[2] - 2.0 + 0.1).abs() < 1e-12);

        let d = c.distance.unwrap();
        assert!(d > 0.0);
        let total: f64 = c.contributions.values().sum();
        assert!((total - 1.0).abs() < 1e-9);
        assert_eq!(c.model_context.as_ref().unwrap().reference_tracks, 3);
        assert_eq!(c.limitations, Vec::<String>::new());
    }

    #[test]
    fn swapping_sides_reverses_the_sign_and_keeps_the_distance() {
        let (a, b) = (track("a"), track("b"));
        let (fa, fb) = (
            analysis(features(0.0, 0.0), "s"),
            analysis(features(1.0, 0.1), "s"),
        );
        let ab = compare((&a, Some(&fa)), (&b, Some(&fb)), &library());
        let ba = compare((&b, Some(&fb)), (&a, Some(&fa)), &library());
        assert_eq!(
            row(&ba, "integrated_loudness").difference,
            Some(FeatureValue::Scalar(-1.0))
        );
        assert!((ab.distance.unwrap() - ba.distance.unwrap()).abs() < 1e-12);
    }

    #[test]
    fn missing_values_are_marked_not_zeroed() {
        let (a, b) = (track("a"), track("b"));
        let mut right = features(1.0, 0.1);
        right.retain(|f| f.key != "integrated_loudness");
        right.push(AudioFeature::unavailable(
            "tempo_bpm",
            Some("BPM"),
            "tempo/1",
            "low_confidence",
        ));
        let (fa, fb) = (analysis(features(0.0, 0.0), "s"), analysis(right, "s"));
        let c = compare((&a, Some(&fa)), (&b, Some(&fb)), &library());

        let lufs = row(&c, "integrated_loudness");
        assert_eq!(lufs.right_status, "missing");
        assert_eq!((&lufs.right_value, &lufs.difference), (&None, &None));

        let tempo = row(&c, "tempo_bpm");
        assert_eq!(
            (tempo.left_status, tempo.right_status),
            ("missing", "unavailable")
        );
        assert_eq!(tempo.right_diagnostic.as_deref(), Some("low_confidence"));
        assert_eq!(tempo.unit.as_deref(), Some("BPM"));
    }

    #[test]
    fn different_algorithms_show_values_without_a_difference() {
        let (a, b) = (track("a"), track("b"));
        let mut right = features(1.0, 0.1);
        for f in &mut right {
            if f.key == "spectral_flux_mean" {
                f.algorithm_version = "t/2".into();
            }
        }
        let (fa, fb) = (analysis(features(0.0, 0.0), "s"), analysis(right, "s"));
        let c = compare((&a, Some(&fa)), (&b, Some(&fb)), &library());
        let flux = row(&c, "spectral_flux_mean");
        assert!(flux.left_value.is_some() && flux.right_value.is_some());
        assert_eq!(flux.difference, None);
        assert_eq!(flux.incompatible, Some("different algorithm versions"));
    }

    #[test]
    fn mixed_schemas_suppress_the_shared_distance() {
        let (a, b) = (track("a"), track("b"));
        let (fa, fb) = (
            analysis(features(0.0, 0.0), "s1"),
            analysis(features(1.0, 0.1), "s2"),
        );
        let c = compare((&a, Some(&fa)), (&b, Some(&fb)), &library());
        assert_eq!(c.distance, None);
        assert!(c.contributions.is_empty());
        assert_eq!(c.model_context, None);
        assert!(c.limitations[0].contains("different feature schemas"));
    }

    #[test]
    fn an_unanalyzed_side_is_reported() {
        let (a, b) = (track("a"), track("z"));
        let fa = analysis(features(0.0, 0.0), "s");
        let c = compare((&a, Some(&fa)), (&b, None), &library());
        assert!(!c.right.analyzed);
        assert_eq!(c.distance, None);
        assert_eq!(c.limitations, ["Track B has not been analyzed."]);
        assert!(c.measurements.iter().all(|m| m.right_status == "missing"));
    }

    #[test]
    fn too_small_a_library_has_no_distance() {
        let (a, b) = (track("a"), track("b"));
        let (fa, fb) = (
            analysis(features(0.0, 0.0), "s"),
            analysis(features(1.0, 0.1), "s"),
        );
        let small = &library()[..2];
        let c = compare((&a, Some(&fa)), (&b, Some(&fb)), small);
        assert_eq!(c.distance, None);
        assert!(c.limitations[0].contains("at least three"));
    }
}
