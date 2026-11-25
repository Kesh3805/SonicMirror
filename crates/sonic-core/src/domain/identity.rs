//! Content identity and analysis cache keys (ADR-006).

use std::io::Read;

use serde::{Deserialize, Serialize};

/// Version of the cache-key encoding. Bump if the field layout changes.
pub const CACHE_KEY_FORMAT_VERSION: u8 = 1;

/// BLAKE3 digest of a file's bytes, rendered as 64 lowercase hex characters.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct ContentDigest(String);

impl ContentDigest {
    /// Hash a reader to the end in bounded memory.
    ///
    /// # Errors
    ///
    /// Propagates read errors.
    pub fn of_reader(mut reader: impl Read) -> std::io::Result<Self> {
        let mut hasher = blake3::Hasher::new();
        let mut buf = vec![0u8; 64 * 1024];
        loop {
            let n = reader.read(&mut buf)?;
            if n == 0 {
                break;
            }
            hasher.update(&buf[..n]);
        }
        Ok(Self(hasher.finalize().to_hex().to_string()))
    }

    pub fn of_bytes(bytes: &[u8]) -> Self {
        Self(blake3::hash(bytes).to_hex().to_string())
    }

    /// Accept a stored digest. Returns `None` unless it is 64 hex characters.
    pub fn parse(hex: &str) -> Option<Self> {
        (hex.len() == 64 && hex.bytes().all(|b| b.is_ascii_hexdigit()))
            .then(|| Self(hex.to_ascii_lowercase()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl std::fmt::Display for ContentDigest {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

/// `K = H(format ‖ D_audio ‖ V_engine ‖ V_schema ‖ C)`.
///
/// Every field is length-prefixed so no two distinct inputs share an encoding.
pub fn cache_key(
    content: &ContentDigest,
    engine_version: &str,
    feature_schema_version: &str,
    canonical_config: &str,
) -> String {
    let mut hasher = blake3::Hasher::new();
    hasher.update(&[CACHE_KEY_FORMAT_VERSION]);
    for field in [
        content.as_str(),
        engine_version,
        feature_schema_version,
        canonical_config,
    ] {
        hasher.update(&(field.len() as u64).to_le_bytes());
        hasher.update(field.as_bytes());
    }
    hasher.finalize().to_hex().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn digest_matches_streaming_and_one_shot() {
        let data = vec![7u8; 200_000];
        let a = ContentDigest::of_reader(&data[..]).unwrap();
        assert_eq!(a, ContentDigest::of_bytes(&data));
        assert_eq!(a.as_str().len(), 64);
        assert_ne!(a, ContentDigest::of_bytes(&data[1..]));
    }

    #[test]
    fn parse_validates_hex() {
        let d = ContentDigest::of_bytes(b"x");
        assert_eq!(ContentDigest::parse(d.as_str()), Some(d));
        assert_eq!(ContentDigest::parse("abc"), None);
        assert_eq!(ContentDigest::parse(&"g".repeat(64)), None);
    }

    #[test]
    fn cache_key_changes_with_every_field() {
        let d = ContentDigest::of_bytes(b"audio");
        let base = cache_key(&d, "e1", "s1", "{}");
        assert_eq!(base.len(), 64);
        assert_eq!(base, cache_key(&d, "e1", "s1", "{}"));
        assert_ne!(
            base,
            cache_key(&ContentDigest::of_bytes(b"other"), "e1", "s1", "{}")
        );
        assert_ne!(base, cache_key(&d, "e2", "s1", "{}"));
        assert_ne!(base, cache_key(&d, "e1", "s2", "{}"));
        assert_ne!(base, cache_key(&d, "e1", "s1", "{ }"));
        // Length prefixes prevent field-boundary collisions.
        assert_ne!(cache_key(&d, "ab", "c", ""), cache_key(&d, "a", "bc", ""));
    }
}
