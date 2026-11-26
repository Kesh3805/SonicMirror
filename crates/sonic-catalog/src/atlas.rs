//! Atlas snapshot repository (SAD §44 "Snapshot consistency").
//!
//! Saved coordinates are immutable: a snapshot is written once and later
//! replaced by a newer one, never edited. Deleting a track removes its point
//! through the foreign key; surviving points keep their coordinates.

use rusqlite::{OptionalExtension, params};

use crate::{Catalog, CatalogError, Result, now_ms};

/// Snapshots kept after a save; older ones are pruned.
pub const KEPT_SNAPSHOTS: usize = 5;

/// One placed track and the analysis its position came from.
#[derive(Debug, Clone, PartialEq)]
pub struct SnapshotPoint {
    pub track_id: String,
    pub analysis_id: String,
    pub x: f64,
    pub y: f64,
}

/// A projection to save.
#[derive(Debug, Clone)]
pub struct NewAtlasSnapshot<'a> {
    pub feature_schema_version: &'a str,
    pub algorithm_version: &'a str,
    pub input_digest: &'a str,
    pub model_json: &'a str,
    pub excluded_count: usize,
    pub points: &'a [SnapshotPoint],
}

/// A saved projection.
#[derive(Debug, Clone, PartialEq)]
pub struct StoredAtlasSnapshot {
    pub id: String,
    pub feature_schema_version: String,
    pub algorithm_version: String,
    pub input_digest: String,
    pub model_json: String,
    /// Tracks placed when the snapshot was made; deleted tracks may since have dropped out of `points`.
    pub eligible_count: usize,
    pub excluded_count: usize,
    pub created_at_ms: i64,
    pub points: Vec<SnapshotPoint>,
}

fn count(n: usize) -> Result<i64> {
    i64::try_from(n).map_err(|_| CatalogError::Invalid("count"))
}

fn uncount(n: i64) -> Result<usize> {
    usize::try_from(n).map_err(|_| CatalogError::Invalid("count"))
}

