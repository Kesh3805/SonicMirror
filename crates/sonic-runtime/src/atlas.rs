//! Sonic Atlas snapshots and neighbours (PRD §14).
//!
//! Pure functions over catalog data: eligibility, normalization, projection
//! and neighbour search. Every number a user sees comes from stored
//! measurements; tracks that cannot be placed are listed with the reason.

use std::collections::BTreeMap;

use serde::Serialize;
use sonic_catalog::TrackRecord;
use sonic_core::domain::{AudioFeature, FeatureValue};
use sonic_core::similarity::{
    self, MIN_POINTS, Normalizer, PROJECTION_VERSION, VECTOR_VERSION, contributions, nearest,
    project, raw_vector,
};

/// A track placed on the map.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasPoint {
    pub track_id: String,
    pub title: String,
    pub artist: Option<String>,
    pub x: f64,
    pub y: f64,
    /// Descriptors available for colour-by; absent when not measured.
    pub centroid_hz: Option<f64>,
    pub integrated_lufs: Option<f64>,
    pub tempo_bpm: Option<f64>,
    pub flatness: Option<f64>,
}

/// A track that could not be placed, and why.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasExclusion {
    pub track_id: String,
    pub title: String,
    pub reason: String,
}

/// One principal axis, described by its strongest dimensions.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasAxis {
    pub explained: f64,
    pub top: Vec<(String, f64)>,
}

/// The map for the current catalog.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasSnapshot {
    /// `ready`, or `unavailable` with a reason code.
    pub status: &'static str,
    pub reason: Option<&'static str>,
    pub vector_version: &'static str,
    pub projection_version: &'static str,
    pub min_tracks: usize,
    pub total: usize,
    pub points: Vec<AtlasPoint>,
    pub excluded: Vec<AtlasExclusion>,
    pub axes: Vec<AtlasAxis>,
}

/// A neighbour with its original-space distance and what drives it.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasNeighbour {
    pub track_id: String,
    pub title: String,
    pub artist: Option<String>,
    pub distance: f64,
    /// Share of squared distance per feature group, summing to 1.
    pub contributions: BTreeMap<&'static str, f64>,
}

fn scalar(features: &[AudioFeature], key: &str) -> Option<f64> {
    features
        .iter()
        .find_map(|f| match (&f.value, f.is_valid() && f.key == key) {
            (Some(FeatureValue::Scalar(v)), true) => Some(*v),
            _ => None,
        })
}

/// Eligible tracks with their raw vectors, and exclusions with reasons.
struct Space<'a> {
    tracks: Vec<(&'a TrackRecord, &'a [AudioFeature])>,
    normalized: Vec<Vec<f64>>,
    weights: Vec<f64>,
    excluded: Vec<AtlasExclusion>,
}

fn build_space(catalog: &[(TrackRecord, Option<Vec<AudioFeature>>)]) -> Space<'_> {
    let mut tracks = Vec::new();
    let mut raw = Vec::new();
    let mut excluded = Vec::new();
    for (track, features) in catalog {
        let reason = match features {
            None => Err("not analyzed".to_owned()),
            Some(f) => raw_vector(f).map_err(|key| format!("{key} unavailable")),
        };
        match (reason, features) {
            (Ok(v), Some(f)) => {
                tracks.push((track, f.as_slice()));
                raw.push(v);
            }
            (Err(reason), _) => excluded.push(AtlasExclusion {
                track_id: track.id.clone(),
                title: track.title.clone(),
                reason,
            }),
            (Ok(_), None) => unreachable!("a vector needs features"),
        }
    }
    let (normalized, weights) = match Normalizer::fit(&raw) {
        Some(n) => (raw.iter().map(|v| n.apply(v)).collect(), n.weights()),
        None => (Vec::new(), Vec::new()),
    };
    Space {
        tracks,
        normalized,
        weights,
        excluded,
    }
}

/// Compute the Atlas for a catalog of tracks and their stored features.
pub fn snapshot(catalog: &[(TrackRecord, Option<Vec<AudioFeature>>)]) -> AtlasSnapshot {
    let space = build_space(catalog);
    let base = |status, reason| AtlasSnapshot {
        status,
        reason,
        vector_version: VECTOR_VERSION,
        projection_version: PROJECTION_VERSION,
        min_tracks: MIN_POINTS,
        total: catalog.len(),
        points: Vec::new(),
        excluded: space.excluded.clone(),
        axes: Vec::new(),
    };
    let projection = match project(&space.normalized, &space.weights) {
        Ok(p) => p,
        Err(reason) => return base("unavailable", Some(reason)),
    };
    let points = space
        .tracks
        .iter()
        .zip(&projection.coordinates)
        .map(|((t, f), [x, y])| AtlasPoint {
            track_id: t.id.clone(),
            title: t.title.clone(),
            artist: t.artist.clone(),
            x: *x,
            y: *y,
            centroid_hz: scalar(f, "spectral_centroid_mean"),
            integrated_lufs: scalar(f, "integrated_loudness"),
            tempo_bpm: scalar(f, "tempo_bpm"),
            flatness: scalar(f, "spectral_flatness_mean"),
        })
        .collect();
    let axes = projection
        .axes
        .iter()
        .map(|a| AtlasAxis {
            explained: a.explained,
            top: a
                .top_dimensions(3)
                .into_iter()
                .map(|(name, loading)| (name.to_owned(), loading))
                .collect(),
        })
        .collect();
    AtlasSnapshot {
        points,
        axes,
        ..base("ready", None)
    }
}

