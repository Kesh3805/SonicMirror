import { invoke } from "@tauri-apps/api/core";
import type {
  AppInfo,
  ApplicationError,
  AtlasNeighbour,
  AtlasSnapshot,
  ImportOutcome,
  SpectrogramView,
  StoredAnalysis,
  TrackComparison,
  TrackRecord,
  WaveformView,
} from "./types";

/** Raised when the UI runs outside the Tauri shell (e.g. plain `vite dev`). */
export const NATIVE_UNAVAILABLE: ApplicationError = {
  code: "application.native_unavailable",
  message: "The native runtime is not available. Run the desktop app with `pnpm tauri dev`.",
  recoverable: false,
};

export function isNativeRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function isApplicationError(value: unknown): value is ApplicationError {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ApplicationError).code === "string" &&
    typeof (value as ApplicationError).message === "string"
  );
}

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  // Production never falls back to mock data (PDS §17).
  if (!isNativeRuntime()) throw NATIVE_UNAVAILABLE;
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    if (isApplicationError(error)) throw error;
    throw {
      code: "application.ipc",
      message: "The request could not be completed.",
      recoverable: true,
    } satisfies ApplicationError;
  }
}

export const ipc = {
  appInfo: () => call<AppInfo>("app_info"),
  importFiles: () => call<ImportOutcome[]>("library_import_files"),
  listTracks: () => call<TrackRecord[]>("library_list_tracks"),
  getTrack: (trackId: string) => call<TrackRecord>("library_get_track", { trackId }),
  getAnalysis: (trackId: string) =>
    call<StoredAnalysis | null>("analysis_get_features", { trackId }),
  getWaveform: (trackId: string, targetBuckets: number) =>
    call<WaveformView>("analysis_get_waveform", { trackId, targetBuckets }),
  getSpectrogram: (trackId: string, columns: number, bands: number) =>
    call<SpectrogramView>("analysis_get_spectrogram", { trackId, columns, bands }),
  getAtlas: () => call<AtlasSnapshot>("atlas_get_snapshot"),
  refreshAtlas: () => call<AtlasSnapshot>("atlas_refresh"),
  compare: (leftTrackId: string, rightTrackId: string) =>
    call<TrackComparison>("comparison_get", { leftTrackId, rightTrackId }),
  getNeighbours: (trackId: string, k: number) =>
    call<AtlasNeighbour[]>("atlas_get_neighbors", { trackId, k }),
};
