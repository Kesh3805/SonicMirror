//! Persistent catalog for SonicMirror: SQLite repositories, ordered
//! migrations and the on-disk analysis artifact cache (ADR-004).

mod analysis;
pub mod artifacts;
mod atlas;
mod collections;
mod migrations;
mod tracks;

use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::Connection;

pub use analysis::{NewAnalysis, StoredAnalysis};
pub use atlas::{KEPT_SNAPSHOTS, NewAtlasSnapshot, SnapshotPoint, StoredAtlasSnapshot};
pub use collections::{
    CollectionSummary, MAX_BATCH, MAX_NAME_CHARS, MembershipChange, validate_name,
};
pub use tracks::{NewTrack, TrackRecord};

#[derive(Debug, thiserror::Error)]
pub enum CatalogError {
    #[error("database error")]
    Database(#[from] rusqlite::Error),
    #[error("stored data is invalid: {0}")]
    Invalid(&'static str),
    #[error("not found")]
    NotFound,
    #[error("artifact storage failed")]
    Artifact(#[from] std::io::Error),
}

impl CatalogError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Database(_) => "catalog.database",
            Self::Invalid(_) => "catalog.invalid",
            Self::NotFound => "catalog.not_found",
            Self::Artifact(_) => "catalog.artifact",
        }
    }
}

pub type Result<T> = std::result::Result<T, CatalogError>;

/// An open catalog database.
#[derive(Debug)]
pub struct Catalog {
    conn: Connection,
}

impl Catalog {
    /// Open (creating if necessary) the catalog at `path` and apply pending
    /// migrations.
    ///
    /// # Errors
    ///
    /// Fails if the database cannot be opened or a migration fails.
    pub fn open(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        Self::init(conn)
    }

    /// An empty in-memory catalog, for tests.
    ///
    /// # Errors
    ///
    /// Fails if SQLite cannot allocate the database.
    pub fn open_in_memory() -> Result<Self> {
        Self::init(Connection::open_in_memory()?)
    }

    fn init(mut conn: Connection) -> Result<Self> {
        conn.pragma_update(None, "foreign_keys", "ON")?;
        conn.busy_timeout(std::time::Duration::from_secs(5))?;
        migrations::apply(&mut conn)?;
        Ok(Self { conn })
    }

    /// Current schema version (`PRAGMA user_version`).
    ///
    /// # Errors
    ///
    /// Fails on a database error.
    pub fn schema_version(&self) -> Result<u32> {
        Ok(self
            .conn
            .pragma_query_value(None, "user_version", |r| r.get(0))?)
    }
}

pub(crate) fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| i64::try_from(d.as_millis()).unwrap_or(i64::MAX))
}
