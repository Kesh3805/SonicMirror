//! Sonic Atlas snapshots and neighbours (PRD §14).
//!
//! Pure functions over catalog data: eligibility, normalization, projection
//! and neighbour search. Every number a user sees comes from stored
//! measurements; tracks that cannot be placed are listed with the reason.

use std::collections::{BTreeMap, HashMap};

use serde::{Deserialize, Serialize};
use sonic_catalog::{SnapshotPoint, StoredAtlasSnapshot, TrackRecord};
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
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasAxis {
    pub explained: f64,
    pub top: Vec<(String, f64)>,
}

/// How the catalog has moved on since a saved map was made.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasChanges {
    /// Eligible tracks that are not on the map.
    pub added: usize,
    /// Tracks on the map whose analysis has since been replaced.
    pub changed: usize,
    /// Tracks on the map that have since been deleted.
    pub removed: usize,
}

/// The map: freshly computed, or a saved snapshot read back.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasSnapshot {
    /// `ready`, or `unavailable` with a reason code.
    pub status: &'static str,
    pub reason: Option<&'static str>,
    /// Saved snapshot id and time; absent for a map that was not saved.
    pub snapshot_id: Option<String>,
    pub created_at_ms: Option<i64>,
    /// The catalog or engine has changed since the coordinates were computed.
    pub stale: bool,
    pub changes: AtlasChanges,
    pub vector_version: String,
    pub projection_version: String,
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

fn point(t: &TrackRecord, f: &[AudioFeature], x: f64, y: f64) -> AtlasPoint {
    AtlasPoint {
        track_id: t.id.clone(),
        title: t.title.clone(),
        artist: t.artist.clone(),
        x,
        y,
        centroid_hz: scalar(f, "spectral_centroid_mean"),
        integrated_lufs: scalar(f, "integrated_loudness"),
        tempo_bpm: scalar(f, "tempo_bpm"),
        flatness: scalar(f, "spectral_flatness_mean"),
    }
}

/// Compute the Atlas for a catalog of tracks and their stored features.
pub fn snapshot(catalog: &[(TrackRecord, Option<Vec<AudioFeature>>)]) -> AtlasSnapshot {
    let space = build_space(catalog);
    let base = |status, reason| AtlasSnapshot {
        status,
        reason,
        snapshot_id: None,
        created_at_ms: None,
        stale: false,
        changes: AtlasChanges::default(),
        vector_version: VECTOR_VERSION.to_owned(),
        projection_version: PROJECTION_VERSION.to_owned(),
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
        .map(|((t, f), [x, y])| point(t, f, *x, *y))
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

/// Original-space distance between two tracks and what drives it.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PairDistance {
    pub distance: f64,
    /// Share of squared distance per feature group, summing to 1.
    pub contributions: BTreeMap<&'static str, f64>,
    /// Tracks whose spread defines the normalization.
    pub reference_tracks: usize,
}

/// Why two tracks have no shared distance.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PairUnavailable {
    /// One side lacks a measurement the vector needs.
    Ineligible,
    /// Too few eligible tracks to define a normalization.
    TooFewTracks,
}

/// Weighted distance between two tracks in the same normalized space the
/// Atlas neighbours use, fitted on every eligible track in the catalog.
///
/// # Errors
///
/// Returns why no distance can be stated.
pub fn pair(
    catalog: &[(TrackRecord, Option<Vec<AudioFeature>>)],
    left: &str,
    right: &str,
) -> Result<PairDistance, PairUnavailable> {
    let space = build_space(catalog);
    let index = |id: &str| space.tracks.iter().position(|(t, _)| t.id == id);
    let (Some(li), Some(ri)) = (index(left), index(right)) else {
        return Err(PairUnavailable::Ineligible);
    };
    if space.tracks.len() < MIN_POINTS {
        return Err(PairUnavailable::TooFewTracks);
    }
    let weights = &space.weights;
    let (lv, rv) = (&space.normalized[li], &space.normalized[ri]);
    Ok(PairDistance {
        distance: similarity::distance(lv, rv, weights),
        contributions: contributions(lv, rv, weights),
        reference_tracks: space.tracks.len(),
    })
}

/// Fingerprint of everything a projection depends on: the engine versions
/// and, for every track, the analysis attached to it (or none). Any import,
/// deletion or reanalysis changes it.
pub fn input_digest(analysis_ids: &BTreeMap<String, String>, track_ids: &[&str]) -> String {
    let mut ids: Vec<&str> = track_ids.to_vec();
    ids.sort_unstable();
    let mut h = blake3::Hasher::new();
    h.update(VECTOR_VERSION.as_bytes());
    h.update(b"\n");
    h.update(PROJECTION_VERSION.as_bytes());
    for id in ids {
        h.update(b"\n");
        h.update(id.as_bytes());
        h.update(b"=");
        if let Some(a) = analysis_ids.get(id) {
            h.update(a.as_bytes());
        }
    }
    h.finalize().to_hex().to_string()
}

