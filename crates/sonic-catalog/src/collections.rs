//! Collection repository (SAD §16, PRD LIB-011/012).
//!
//! Collections are logical: they hold membership and a name. Nothing here
//! deletes a track or touches a source file.

use rusqlite::{OptionalExtension, Transaction, params};
use serde::Serialize;

use crate::tracks::{TRACK_COLUMNS, track_from_row};
use crate::{Catalog, CatalogError, Result, TrackRecord, now_ms};

/// Longest accepted name, in Unicode scalar values (PDS §7 "Collections").
pub const MAX_NAME_CHARS: usize = 100;

/// Most track ids one membership change may carry (SAD §20).
pub const MAX_BATCH: usize = 1000;

/// A collection with its size.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionSummary {
    pub id: String,
    pub name: String,
    pub track_count: usize,
    pub created_at_ms: i64,
    pub updated_at_ms: i64,
}

/// What a membership change did.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MembershipChange {
    /// Tracks whose membership changed.
    pub changed: usize,
    /// Tracks that were already in (on add) or not in (on remove) the collection.
    pub unchanged: usize,
}

/// A trimmed, validated collection name.
///
/// # Errors
///
/// Rejects a blank name, one longer than [`MAX_NAME_CHARS`], or one with
/// control characters.
pub fn validate_name(name: &str) -> Result<String> {
    let name = name.trim();
    if name.is_empty() {
        return Err(CatalogError::Invalid("collection name is blank"));
    }
    if name.chars().count() > MAX_NAME_CHARS {
        return Err(CatalogError::Invalid("collection name is too long"));
    }
    if name.chars().any(char::is_control) {
        return Err(CatalogError::Invalid(
            "collection name has control characters",
        ));
    }
    Ok(name.to_owned())
}

fn check_batch(ids: &[String]) -> Result<()> {
    if ids.len() > MAX_BATCH {
        return Err(CatalogError::Invalid("too many tracks in one change"));
    }
    Ok(())
}

fn count(n: i64) -> Result<usize> {
    usize::try_from(n).map_err(|_| CatalogError::Invalid("count"))
}

fn summary(tx: &rusqlite::Connection, id: &str) -> Result<CollectionSummary> {
    let row = tx
        .query_row(
            "SELECT c.id, c.name, c.created_at_ms, c.updated_at_ms,
                (SELECT count(*) FROM collection_items i WHERE i.collection_id = c.id)
             FROM collections c WHERE c.id = ?1",
            [id],
            |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, i64>(2)?,
                    r.get::<_, i64>(3)?,
                    r.get::<_, i64>(4)?,
                ))
            },
        )
        .optional()?
        .ok_or(CatalogError::NotFound)?;
    Ok(CollectionSummary {
        id: row.0,
        name: row.1,
        created_at_ms: row.2,
        updated_at_ms: row.3,
        track_count: count(row.4)?,
    })
}

/// Add `ids` in the given order after the current last position.
fn add(tx: &Transaction<'_>, collection_id: &str, ids: &[String]) -> Result<MembershipChange> {
    let mut next: i64 = tx.query_row(
        "SELECT coalesce(max(position) + 1, 0) FROM collection_items WHERE collection_id = ?1",
        [collection_id],
        |r| r.get(0),
    )?;
    let now = now_ms();
    let mut change = MembershipChange::default();
    let mut exists = tx.prepare("SELECT 1 FROM tracks WHERE id = ?1")?;
    let mut insert = tx.prepare(
        "INSERT OR IGNORE INTO collection_items (collection_id, track_id, position, added_at_ms)
         VALUES (?1, ?2, ?3, ?4)",
    )?;
    for id in ids {
        if exists.query_row([id], |_| Ok(())).optional()?.is_none() {
            return Err(CatalogError::NotFound);
        }
        if insert.execute(params![collection_id, id, next, now])? == 1 {
            change.changed += 1;
            next += 1;
        } else {
            change.unchanged += 1;
        }
    }
    Ok(change)
}

fn touch(tx: &Transaction<'_>, id: &str) -> Result<()> {
    let n = tx.execute(
        "UPDATE collections SET updated_at_ms = ?2 WHERE id = ?1",
        params![id, now_ms()],
    )?;
    if n == 0 {
        return Err(CatalogError::NotFound);
    }
    Ok(())
}

