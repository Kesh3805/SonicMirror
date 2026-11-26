//! Track repository.

use std::path::{Path, PathBuf};

use rusqlite::{OptionalExtension, Row, params};
use serde::Serialize;
use sonic_core::domain::ContentDigest;
use sonic_core::media::metadata::TrackMetadata;

use crate::{Catalog, CatalogError, Result, now_ms};

/// A file being added to, or refreshed in, the catalog.
#[derive(Debug, Clone)]
pub struct NewTrack {
    pub path: PathBuf,
    pub size_bytes: u64,
    pub modified_at_ms: Option<i64>,
    pub content_hash: ContentDigest,
    pub metadata: TrackMetadata,
    pub duration_ms: Option<u64>,
    pub sample_rate_hz: Option<u32>,
    pub channel_count: Option<u16>,
    pub codec: Option<String>,
}

/// A catalog track as exposed to the application.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackRecord {
    pub id: String,
    pub title: String,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub genre: Option<String>,
    pub release_year: Option<u32>,
    pub duration_ms: Option<u64>,
    pub sample_rate_hz: Option<u32>,
    pub channel_count: Option<u16>,
    pub codec: Option<String>,
    pub availability: String,
    #[serde(skip)]
    pub path: PathBuf,
    #[serde(skip)]
    pub content_hash: Option<String>,
    pub created_at_ms: i64,
}

pub(crate) const TRACK_COLUMNS: &str = "id, title, artist_display, album_display, genre, release_year, \
     duration_ms, sample_rate_hz, channel_count, codec, availability, path_display, \
     content_hash, created_at_ms";

pub(crate) fn track_from_row(row: &Row<'_>) -> rusqlite::Result<TrackRecord> {
    Ok(TrackRecord {
        id: row.get(0)?,
        title: row.get(1)?,
        artist: row.get(2)?,
        album: row.get(3)?,
        genre: row.get(4)?,
        release_year: row.get(5)?,
        duration_ms: row
            .get::<_, Option<i64>>(6)?
            .and_then(|d| u64::try_from(d).ok()),
        sample_rate_hz: row.get(7)?,
        channel_count: row.get(8)?,
        codec: row.get(9)?,
        availability: row.get(10)?,
        path: PathBuf::from(row.get::<_, String>(11)?),
        content_hash: row.get(12)?,
        created_at_ms: row.get(13)?,
    })
}

/// Case-insensitive identity key on Windows, exact elsewhere.
fn path_key(path: &Path) -> Vec<u8> {
    let display = path.to_string_lossy();
    if cfg!(windows) {
        display.to_lowercase().into_bytes()
    } else {
        display.into_owned().into_bytes()
    }
}

fn title_for(new: &NewTrack) -> String {
    new.metadata.title.clone().unwrap_or_else(|| {
        new.path.file_stem().map_or_else(
            || "Untitled".to_owned(),
            |s| s.to_string_lossy().into_owned(),
        )
    })
}

impl Catalog {
    /// Insert a track, or refresh it if the same path is already catalogued.
    /// Importing the same file twice never creates a duplicate entry.
    /// Returns the track id.
    ///
    /// # Errors
    ///
    /// Fails on a database error.
    pub fn upsert_track(&mut self, new: &NewTrack) -> Result<String> {
        let now = now_ms();
        let key = path_key(&new.path);
        let display = new.path.to_string_lossy().into_owned();
        let existing: Option<(String, Option<String>)> = self
            .conn
            .query_row(
                "SELECT id, content_hash FROM tracks WHERE path_key = ?1",
                [&key],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .optional()?;

        let size = i64::try_from(new.size_bytes).map_err(|_| CatalogError::Invalid("file size"))?;
        let duration = new.duration_ms.and_then(|d| i64::try_from(d).ok());
        let m = &new.metadata;

        if let Some((id, old_hash)) = existing {
            let changed = old_hash.as_deref() != Some(new.content_hash.as_str());
            self.conn.execute(
                "UPDATE tracks SET path_native = ?2, path_display = ?3, content_hash = ?4,
                    size_bytes = ?5, modified_at_ms = ?6,
                    content_revision = content_revision + ?7,
                    title = ?8, artist_display = ?9, album_display = ?10, genre = ?11,
                    release_year = ?12, duration_ms = ?13, sample_rate_hz = ?14,
                    channel_count = ?15, codec = ?16, availability = 'available',
                    diagnostic_code = NULL, updated_at_ms = ?17
                 WHERE id = ?1",
                params![
                    id,
                    display.as_bytes(),
                    display,
                    new.content_hash.as_str(),
                    size,
                    new.modified_at_ms,
                    i64::from(changed),
                    title_for(new),
                    m.artist,
                    m.album,
                    m.genre,
                    m.year,
                    duration,
                    new.sample_rate_hz,
                    new.channel_count,
                    new.codec,
                    now
                ],
            )?;
            return Ok(id);
        }

        let id = uuid::Uuid::now_v7().to_string();
        self.conn.execute(
            "INSERT INTO tracks (id, path_native, path_display, path_key, content_hash,
                size_bytes, modified_at_ms, title, artist_display, album_display, genre,
                release_year, duration_ms, sample_rate_hz, channel_count, codec,
                availability, created_at_ms, updated_at_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16,
                'available', ?17, ?17)",
            params![
                id,
                display.as_bytes(),
                display,
                key,
                new.content_hash.as_str(),
                size,
                new.modified_at_ms,
                title_for(new),
                m.artist,
                m.album,
                m.genre,
                m.year,
                duration,
                new.sample_rate_hz,
                new.channel_count,
                new.codec,
                now
            ],
        )?;
        Ok(id)
    }

