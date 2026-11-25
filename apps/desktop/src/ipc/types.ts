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

export interface SpectrogramView {
  durationMs: number;
  maxHz: number;
  floorDb: number;
  stepDb: number;
  reference: string;
  columns: number;
  bands: number;
  cells: number[];
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

export interface AppInfo {
  app: string;
  engine: string;
  featureSchema: string;
}

export interface AtlasPoint {
  trackId: string;
  title: string;
  artist: string | null;
  x: number;
  y: number;
  centroidHz: number | null;
  integratedLufs: number | null;
  tempoBpm: number | null;
  flatness: number | null;
}

export interface AtlasExclusion {
  trackId: string;
  title: string;
  reason: string;
}

export interface AtlasAxis {
  /** Fraction of variance along this axis, 0..1. */
  explained: number;
  /** Strongest dimensions with signed loadings. */
  top: [string, number][];
}

export interface AtlasSnapshot {
  status: "ready" | "unavailable";
  reason: "too_few_tracks" | "insufficient_variance" | null;
  vectorVersion: string;
  projectionVersion: string;
  minTracks: number;
  total: number;
  points: AtlasPoint[];
  excluded: AtlasExclusion[];
  axes: AtlasAxis[];
}

export interface AtlasNeighbour {
  trackId: string;
  title: string;
  artist: string | null;
  distance: number;
  /** Share of squared distance per feature group, summing to 1. */
  contributions: Record<string, number>;
}
