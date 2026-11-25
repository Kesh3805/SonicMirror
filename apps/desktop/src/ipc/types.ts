// IPC data contracts mirroring the Rust DTOs (camelCase serde).
// TODO(E05): replace with generated bindings once the IPC spike lands.

export type FeatureStatus = "valid" | "unavailable" | "failed";

export interface AudioFeature {
  key: string;
  value: number | number[] | null;
  unit: string | null;
  status: FeatureStatus;
  algorithmVersion: string;
  confidence?: number;
  diagnosticCode?: string;
}

export interface TrackRecord {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  genre: string | null;
  releaseYear: number | null;
  durationMs: number | null;
  sampleRateHz: number | null;
  channelCount: number | null;
  codec: string | null;
  availability: "available" | "missing" | "inaccessible" | "unsupported" | "corrupt";
  createdAtMs: number;
}

export interface StoredAnalysis {
  analysisId: string;
  engineVersion: string;
  featureSchemaVersion: string;
  status: "complete" | "partial" | "failed";
  completedAtMs: number;
  features: AudioFeature[];
}

export interface WaveformView {
  durationMs: number;
  bucketDurationMs: number;
  min: number[];
  max: number[];
}

export interface ApplicationError {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface ImportOutcome {
  fileName: string;
  trackId: string | null;
  error: ApplicationError | null;
}