impl Catalog {
    /// Save a projection and prune all but the newest [`KEPT_SNAPSHOTS`].
    ///
    /// # Errors
    ///
    /// Fails on a database error, a non-finite coordinate, or a point whose
    /// track or analysis does not exist.
    pub fn save_atlas_snapshot(&mut self, new: &NewAtlasSnapshot<'_>) -> Result<String> {
        if new
            .points
            .iter()
            .any(|p| !p.x.is_finite() || !p.y.is_finite())
        {
            return Err(CatalogError::Invalid("non-finite coordinate"));
        }
        let id = uuid::Uuid::now_v7().to_string();
        let tx = self.conn.transaction()?;
        tx.execute(
            "INSERT INTO atlas_snapshots (id, feature_schema_version, algorithm_version,
                input_digest, model_json, eligible_count, excluded_count, created_at_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                id,
                new.feature_schema_version,
                new.algorithm_version,
                new.input_digest,
                new.model_json,
                count(new.points.len())?,
                count(new.excluded_count)?,
                now_ms(),
            ],
        )?;
        {
            let mut insert = tx.prepare(
                "INSERT INTO atlas_points (snapshot_id, track_id, analysis_id, x, y)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
            )?;
            for p in new.points {
                insert.execute(params![id, p.track_id, p.analysis_id, p.x, p.y])?;
            }
        }
        tx.execute(
            "DELETE FROM atlas_snapshots WHERE id NOT IN (
                SELECT id FROM atlas_snapshots ORDER BY created_at_ms DESC, id DESC LIMIT ?1)",
            [count(KEPT_SNAPSHOTS)?],
        )?;
        tx.commit()?;
        Ok(id)
    }

    /// The most recently saved projection, if any.
    ///
    /// # Errors
    ///
    /// Fails on a database error or invalid stored data.
    pub fn latest_atlas_snapshot(&self) -> Result<Option<StoredAtlasSnapshot>> {
        let head = self
            .conn
            .query_row(
                "SELECT id, feature_schema_version, algorithm_version, input_digest,
                    model_json, eligible_count, excluded_count, created_at_ms
                 FROM atlas_snapshots ORDER BY created_at_ms DESC, id DESC LIMIT 1",
                [],
                |r| {
                    Ok((
                        r.get::<_, String>(0)?,
                        r.get::<_, String>(1)?,
                        r.get::<_, String>(2)?,
                        r.get::<_, String>(3)?,
                        r.get::<_, String>(4)?,
                        r.get::<_, i64>(5)?,
                        r.get::<_, i64>(6)?,
                        r.get::<_, i64>(7)?,
                    ))
                },
            )
            .optional()?;
        let Some((id, fsv, alg, digest, model, eligible, excluded, created)) = head else {
            return Ok(None);
        };
        let mut stmt = self.conn.prepare(
            "SELECT track_id, analysis_id, x, y FROM atlas_points
             WHERE snapshot_id = ?1 ORDER BY track_id",
        )?;
        let points = stmt
            .query_map([&id], |r| {
                Ok(SnapshotPoint {
                    track_id: r.get(0)?,
                    analysis_id: r.get(1)?,
                    x: r.get(2)?,
                    y: r.get(3)?,
                })
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        Ok(Some(StoredAtlasSnapshot {
            id,
            feature_schema_version: fsv,
            algorithm_version: alg,
            input_digest: digest,
            model_json: model,
            eligible_count: uncount(eligible)?,
            excluded_count: uncount(excluded)?,
            created_at_ms: created,
            points,
        }))
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use sonic_core::domain::{AudioFeature, ContentDigest};
    use sonic_core::media::metadata::TrackMetadata;

    use super::*;
    use crate::{NewAnalysis, NewTrack};

    /// A catalog with `n` analyzed tracks; returns (track id, analysis id) pairs.
    fn catalog(n: usize) -> (Catalog, Vec<(String, String)>) {
        let mut c = Catalog::open_in_memory().unwrap();
        let ids = (0..n)
            .map(|i| {
                let hash = ContentDigest::of_bytes(format!("audio{i}").as_bytes());
                let track = c
                    .upsert_track(&NewTrack {
                        path: PathBuf::from(format!("/m/{i}.wav")),
                        size_bytes: 5,
                        modified_at_ms: None,
                        content_hash: hash.clone(),
                        metadata: TrackMetadata::default(),
                        duration_ms: Some(1000),
                        sample_rate_hz: Some(8000),
                        channel_count: Some(1),
                        codec: None,
                    })
                    .unwrap();
                let key = ContentDigest::of_bytes(format!("key{i}").as_bytes()).to_string();
                let features = [AudioFeature::scalar("rms_dbfs", -9.0, Some("dBFS"), "l/1")];
                let analysis = c
                    .save_analysis(&NewAnalysis {
                        track_id: &track,
                        cache_key: &key,
                        content_hash: &hash,
                        engine_version: "e",
                        feature_schema_version: "s",
                        configuration_json: "{}",
                        features: &features,
                        artifacts: &[],
                    })
                    .unwrap();
                (track, analysis)
            })
            .collect();
        (c, ids)
    }

    fn points(ids: &[(String, String)]) -> Vec<SnapshotPoint> {
        ids.iter()
            .enumerate()
            .map(|(i, (t, a))| SnapshotPoint {
                track_id: t.clone(),
                analysis_id: a.clone(),
                x: f64::from(u32::try_from(i).unwrap()),
                y: -0.5,
            })
            .collect()
    }

    fn save(c: &mut Catalog, pts: &[SnapshotPoint], digest: &str) -> String {
        c.save_atlas_snapshot(&NewAtlasSnapshot {
            feature_schema_version: "vector/1.0.0",
            algorithm_version: "pca/1.0.0",
            input_digest: digest,
            model_json: "[]",
            excluded_count: 1,
            points: pts,
        })
        .unwrap()
    }

    #[test]
    fn round_trips_the_latest_snapshot() {
        let (mut c, ids) = catalog(3);
        assert_eq!(c.latest_atlas_snapshot().unwrap(), None);
        let pts = points(&ids);
        let digest = "a".repeat(64);
        let id = save(&mut c, &pts, &digest);
        let s = c.latest_atlas_snapshot().unwrap().unwrap();
        assert_eq!(s.id, id);
        assert_eq!(s.input_digest, digest);
        assert_eq!((s.eligible_count, s.excluded_count), (3, 1));
        let mut expected = pts;
        expected.sort_by(|a, b| a.track_id.cmp(&b.track_id));
        assert_eq!(s.points, expected);
    }

    #[test]
    fn newer_snapshots_supersede_and_old_ones_are_pruned() {
        let (mut c, ids) = catalog(3);
        let pts = points(&ids);
        let mut last = String::new();
        for i in 0..KEPT_SNAPSHOTS + 2 {
            last = save(&mut c, &pts, &format!("{i:0>64}"));
        }
        assert_eq!(c.latest_atlas_snapshot().unwrap().unwrap().id, last);
        let kept: i64 = c
            .conn
            .query_row("SELECT count(*) FROM atlas_snapshots", [], |r| r.get(0))
            .unwrap();
        assert_eq!(kept, i64::try_from(KEPT_SNAPSHOTS).unwrap());
    }

    #[test]
    fn a_deleted_track_leaves_the_other_coordinates_untouched() {
        let (mut c, ids) = catalog(3);
        save(&mut c, &points(&ids), &"b".repeat(64));
        c.conn
            .execute("DELETE FROM tracks WHERE id = ?1", [&ids[1].0])
            .unwrap();
        let s = c.latest_atlas_snapshot().unwrap().unwrap();
        assert_eq!(s.eligible_count, 3);
        assert_eq!(s.points.len(), 2);
        let first = s.points.iter().find(|p| p.track_id == ids[0].0).unwrap();
        assert_eq!((first.x, first.y), (0.0, -0.5));
    }

    #[test]
    fn rejects_non_finite_coordinates() {
        let (mut c, ids) = catalog(1);
        let mut pts = points(&ids);
        pts[0].x = f64::NAN;
        let err = c
            .save_atlas_snapshot(&NewAtlasSnapshot {
                feature_schema_version: "v",
                algorithm_version: "p",
                input_digest: &"c".repeat(64),
                model_json: "[]",
                excluded_count: 0,
                points: &pts,
            })
            .unwrap_err();
        assert!(matches!(err, CatalogError::Invalid(_)));
    }
}
