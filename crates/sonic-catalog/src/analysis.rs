//! Analysis run repository.

use rusqlite::{OptionalExtension, Transaction, params};
use serde::Serialize;
use sonic_core::domain::{AudioFeature, ContentDigest, FeatureStatus, FeatureValue};

use crate::artifacts::StoredArtifact;
use crate::{Catalog, CatalogError, Result, now_ms};

/// A completed analysis to attach to a track.
#[derive(Debug, Clone)]
pub struct NewAnalysis<'a> {
    pub track_id: &'a str,
    pub cache_key: &'a str,
    pub content_hash: &'a ContentDigest,
    pub engine_version: &'a str,
    pub feature_schema_version: &'a str,
    pub configuration_json: &'a str,
    pub features: &'a [AudioFeature],
    pub artifacts: &'a [StoredArtifact],
}

/// The analysis currently attached to a track.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredAnalysis {
    pub analysis_id: String,
    pub engine_version: String,
    pub feature_schema_version: String,
    pub status: String,
    pub completed_at_ms: i64,
    pub features: Vec<AudioFeature>,
    #[serde(skip)]
    pub waveform_path: Option<String>,
}

fn status_str(status: FeatureStatus) -> &'static str {
    match status {
        FeatureStatus::Valid => "valid",
        FeatureStatus::Unavailable => "unavailable",
        FeatureStatus::Failed => "failed",
    }
}

fn parse_status(s: &str) -> Result<FeatureStatus> {
    match s {
        "valid" => Ok(FeatureStatus::Valid),
        "unavailable" => Ok(FeatureStatus::Unavailable),
        "failed" => Ok(FeatureStatus::Failed),
        _ => Err(CatalogError::Invalid("feature status")),
    }
}

