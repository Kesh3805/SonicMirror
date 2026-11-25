//! Digital signal processing primitives.
//!
//! All functions operate on mono `f32` PCM in the nominal range `[-1.0, 1.0]`
//! and return explicit unavailable states instead of NaN or infinity.

pub mod kweighting;
pub mod level;
pub mod resample;
pub mod spectral;
pub mod synth;
pub mod waveform;
pub mod window;