/// Points of a freshly computed map, tied to the analyses they came from.
pub fn snapshot_points(
    map: &AtlasSnapshot,
    analysis_ids: &BTreeMap<String, String>,
) -> Vec<SnapshotPoint> {
    map.points
        .iter()
        .filter_map(|p| {
            Some(SnapshotPoint {
                track_id: p.track_id.clone(),
                analysis_id: analysis_ids.get(&p.track_id)?.clone(),
                x: p.x,
                y: p.y,
            })
        })
        .collect()
}

/// Serialized principal axes for a saved snapshot.
///
/// # Panics
///
/// Never: axes are plain numbers and strings.
pub fn model_json(map: &AtlasSnapshot) -> String {
    serde_json::to_string(&map.axes).expect("axes serialize")
}

/// Read a saved snapshot back against the current catalog (SAD §44).
///
/// Saved coordinates are never moved. A point whose analysis has since been
/// replaced is taken off the map rather than shown at a position computed
/// from other measurements; tracks added since are listed, not placed.
/// Returns `None` if the stored model cannot be read.
pub fn from_saved(
    saved: &StoredAtlasSnapshot,
    catalog: &[(TrackRecord, Option<Vec<AudioFeature>>)],
    analysis_ids: &BTreeMap<String, String>,
    current_digest: &str,
) -> Option<AtlasSnapshot> {
    let axes: Vec<AtlasAxis> = serde_json::from_str(&saved.model_json).ok()?;
    let saved_points: HashMap<&str, &SnapshotPoint> = saved
        .points
        .iter()
        .map(|p| (p.track_id.as_str(), p))
        .collect();
    let mut points = Vec::new();
    let mut excluded = Vec::new();
    let mut changes = AtlasChanges {
        removed: saved.eligible_count.saturating_sub(saved.points.len()),
        ..AtlasChanges::default()
    };
    for (track, features) in catalog {
        let exclude = |reason: String| AtlasExclusion {
            track_id: track.id.clone(),
            title: track.title.clone(),
            reason,
        };
        let current = analysis_ids.get(&track.id);
        match (saved_points.get(track.id.as_str()), features) {
            (Some(sp), Some(f)) if current == Some(&sp.analysis_id) => {
                points.push(point(track, f, sp.x, sp.y));
            }
            (Some(_), _) => {
                changes.changed += 1;
                excluded.push(exclude("reanalyzed since this map".to_owned()));
            }
            (None, None) => excluded.push(exclude("not analyzed".to_owned())),
            (None, Some(f)) => match raw_vector(f) {
                Ok(_) => {
                    changes.added += 1;
                    excluded.push(exclude("added since this map".to_owned()));
                }
                Err(key) => excluded.push(exclude(format!("{key} unavailable"))),
            },
        }
    }
    let versions_match = saved.feature_schema_version == VECTOR_VERSION
        && saved.algorithm_version == PROJECTION_VERSION;
    Some(AtlasSnapshot {
        status: "ready",
        reason: None,
        snapshot_id: Some(saved.id.clone()),
        created_at_ms: Some(saved.created_at_ms),
        stale: !versions_match || saved.input_digest != current_digest,
        changes,
        vector_version: saved.feature_schema_version.clone(),
        projection_version: saved.algorithm_version.clone(),
        min_tracks: MIN_POINTS,
        total: catalog.len(),
        points,
        excluded,
        axes,
    })
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

    fn ids(pairs: &[(&str, &str)]) -> BTreeMap<String, String> {
        pairs
            .iter()
            .map(|(t, a)| ((*t).to_owned(), (*a).to_owned()))
            .collect()
    }

    /// Save the current catalog's map as the stored snapshot would hold it.
    fn saved(
        c: &[(TrackRecord, Option<Vec<AudioFeature>>)],
        analysis: &BTreeMap<String, String>,
    ) -> StoredAtlasSnapshot {
        let map = snapshot(c);
        let track_ids: Vec<&str> = c.iter().map(|(t, _)| t.id.as_str()).collect();
        let points = snapshot_points(&map, analysis);
        StoredAtlasSnapshot {
            id: "s1".into(),
            feature_schema_version: VECTOR_VERSION.into(),
            algorithm_version: PROJECTION_VERSION.into(),
            input_digest: input_digest(analysis, &track_ids),
            model_json: model_json(&map),
            eligible_count: points.len(),
            excluded_count: map.excluded.len(),
            created_at_ms: 42,
            points,
        }
    }

    const ANALYSES: [(&str, &str); 4] = [("a", "r1"), ("a2", "r2"), ("b", "r3"), ("c", "r4")];

    #[test]
    fn digest_tracks_every_input_but_not_order() {
        let a = ids(&ANALYSES);
        let base = input_digest(&a, &["a", "b", "c", "d"]);
        assert_eq!(base, input_digest(&a, &["d", "c", "b", "a"]));
        assert_eq!(base.len(), 64);
        let mut reanalyzed = a.clone();
        reanalyzed.insert("b".into(), "r9".into());
        assert_ne!(base, input_digest(&reanalyzed, &["a", "b", "c", "d"]));
        assert_ne!(base, input_digest(&a, &["a", "b", "c", "d", "e"]));
        assert_ne!(base, input_digest(&a, &["a", "b", "c"]));
    }

    #[test]
    fn an_unchanged_catalog_reads_back_the_same_fresh_map() {
        let c = catalog();
        let a = ids(&ANALYSES);
        let s = saved(&c, &a);
        let fresh = snapshot(&c);
        let back = from_saved(&s, &c, &a, &s.input_digest).unwrap();
        assert!(!back.stale);
        assert_eq!(back.changes, AtlasChanges::default());
        assert_eq!(back.snapshot_id.as_deref(), Some("s1"));
        assert_eq!(back.created_at_ms, Some(42));
        assert_eq!(back.axes, fresh.axes);
        let mut want = fresh.points;
        want.sort_by(|x, y| x.track_id.cmp(&y.track_id));
        let mut got = back.points;
        got.sort_by(|x, y| x.track_id.cmp(&y.track_id));
        assert_eq!(got, want);
    }

    #[test]
    fn later_changes_mark_the_map_stale_without_moving_points() {
        let c = catalog();
        let a = ids(&ANALYSES);
        let s = saved(&c, &a);
        let frozen: HashMap<String, (f64, f64)> = s
            .points
            .iter()
            .map(|p| (p.track_id.clone(), (p.x, p.y)))
            .collect();

        // "b" reanalyzed, "c" deleted (its point cascades away), "e" added and analyzable.
        let mut now: Vec<_> = c.into_iter().filter(|(t, _)| t.id != "c").collect();
        now.push((track("e"), Some(features(0.9, 0.9))));
        let mut s = s;
        s.points.retain(|p| p.track_id != "c");
        let mut a2 = ids(&[("a", "r1"), ("a2", "r2"), ("b", "r9"), ("e", "r5")]);
        a2.remove("c");
        let track_ids: Vec<&str> = now.iter().map(|(t, _)| t.id.as_str()).collect();
        let digest = input_digest(&a2, &track_ids);

        let back = from_saved(&s, &now, &a2, &digest).unwrap();
        assert!(back.stale);
        assert_eq!(
            back.changes,
            AtlasChanges {
                added: 1,
                changed: 1,
                removed: 1
            }
        );
        let placed: Vec<&str> = back.points.iter().map(|p| p.track_id.as_str()).collect();
        assert_eq!(placed, ["a", "a2"]);
        for p in &back.points {
            assert_eq!((p.x, p.y), frozen[&p.track_id]);
        }
        let reason = |id: &str| {
            back.excluded
                .iter()
                .find(|e| e.track_id == id)
                .map(|e| e.reason.as_str())
        };
        assert_eq!(reason("b"), Some("reanalyzed since this map"));
        assert_eq!(reason("e"), Some("added since this map"));
        assert_eq!(reason("d"), Some("not analyzed"));
    }

    #[test]
    fn an_older_engine_snapshot_is_stale() {
        let c = catalog();
        let a = ids(&ANALYSES);
        let mut s = saved(&c, &a);
        s.feature_schema_version = "vector/0.9.0".into();
        let digest = s.input_digest.clone();
        let back = from_saved(&s, &c, &a, &digest).unwrap();
        assert!(back.stale);
        assert_eq!(back.vector_version, "vector/0.9.0");
    }

    #[test]
    fn an_unreadable_model_is_not_shown() {
        let c = catalog();
        let a = ids(&ANALYSES);
        let mut s = saved(&c, &a);
        s.model_json = "not json".into();
        let digest = s.input_digest.clone();
        assert_eq!(from_saved(&s, &c, &a, &digest), None);
    }
}
