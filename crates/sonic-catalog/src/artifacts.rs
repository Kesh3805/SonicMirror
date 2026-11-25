//! Regenerable analysis artifacts stored as files outside SQLite (ADR-004).
//!
//! Paths are derived from the analysis cache key, never from user input, and
//! every read re-validates the stored relative path so a tampered database row
//! cannot point outside the cache directory.

use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

use sonic_core::domain::ContentDigest;

/// Kinds of artifact the cache can hold.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ArtifactKind {
    Waveform,
}

impl ArtifactKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Waveform => "waveform",
        }
    }

    fn extension(self) -> &'static str {
        match self {
            Self::Waveform => "smwf",
        }
    }
}

/// A written artifact, ready to be recorded in the catalog.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoredArtifact {
    pub kind: ArtifactKind,
    pub relative_path: String,
    pub content_hash: ContentDigest,
    pub size_bytes: u64,
}

/// Content-addressed artifact directory.
#[derive(Debug, Clone)]
pub struct ArtifactStore {
    root: PathBuf,
}

impl ArtifactStore {
    /// # Errors
    ///
    /// Fails if the directory cannot be created.
    pub fn open(root: impl Into<PathBuf>) -> std::io::Result<Self> {
        let root = root.into();
        fs::create_dir_all(&root)?;
        Ok(Self { root })
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    /// Atomically write an artifact for `cache_key` (64 hex chars).
    ///
    /// # Errors
    ///
    /// Fails on an invalid cache key or an I/O error.
    pub fn write(
        &self,
        kind: ArtifactKind,
        cache_key: &str,
        bytes: &[u8],
    ) -> std::io::Result<StoredArtifact> {
        if ContentDigest::parse(cache_key).is_none() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "invalid cache key",
            ));
        }
        let relative = format!(
            "{}/{}/{}.{}",
            kind.as_str(),
            &cache_key[..2],
            cache_key,
            kind.extension()
        );
        let target = self.root.join(&relative);
        let dir = self.root.join(kind.as_str()).join(&cache_key[..2]);
        fs::create_dir_all(&dir)?;

        let tmp = dir.join(format!(".{cache_key}.tmp"));
        {
            let mut file = fs::File::create(&tmp)?;
            file.write_all(bytes)?;
            file.sync_all()?;
        }
        fs::rename(&tmp, &target)?;

        Ok(StoredArtifact {
            kind,
            relative_path: relative,
            content_hash: ContentDigest::of_bytes(bytes),
            size_bytes: bytes.len() as u64,
        })
    }

    /// Read an artifact by the relative path recorded in the catalog.
    ///
    /// # Errors
    ///
    /// Rejects paths that were not produced by [`Self::write`], and propagates
    /// I/O errors (for example when the cache was cleared).
    pub fn read(&self, relative_path: &str) -> std::io::Result<Vec<u8>> {
        if !is_generated_path(relative_path) {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "artifact path is not a cache path",
            ));
        }
        fs::read(self.root.join(relative_path))
    }
}

/// `kind/xx/<64 hex>.ext` and nothing else.
fn is_generated_path(path: &str) -> bool {
    let parts: Vec<&str> = path.split('/').collect();
    let [kind, prefix, file] = parts.as_slice() else {
        return false;
    };
    let Some((stem, ext)) = file.split_once('.') else {
        return false;
    };
    let kind_ok = [ArtifactKind::Waveform]
        .iter()
        .any(|k| k.as_str() == *kind && k.extension() == ext);
    kind_ok && ContentDigest::parse(stem).is_some() && stem.starts_with(prefix) && prefix.len() == 2
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_store(name: &str) -> ArtifactStore {
        let dir =
            std::env::temp_dir().join(format!("sonicmirror-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        ArtifactStore::open(dir).unwrap()
    }

    #[test]
    fn write_then_read() {
        let store = temp_store("rw");
        let key = ContentDigest::of_bytes(b"k").to_string();
        let stored = store
            .write(ArtifactKind::Waveform, &key, b"payload")
            .unwrap();
        assert_eq!(stored.size_bytes, 7);
        assert!(stored.relative_path.starts_with("waveform/"));
        assert_eq!(store.read(&stored.relative_path).unwrap(), b"payload");
        let _ = fs::remove_dir_all(store.root());
    }

    #[test]
    fn rejects_paths_outside_the_cache() {
        let store = temp_store("trav");
        for bad in [
            "../secrets.txt",
            "waveform/../../etc/passwd",
            "C:/Windows/win.ini",
            "waveform/ab/notahash.smwf",
        ] {
            assert!(store.read(bad).is_err(), "{bad}");
        }
        let _ = fs::remove_dir_all(store.root());
    }

    #[test]
    fn rejects_invalid_cache_key() {
        let store = temp_store("key");
        assert!(store.write(ArtifactKind::Waveform, "../x", b"").is_err());
        let _ = fs::remove_dir_all(store.root());
    }
}