impl Catalog {
    /// Create a collection, optionally with initial tracks.
    ///
    /// # Errors
    ///
    /// Fails on an invalid name, too many ids, an unknown track id (nothing
    /// is created), or a database error.
    pub fn create_collection(
        &mut self,
        name: &str,
        track_ids: &[String],
    ) -> Result<CollectionSummary> {
        let name = validate_name(name)?;
        check_batch(track_ids)?;
        let id = uuid::Uuid::now_v7().to_string();
        let now = now_ms();
        let tx = self.conn.transaction()?;
        tx.execute(
            "INSERT INTO collections (id, name, created_at_ms, updated_at_ms)
             VALUES (?1, ?2, ?3, ?3)",
            params![id, name, now],
        )?;
        add(&tx, &id, track_ids)?;
        let s = summary(&tx, &id)?;
        tx.commit()?;
        Ok(s)
    }

    /// All collections, by name then id.
    ///
    /// # Errors
    ///
    /// Fails on a database error.
    pub fn collections(&self) -> Result<Vec<CollectionSummary>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id FROM collections ORDER BY name COLLATE NOCASE, id")?;
        let ids = stmt
            .query_map([], |r| r.get::<_, String>(0))?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        ids.iter().map(|id| summary(&self.conn, id)).collect()
    }

    /// # Errors
    ///
    /// Returns [`CatalogError::NotFound`] for an unknown id.
    pub fn collection(&self, id: &str) -> Result<CollectionSummary> {
        summary(&self.conn, id)
    }

    /// # Errors
    ///
    /// Fails on an invalid name or an unknown id.
    pub fn rename_collection(&mut self, id: &str, name: &str) -> Result<CollectionSummary> {
        let name = validate_name(name)?;
        let tx = self.conn.transaction()?;
        tx.execute(
            "UPDATE collections SET name = ?2 WHERE id = ?1",
            params![id, name],
        )?;
        touch(&tx, id)?;
        let s = summary(&tx, id)?;
        tx.commit()?;
        Ok(s)
    }

    /// Delete a collection and its memberships. Tracks are untouched.
    ///
    /// # Errors
    ///
    /// Returns [`CatalogError::NotFound`] for an unknown id.
    pub fn delete_collection(&mut self, id: &str) -> Result<()> {
        if self
            .conn
            .execute("DELETE FROM collections WHERE id = ?1", [id])?
            == 0
        {
            return Err(CatalogError::NotFound);
        }
        Ok(())
    }

    /// Add tracks; ones already present are counted as unchanged.
    ///
    /// # Errors
    ///
    /// Fails on too many ids or an unknown collection or track (nothing is
    /// added).
    pub fn add_to_collection(
        &mut self,
        id: &str,
        track_ids: &[String],
    ) -> Result<MembershipChange> {
        check_batch(track_ids)?;
        let tx = self.conn.transaction()?;
        touch(&tx, id)?;
        let change = add(&tx, id, track_ids)?;
        tx.commit()?;
        Ok(change)
    }

    /// Remove tracks from a collection only.
    ///
    /// # Errors
    ///
    /// Fails on too many ids or an unknown collection.
    pub fn remove_from_collection(
        &mut self,
        id: &str,
        track_ids: &[String],
    ) -> Result<MembershipChange> {
        check_batch(track_ids)?;
        let tx = self.conn.transaction()?;
        touch(&tx, id)?;
        let mut change = MembershipChange::default();
        {
            let mut delete = tx.prepare(
                "DELETE FROM collection_items WHERE collection_id = ?1 AND track_id = ?2",
            )?;
            for t in track_ids {
                if delete.execute(params![id, t])? == 1 {
                    change.changed += 1;
                } else {
                    change.unchanged += 1;
                }
            }
        }
        tx.commit()?;
        Ok(change)
    }

    /// Member tracks ordered by title, then id.
    ///
    /// # Errors
    ///
    /// Returns [`CatalogError::NotFound`] for an unknown collection.
    pub fn collection_tracks(&self, id: &str) -> Result<Vec<TrackRecord>> {
        summary(&self.conn, id)?;
        let columns = TRACK_COLUMNS
            .split(',')
            .map(|c| format!("t.{}", c.trim()))
            .collect::<Vec<_>>()
            .join(", ");
        let mut stmt = self.conn.prepare(&format!(
            "SELECT {columns} FROM collection_items i JOIN tracks t ON t.id = i.track_id
             WHERE i.collection_id = ?1 ORDER BY t.title COLLATE NOCASE, t.id"
        ))?;
        let rows = stmt.query_map([id], track_from_row)?;
        Ok(rows.collect::<rusqlite::Result<_>>()?)
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use sonic_core::domain::ContentDigest;
    use sonic_core::media::metadata::TrackMetadata;

    use super::*;
    use crate::NewTrack;

    fn with_tracks(titles: &[&str]) -> (Catalog, Vec<String>) {
        let mut c = Catalog::open_in_memory().unwrap();
        let ids = titles
            .iter()
            .map(|t| {
                c.upsert_track(&NewTrack {
                    path: PathBuf::from(format!("/m/{t}.wav")),
                    size_bytes: 1,
                    modified_at_ms: None,
                    content_hash: ContentDigest::of_bytes(t.as_bytes()),
                    metadata: TrackMetadata::default(),
                    duration_ms: Some(1000),
                    sample_rate_hz: Some(8000),
                    channel_count: Some(1),
                    codec: None,
                })
                .unwrap()
            })
            .collect();
        (c, ids)
    }

    fn titles(tracks: &[TrackRecord]) -> Vec<&str> {
        tracks.iter().map(|t| t.title.as_str()).collect()
    }

    #[test]
    fn validates_names() {
        assert_eq!(validate_name("  Late night  ").unwrap(), "Late night");
        assert!(validate_name("   ").is_err());
        assert!(validate_name("a\u{7}b").is_err());
        assert!(validate_name(&"é".repeat(MAX_NAME_CHARS)).is_ok());
        assert!(validate_name(&"é".repeat(MAX_NAME_CHARS + 1)).is_err());
    }

    #[test]
    fn create_with_tracks_and_list_by_title() {
        let (mut c, ids) = with_tracks(&["Wash", "Bell", "Drone"]);
        let s = c.create_collection(" Quiet ", &ids).unwrap();
        assert_eq!((s.name.as_str(), s.track_count), ("Quiet", 3));
        assert_eq!(
            titles(&c.collection_tracks(&s.id).unwrap()),
            ["Bell", "Drone", "Wash"]
        );
        c.create_collection("ambient", &[]).unwrap();
        let names: Vec<String> = c
            .collections()
            .unwrap()
            .into_iter()
            .map(|s| s.name)
            .collect();
        assert_eq!(names, ["ambient", "Quiet"]);
    }

    #[test]
    fn adding_is_idempotent_and_removing_touches_only_membership() {
        let (mut c, ids) = with_tracks(&["A", "B", "C"]);
        let s = c.create_collection("Mix", &ids[..1]).unwrap();
        let added = c.add_to_collection(&s.id, &ids).unwrap();
        assert_eq!(
            added,
            MembershipChange {
                changed: 2,
                unchanged: 1
            }
        );

        let removed = c
            .remove_from_collection(&s.id, &[ids[1].clone(), "nope".into()])
            .unwrap();
        assert_eq!(
            removed,
            MembershipChange {
                changed: 1,
                unchanged: 1
            }
        );
        assert_eq!(titles(&c.collection_tracks(&s.id).unwrap()), ["A", "C"]);
        assert_eq!(c.tracks().unwrap().len(), 3, "tracks are never deleted");
    }

    #[test]
    fn an_unknown_track_aborts_the_whole_change() {
        let (mut c, ids) = with_tracks(&["A"]);
        let err = c
            .create_collection("X", &[ids[0].clone(), "missing".into()])
            .unwrap_err();
        assert!(matches!(err, CatalogError::NotFound));
        assert_eq!(c.collections().unwrap(), Vec::new());
    }

    #[test]
    fn rename_and_delete_leave_tracks_alone() {
        let (mut c, ids) = with_tracks(&["A", "B"]);
        let s = c.create_collection("Old", &ids).unwrap();
        let r = c.rename_collection(&s.id, "New").unwrap();
        assert_eq!(r.name, "New");
        assert!(r.updated_at_ms >= s.updated_at_ms);
        assert!(c.rename_collection(&s.id, " ").is_err());

        c.delete_collection(&s.id).unwrap();
        assert!(matches!(c.collection(&s.id), Err(CatalogError::NotFound)));
        assert!(matches!(
            c.delete_collection(&s.id),
            Err(CatalogError::NotFound)
        ));
        assert_eq!(c.tracks().unwrap().len(), 2);
    }

    #[test]
    fn deleting_a_track_drops_its_membership() {
        let (mut c, ids) = with_tracks(&["A", "B"]);
        let s = c.create_collection("Mix", &ids).unwrap();
        c.conn
            .execute("DELETE FROM tracks WHERE id = ?1", [&ids[0]])
            .unwrap();
        assert_eq!(c.collection(&s.id).unwrap().track_count, 1);
    }

    #[test]
    fn rejects_oversized_batches() {
        let (mut c, _) = with_tracks(&[]);
        let s = c.create_collection("Big", &[]).unwrap();
        let many = vec!["x".to_owned(); MAX_BATCH + 1];
        assert!(matches!(
            c.add_to_collection(&s.id, &many),
            Err(CatalogError::Invalid(_))
        ));
    }
}