impl Catalog {
    /// Record an analysis and attach it to its track in one transaction.
    /// Re-saving an analysis with the same cache key reuses the existing run.
    ///
    /// # Errors
    ///
    /// Fails on a database error; nothing is committed in that case.
    pub fn save_analysis(&mut self, new: &NewAnalysis<'_>) -> Result<String> {
        let now = now_ms();
        let tx = self.conn.transaction()?;

        let existing: Option<String> = tx
            .query_row(
                "SELECT id FROM analysis_runs WHERE cache_key = ?1",
                [new.cache_key],
                |r| r.get(0),
            )
            .optional()?;

        let analysis_id = if let Some(id) = existing {
            id
        } else {
            let id = uuid::Uuid::now_v7().to_string();
            let any_unavailable = new.features.iter().any(|f| !f.is_valid());
            let config_hash = ContentDigest::of_bytes(new.configuration_json.as_bytes());
            tx.execute(
                "INSERT INTO analysis_runs (id, cache_key, content_hash, engine_version,
                    feature_schema_version, configuration_hash, configuration_json, status,
                    completed_at_ms)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    id,
                    new.cache_key,
                    new.content_hash.as_str(),
                    new.engine_version,
                    new.feature_schema_version,
                    config_hash.as_str(),
                    new.configuration_json,
                    if any_unavailable {
                        "partial"
                    } else {
                        "complete"
                    },
                    now
                ],
            )?;
            insert_features(&tx, &id, new.features)?;
            for a in new.artifacts {
                tx.execute(
                    "INSERT INTO analysis_artifacts (analysis_id, kind, format_version,
                        relative_path, content_hash, size_bytes, created_at_ms)
                     VALUES (?1, ?2, 1, ?3, ?4, ?5, ?6)",
                    params![
                        id,
                        a.kind.as_str(),
                        a.relative_path,
                        a.content_hash.as_str(),
                        i64::try_from(a.size_bytes).unwrap_or(i64::MAX),
                        now
                    ],
                )?;
            }
            id
        };

        let revision: i64 = tx
            .query_row(
                "SELECT content_revision FROM tracks WHERE id = ?1",
                [new.track_id],
                |r| r.get(0),
            )
            .optional()?
            .ok_or(CatalogError::NotFound)?;
        tx.execute(
            "INSERT INTO track_analysis (track_id, analysis_id, content_revision, attached_at_ms)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(track_id) DO UPDATE SET analysis_id = excluded.analysis_id,
                content_revision = excluded.content_revision,
                attached_at_ms = excluded.attached_at_ms",
            params![new.track_id, analysis_id, revision, now],
        )?;
        tx.commit()?;
        Ok(analysis_id)
    }

    /// Find a completed run by cache key, so identical content is not re-analyzed.
    ///
    /// # Errors
    ///
    /// Fails on a database error.
    pub fn analysis_id_for_cache_key(&self, cache_key: &str) -> Result<Option<String>> {
        Ok(self
            .conn
            .query_row(
                "SELECT id FROM analysis_runs WHERE cache_key = ?1",
                [cache_key],
                |r| r.get(0),
            )
            .optional()?)
    }

    /// The analysis attached to a track, if any.
    ///
    /// # Errors
    ///
    /// Fails on a database error or invalid stored data.
    pub fn analysis_for_track(&self, track_id: &str) -> Result<Option<StoredAnalysis>> {
        let run = self
            .conn
            .query_row(
                "SELECT r.id, r.engine_version, r.feature_schema_version, r.status,
                    r.completed_at_ms
                 FROM track_analysis ta JOIN analysis_runs r ON r.id = ta.analysis_id
                 WHERE ta.track_id = ?1",
                [track_id],
                |r| {
                    Ok((
                        r.get::<_, String>(0)?,
                        r.get::<_, String>(1)?,
                        r.get::<_, String>(2)?,
                        r.get::<_, String>(3)?,
                        r.get::<_, i64>(4)?,
                    ))
                },
            )
            .optional()?;
        let Some((analysis_id, engine_version, feature_schema_version, status, completed_at_ms)) =
            run
        else {
            return Ok(None);
        };

        let mut stmt = self.conn.prepare(
            "SELECT feature_key, value_kind, scalar_value, vector_json, unit, status,
                algorithm_version, confidence, diagnostic_code
             FROM audio_features WHERE analysis_id = ?1 ORDER BY rowid",
        )?;
        let rows = stmt.query_map([&analysis_id], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, Option<f64>>(2)?,
                r.get::<_, Option<String>>(3)?,
                r.get::<_, Option<String>>(4)?,
                r.get::<_, String>(5)?,
                r.get::<_, String>(6)?,
                r.get::<_, Option<f64>>(7)?,
                r.get::<_, Option<String>>(8)?,
            ))
        })?;
        let mut features = Vec::new();
        for row in rows {
            let (key, kind, scalar, vector, unit, status, version, confidence, diagnostic) = row?;
            let value = match kind.as_str() {
                "scalar" => scalar.map(FeatureValue::Scalar),
                "vector" => vector
                    .as_deref()
                    .map(serde_json::from_str::<Vec<f64>>)
                    .transpose()
                    .map_err(|_| CatalogError::Invalid("feature vector"))?
                    .map(FeatureValue::Vector),
                _ => None,
            };
            features.push(AudioFeature {
                key,
                value,
                unit,
                status: parse_status(&status)?,
                algorithm_version: version,
                confidence,
                diagnostic_code: diagnostic,
            });
        }

        let waveform_path = self
            .conn
            .query_row(
                "SELECT relative_path FROM analysis_artifacts
                 WHERE analysis_id = ?1 AND kind = 'waveform'",
                [&analysis_id],
                |r| r.get(0),
            )
            .optional()?;

        Ok(Some(StoredAnalysis {
            analysis_id,
            engine_version,
            feature_schema_version,
            status,
            completed_at_ms,
            features,
            waveform_path,
        }))
    }
}