    /// # Errors
    ///
    /// Returns [`CatalogError::NotFound`] for an unknown id.
    pub fn track(&self, id: &str) -> Result<TrackRecord> {
        self.conn
            .query_row(
                &format!("SELECT {TRACK_COLUMNS} FROM tracks WHERE id = ?1"),
                [id],
                track_from_row,
            )
            .optional()?
            .ok_or(CatalogError::NotFound)
    }

    /// All tracks ordered by title, then id for a stable tie-break.
    ///
    /// # Errors
    ///
    /// Fails on a database error.
    pub fn tracks(&self) -> Result<Vec<TrackRecord>> {
        let mut stmt = self.conn.prepare(&format!(
            "SELECT {TRACK_COLUMNS} FROM tracks ORDER BY title COLLATE NOCASE, id"
        ))?;
        let rows = stmt.query_map([], track_from_row)?;
        Ok(rows.collect::<rusqlite::Result<_>>()?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    pub(crate) fn sample(path: &str, bytes: &[u8]) -> NewTrack {
        NewTrack {
            path: PathBuf::from(path),
            size_bytes: bytes.len() as u64,
            modified_at_ms: Some(1),
            content_hash: ContentDigest::of_bytes(bytes),
            metadata: TrackMetadata::default(),
            duration_ms: Some(1000),
            sample_rate_hz: Some(44_100),
            channel_count: Some(2),
            codec: Some("pcm_s16le".into()),
        }
    }

    #[test]
    fn insert_and_read_back() {
        let mut c = Catalog::open_in_memory().unwrap();
        let id = c
            .upsert_track(&sample("C:/music/Night Drive.flac", b"a"))
            .unwrap();
        let t = c.track(&id).unwrap();
        assert_eq!(t.title, "Night Drive", "falls back to the file name");
        assert_eq!(t.availability, "available");
        assert_eq!(t.channel_count, Some(2));
    }

    #[test]
    fn importing_twice_does_not_duplicate() {
        let mut c = Catalog::open_in_memory().unwrap();
        let a = c.upsert_track(&sample("/m/a.wav", b"x")).unwrap();
        let b = c.upsert_track(&sample("/m/a.wav", b"x")).unwrap();
        assert_eq!(a, b);
        assert_eq!(c.tracks().unwrap().len(), 1);
    }

    #[test]
    fn tag_title_wins_over_file_name() {
        let mut c = Catalog::open_in_memory().unwrap();
        let mut t = sample("/m/01.mp3", b"x");
        t.metadata.title = Some("Real Title".into());
        let id = c.upsert_track(&t).unwrap();
        assert_eq!(c.track(&id).unwrap().title, "Real Title");
    }

    #[test]
    fn unknown_track_is_not_found() {
        let c = Catalog::open_in_memory().unwrap();
        assert!(matches!(c.track("nope"), Err(CatalogError::NotFound)));
    }

    #[test]
    fn list_is_sorted_by_title() {
        let mut c = Catalog::open_in_memory().unwrap();
        c.upsert_track(&sample("/m/b.wav", b"1")).unwrap();
        c.upsert_track(&sample("/m/A.wav", b"2")).unwrap();
        let titles: Vec<String> = c.tracks().unwrap().into_iter().map(|t| t.title).collect();
        assert_eq!(titles, vec!["A", "b"]);
    }
}
