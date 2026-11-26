//! Application runtime for SonicMirror: services that coordinate analysis,
//! persistence and playback, plus the persistent background job scheduler.

pub mod atlas;
pub mod comparison;
pub mod library;

pub use atlas::{AtlasNeighbour, AtlasSnapshot};
pub use comparison::TrackComparison;
pub use library::{LibraryService, RuntimeError, SpectrogramView, WaveformView};
