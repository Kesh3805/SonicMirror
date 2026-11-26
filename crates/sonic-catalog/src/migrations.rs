//! Ordered, embedded schema migrations tracked by `PRAGMA user_version`.

use rusqlite::Connection;

use crate::{CatalogError, Result};

/// Migrations in order. Index `i` upgrades the schema from version `i` to `i + 1`.
const MIGRATIONS: &[&str] = &[
    include_str!("../migrations/0001_initial_schema.sql"),
    include_str!("../migrations/0002_atlas_snapshots.sql"),
    include_str!("../migrations/0003_collections.sql"),
];

/// Latest schema version this build understands.
#[allow(clippy::cast_possible_truncation)] // a handful of migrations, checked at compile time
pub const LATEST: u32 = MIGRATIONS.len() as u32;

pub fn apply(conn: &mut Connection) -> Result<()> {
    let current: u32 = conn.pragma_query_value(None, "user_version", |r| r.get(0))?;
    if current > LATEST {
        return Err(CatalogError::Invalid(
            "catalog was created by a newer version of SonicMirror",
        ));
    }
    for (index, sql) in MIGRATIONS.iter().enumerate().skip(current as usize) {
        let tx = conn.transaction()?;
        tx.execute_batch(sql)?;
        let version =
            u32::try_from(index + 1).map_err(|_| CatalogError::Invalid("migration count"))?;
        tx.pragma_update(None, "user_version", version)?;
        tx.commit()?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn applies_all_migrations_once() {
        let mut conn = Connection::open_in_memory().unwrap();
        apply(&mut conn).unwrap();
        apply(&mut conn).unwrap();
        let version: u32 = conn
            .pragma_query_value(None, "user_version", |r| r.get(0))
            .unwrap();
        assert_eq!(version, LATEST);
    }

    #[test]
    fn refuses_newer_schema() {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.pragma_update(None, "user_version", LATEST + 1)
            .unwrap();
        assert!(matches!(apply(&mut conn), Err(CatalogError::Invalid(_))));
    }
}
