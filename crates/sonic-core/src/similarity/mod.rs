//! Acoustic similarity and the Sonic Atlas projection (ADR-010).
//!
//! An interpretable baseline: robust per-dimension normalization, a
//! group-weighted Euclidean distance computed in the original space, exact
//! nearest neighbours, and a deterministic PCA projection for display.
//! Proximity on the 2D map is approximate; neighbours are not read from it.

pub mod distance;
pub mod projection;
pub mod vector;

pub use distance::{Neighbour, contributions, distance, nearest};
pub use projection::{Axis, MIN_POINTS, PROJECTION_VERSION, Projection, project};
pub use vector::{DIMENSIONS, Group, Normalizer, VECTOR_VERSION, raw_vector};
