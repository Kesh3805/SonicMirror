//! Desktop adapter: native IPC commands, events, capabilities and lifecycle.
//!
//! Commands expose narrow application operations, never generic native access.

mod commands;

/// Build and run the Tauri application.
///
/// # Panics
///
/// Panics if the Tauri runtime fails to start.
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![commands::app_info])
        .run(tauri::generate_context!())
        .expect("error while running SonicMirror");
}
