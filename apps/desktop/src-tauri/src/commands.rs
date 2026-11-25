use serde::Serialize;

/// Version information shown in Settings › About (SET-003).
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub app_version: &'static str,
    pub level_algorithm_version: &'static str,
}

#[tauri::command]
#[allow(clippy::unnecessary_wraps)]
pub fn app_info() -> AppInfo {
    AppInfo {
        app_version: env!("CARGO_PKG_VERSION"),
        level_algorithm_version: sonic_core::dsp::level::ALGORITHM_VERSION,
    }
}
