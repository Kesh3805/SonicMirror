//! Desktop adapter: native IPC commands, events, capabilities and lifecycle.
//!
//! Commands expose narrow application operations, never generic native access.

mod commands;

use std::sync::Arc;

use sonic_runtime::LibraryService;
use tauri::Manager;

/// Build and run the Tauri application.
///
/// # Panics
///
/// Panics if the Tauri runtime fails to start.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app.path().app_local_data_dir()?;
            let library = LibraryService::open(&data_dir)?;
            app.manage::<commands::Library>(Arc::new(library));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::app_info,
            commands::library_import_files,
            commands::library_list_tracks,
            commands::library_get_track,
            commands::analysis_get_features,
            commands::analysis_get_waveform,
            commands::analysis_get_spectrogram,
            commands::atlas_get_snapshot,
            commands::atlas_refresh,
            commands::atlas_get_neighbors,
        ])
        .run(tauri::generate_context!())
        .expect("error while running SonicMirror");
}
