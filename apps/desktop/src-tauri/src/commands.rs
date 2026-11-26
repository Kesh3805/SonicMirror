//! Typed IPC commands (SAD §29). Each command is a narrow application
//! operation; none exposes generic filesystem or database access.

use std::sync::Arc;
use std::sync::atomic::AtomicBool;

use serde::Serialize;
use sonic_catalog::{StoredAnalysis, TrackRecord};
use sonic_runtime::{
    AtlasNeighbour, AtlasSnapshot, LibraryService, RuntimeError, SpectrogramView, WaveformView,
};
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

/// Extensions offered in the import dialog. Content is still probed; the
/// extension never decides the format.
const AUDIO_EXTENSIONS: &[&str] = &[
    "mp3", "flac", "wav", "wave", "ogg", "oga", "m4a", "mp4", "aif", "aiff",
];

pub type Library = Arc<LibraryService>;

/// IPC error contract. Messages never contain file paths or tag contents.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationError {
    pub code: String,
    pub message: String,
    pub recoverable: bool,
}

impl From<RuntimeError> for ApplicationError {
    fn from(e: RuntimeError) -> Self {
        Self {
            code: e.code().to_owned(),
            message: e.to_string(),
            recoverable: e.recoverable(),
        }
    }
}

impl From<tauri::Error> for ApplicationError {
    fn from(_: tauri::Error) -> Self {
        Self {
            code: "application.internal".into(),
            message: "an internal error occurred".into(),
            recoverable: true,
        }
    }
}

type CommandResult<T> = Result<T, ApplicationError>;

/// Versions shown in Settings › About (SET-003).
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub app: &'static str,
    pub engine: &'static str,
    pub feature_schema: &'static str,
}

#[tauri::command]
pub fn app_info() -> AppInfo {
    AppInfo {
        app: env!("CARGO_PKG_VERSION"),
        engine: sonic_core::analysis::ENGINE_VERSION,
        feature_schema: sonic_core::analysis::FEATURE_SCHEMA_VERSION,
    }
}

/// Outcome of importing one file.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportOutcome {
    /// File name only, never the full path.
    pub file_name: String,
    pub track_id: Option<String>,
    pub error: Option<ApplicationError>,
}

/// Open the native file picker and import the chosen files. Paths come from
/// the operating-system dialog, never from the webview. Returns an empty list
/// when the user cancels.
#[tauri::command]
pub async fn library_import_files(
    app: AppHandle,
    library: State<'_, Library>,
) -> CommandResult<Vec<ImportOutcome>> {
    let library = Arc::clone(&library);
    tauri::async_runtime::spawn_blocking(move || {
        let Some(picked) = app
            .dialog()
            .file()
            .set_title("Import music")
            .add_filter("Audio", AUDIO_EXTENSIONS)
            .blocking_pick_files()
        else {
            return Vec::new();
        };
        let cancelled = AtomicBool::new(false);
        picked
            .into_iter()
            .filter_map(|p| p.into_path().ok())
            .map(|path| {
                let file_name = path
                    .file_name()
                    .map_or_else(String::new, |n| n.to_string_lossy().into_owned());
                match library.import_and_analyze(&path, &cancelled) {
                    Ok(id) => ImportOutcome {
                        file_name,
                        track_id: Some(id),
                        error: None,
                    },
                    Err(e) => ImportOutcome {
                        file_name,
                        track_id: None,
                        error: Some(e.into()),
                    },
                }
            })
            .collect()
    })
    .await
    .map_err(ApplicationError::from)
}

#[tauri::command]
pub async fn library_list_tracks(library: State<'_, Library>) -> CommandResult<Vec<TrackRecord>> {
    let library = Arc::clone(&library);
    blocking(move || library.tracks()).await
}

#[tauri::command]
pub async fn library_get_track(
    library: State<'_, Library>,
    track_id: String,
) -> CommandResult<TrackRecord> {
    let library = Arc::clone(&library);
    blocking(move || library.track(&track_id)).await
}

#[tauri::command]
pub async fn analysis_get_features(
    library: State<'_, Library>,
    track_id: String,
) -> CommandResult<Option<StoredAnalysis>> {
    let library = Arc::clone(&library);
    blocking(move || library.analysis(&track_id)).await
}

#[tauri::command]
pub async fn analysis_get_waveform(
    library: State<'_, Library>,
    track_id: String,
    target_buckets: usize,
) -> CommandResult<WaveformView> {
    let library = Arc::clone(&library);
    blocking(move || library.waveform(&track_id, target_buckets)).await
}

#[tauri::command]
pub async fn analysis_get_spectrogram(
    library: State<'_, Library>,
    track_id: String,
    columns: usize,
    bands: usize,
) -> CommandResult<SpectrogramView> {
    let library = Arc::clone(&library);
    blocking(move || library.spectrogram(&track_id, columns, bands)).await
}

#[tauri::command]
pub async fn atlas_get_snapshot(library: State<'_, Library>) -> CommandResult<AtlasSnapshot> {
    let library = Arc::clone(&library);
    blocking(move || library.atlas()).await
}

/// Recompute the map from current measurements and save it as the new snapshot.
#[tauri::command]
pub async fn atlas_refresh(library: State<'_, Library>) -> CommandResult<AtlasSnapshot> {
    let library = Arc::clone(&library);
    blocking(move || library.refresh_atlas()).await
}

#[tauri::command]
pub async fn atlas_get_neighbors(
    library: State<'_, Library>,
    track_id: String,
    k: usize,
) -> CommandResult<Vec<AtlasNeighbour>> {
    let library = Arc::clone(&library);
    blocking(move || library.atlas_neighbours(&track_id, k)).await
}

/// Run catalog work off the IPC thread so the interface never blocks on disk.
async fn blocking<T: Send + 'static>(
    work: impl FnOnce() -> Result<T, RuntimeError> + Send + 'static,
) -> CommandResult<T> {
    tauri::async_runtime::spawn_blocking(work)
        .await
        .map_err(ApplicationError::from)?
        .map_err(ApplicationError::from)
}