fn insert_features(
    tx: &Transaction<'_>,
    analysis_id: &str,
    features: &[AudioFeature],
) -> Result<()> {
    let mut stmt = tx.prepare(
        "INSERT INTO audio_features (analysis_id, feature_key, value_kind, scalar_value,
            vector_json, unit, status, algorithm_version, confidence, diagnostic_code)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
    )?;
    for f in features {
        let (kind, scalar, vector) = match (&f.value, f.status) {
            (Some(FeatureValue::Scalar(v)), FeatureStatus::Valid) => ("scalar", Some(*v), None),
            (Some(FeatureValue::Vector(v)), FeatureStatus::Valid) => (
                "vector",
                None,
                Some(serde_json::to_string(v).map_err(|_| CatalogError::Invalid("vector"))?),
            ),
            _ => ("none", None, None),
        };
        stmt.execute(params![
            analysis_id,
            f.key,
            kind,
            scalar,
            vector,
            f.unit,
            status_str(f.status),
            f.algorithm_version,
            f.confidence,
            f.diagnostic_code
        ])?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use sonic_core::media::metadata::TrackMetadata;

    use super::*;
    use crate::NewTrack;
    use crate::artifacts::ArtifactKind;

    fn catalog_with_track() -> (Catalog, String, ContentDigest) {
        let mut c = Catalog::open_in_memory().unwrap();
        let hash = ContentDigest::of_bytes(b"audio");
        let id = c
            .upsert_track(&NewTrack {
                path: PathBuf::from("/m/a.wav"),
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
        (c, id, hash)
    }

    fn features() -> Vec<AudioFeature> {
        vec![
            AudioFeature::scalar("rms_dbfs", -9.03, Some("dBFS"), "level/1.0.0"),
            AudioFeature::unavailable("tempo", Some("BPM"), "tempo/0", "low_confidence"),
        ]
    }

    #[test]
    fn save_and_load_round_trip() {
        let (mut c, track, hash) = catalog_with_track();
        let key = ContentDigest::of_bytes(b"key").to_string();
        let artifact = StoredArtifact {
            kind: ArtifactKind::Waveform,
            relative_path: format!("waveform/{}/{key}.smwf", &key[..2]),
            content_hash: ContentDigest::of_bytes(b"wf"),
            size_bytes: 2,
        };
        let feats = features();
        c.save_analysis(&NewAnalysis {
            track_id: &track,
            cache_key: &key,
            content_hash: &hash,
            engine_version: "e",
            feature_schema_version: "s",
            configuration_json: "{}",
            features: &feats,
            artifacts: std::slice::from_ref(&artifact),
        })
        .unwrap();

        let stored = c.analysis_for_track(&track).unwrap().unwrap();
        assert_eq!(stored.features, feats);
        assert_eq!(stored.status, "partial");
        assert_eq!(stored.waveform_path, Some(artifact.relative_path));
        assert_eq!(
            c.analysis_id_for_cache_key(&key).unwrap(),
            Some(stored.analysis_id)
        );
    }

    #[test]
    fn same_cache_key_reuses_run() {
        let (mut c, track, hash) = catalog_with_track();
        let key = ContentDigest::of_bytes(b"key").to_string();
        let feats = features();
        let new = NewAnalysis {
            track_id: &track,
            cache_key: &key,
            content_hash: &hash,
            engine_version: "e",
            feature_schema_version: "s",
            configuration_json: "{}",
            features: &feats,
            artifacts: &[],
        };
        let a = c.save_analysis(&new).unwrap();
        let b = c.save_analysis(&new).unwrap();
        assert_eq!(a, b);
    }

    #[test]
    fn database_rejects_value_on_unavailable_feature() {
        let (c, _, _) = catalog_with_track();
        c.conn
            .execute(
                "INSERT INTO analysis_runs VALUES ('r', ?1, ?1, 'e', 's', 'h', '{}', 'complete', NULL, 0)",
                [ContentDigest::of_bytes(b"z").as_str()],
            )
            .unwrap();
        let err = c.conn.execute(
            "INSERT INTO audio_features (analysis_id, feature_key, value_kind, scalar_value,
                status, algorithm_version) VALUES ('r', 'tempo', 'scalar', 0.0, 'unavailable', 'v')",
            [],
        );
        assert!(err.is_err(), "a silent zero must be rejected by the schema");
    }

    #[test]
    fn untouched_track_has_no_analysis() {
        let (c, track, _) = catalog_with_track();
        assert_eq!(c.analysis_for_track(&track).unwrap(), None);
    }
}