/// The `k` nearest eligible tracks to `track_id`, by original-space distance.
/// Returns `None` when the track is not on the map.
pub fn neighbours(
    catalog: &[(TrackRecord, Option<Vec<AudioFeature>>)],
    track_id: &str,
    k: usize,
) -> Option<Vec<AtlasNeighbour>> {
    let space = build_space(catalog);
    if space.tracks.len() < MIN_POINTS {
        return None;
    }
    let query = space.tracks.iter().position(|(t, _)| t.id == track_id)?;
    Some(
        nearest(&space.normalized, query, k, &space.weights)
            .into_iter()
            .map(|n| {
                let (t, _) = space.tracks[n.index];
                AtlasNeighbour {
                    track_id: t.id.clone(),
                    title: t.title.clone(),
                    artist: t.artist.clone(),
                    distance: n.distance,
                    contributions: contributions(
                        &space.normalized[query],
                        &space.normalized[n.index],
                        &space.weights,
                    ),
                }
            })
            .collect(),
    )
}

/// Dimensions in the vector, exposed for documentation and tests.
pub fn dimension_names() -> Vec<&'static str> {
    similarity::DIMENSIONS.iter().map(|d| d.name).collect()
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

    /// Features for a synthetic track whose brightness is `b` and texture `t`.
    fn features(b: f64, t: f64) -> Vec<AudioFeature> {
        let mut f: Vec<AudioFeature> = [
            ("spectral_centroid_mean", 1000.0 + 900.0 * b),
            ("spectral_bandwidth_mean", 700.0 + 300.0 * b),
            ("spectral_rolloff_mean", 2000.0 + 1500.0 * b),
            ("spectral_flatness_mean", 0.05 + 0.3 * t),
            ("spectral_flux_mean", 0.1 + 0.2 * t),
            ("crest_factor_db", 10.0 + 2.0 * t),
            ("loudness_range", 4.0 + 3.0 * b),
            ("integrated_loudness", -14.0),
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

    fn catalog() -> Vec<(TrackRecord, Option<Vec<AudioFeature>>)> {
        vec![
            (track("a"), Some(features(0.0, 0.0))),
            (track("a2"), Some(features(0.05, 0.02))),
            (track("b"), Some(features(1.0, 0.1))),
            (track("c"), Some(features(0.5, 1.0))),
            (track("d"), None),
        ]
    }

    #[test]
    fn places_eligible_tracks_and_explains_exclusions() {
        let s = snapshot(&catalog());
        assert_eq!(s.status, "ready");
        assert_eq!(s.points.len(), 4);
        assert_eq!(s.total, 5);
        assert_eq!(s.excluded.len(), 1);
        assert_eq!(s.excluded[0].reason, "not analyzed");
        assert_eq!(s.axes.len(), 2);
        assert!(s.axes[0].explained >= s.axes[1].explained);
        assert_eq!(s.points[0].integrated_lufs, Some(-14.0));
        assert_eq!(
            s.points[0].tempo_bpm, None,
            "absent descriptors stay absent"
        );
    }

    #[test]
    fn nearest_neighbour_is_the_most_similar_track() {
        let n = neighbours(&catalog(), "a", 2).unwrap();
        assert_eq!(n[0].track_id, "a2");
        assert!(n[0].distance < n[1].distance);
        let total: f64 = n[0].contributions.values().sum();
        assert!((total - 1.0).abs() < 1e-9);
    }

    #[test]
    fn too_few_tracks_is_unavailable_not_a_fake_map() {
        let small = vec![
            (track("a"), Some(features(0.0, 0.0))),
            (track("b"), Some(features(1.0, 1.0))),
        ];
        let s = snapshot(&small);
        assert_eq!(s.status, "unavailable");
        assert_eq!(s.reason, Some("too_few_tracks"));
        assert_eq!(s.points, Vec::new());
        assert_eq!(neighbours(&small, "a", 3), None);
    }

    #[test]
    fn a_track_with_a_missing_feature_is_excluded_with_its_key() {
        let mut broken = features(0.3, 0.3);
        broken.retain(|f| f.key != "spectral_flux_mean");
        let mut c = catalog();
        c.push((track("e"), Some(broken)));
        let s = snapshot(&c);
        let e = s.excluded.iter().find(|x| x.track_id == "e").unwrap();
        assert_eq!(e.reason, "spectral_flux_mean unavailable");
        assert!(dimension_names().contains(&"flux"));
    }
}
