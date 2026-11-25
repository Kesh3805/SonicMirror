//! Application runtime for SonicMirror: services that coordinate analysis,
//! persistence and playback, plus the persistent background job scheduler.

pub mod library;

pub use library::{LibraryService, RuntimeError, SpectrogramView, WaveformView};
