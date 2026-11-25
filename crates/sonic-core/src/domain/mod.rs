//! Domain types shared across the engine, catalog and runtime.

mod feature;
mod identity;

pub use feature::{AudioFeature, FeatureStatus, FeatureValue};
pub use identity::{CACHE_KEY_FORMAT_VERSION, ContentDigest, cache_key};
