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

/** How the catalog has moved on since a saved map was made. */
export interface AtlasChanges {
  added: number;
  changed: number;
  removed: number;
}

export interface AtlasSnapshot {
  status: "ready" | "unavailable";
  reason: "too_few_tracks" | "insufficient_variance" | null;
  /** Saved snapshot id and time; null for a map that was not saved. */
  snapshotId: string | null;
  createdAtMs: number | null;
  /** Coordinates predate the current catalog or engine. */
  stale: boolean;
  changes: AtlasChanges;
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

/** One side of a comparison (SAD §46). */
export interface ComparisonSide {
  trackId: string;
  title: string;
  artist: string | null;
  analyzed: boolean;
  engineVersion: string | null;
  featureSchemaVersion: string | null;
}

export type ComparisonStatus = FeatureStatus | "missing";

export interface ComparisonMeasurement {
  featureKey: string;
  unit: string | null;
  leftValue: number | number[] | null;
  rightValue: number | number[] | null;
  /** `right − left`; null when either side is invalid or they are not comparable. */
  difference: number | number[] | null;
  leftStatus: ComparisonStatus;
  rightStatus: ComparisonStatus;
  leftDiagnostic: string | null;
  rightDiagnostic: string | null;
  incompatible: string | null;
}

export interface SimilarityContext {
  vectorVersion: string;
  normalization: string;
  referenceTracks: number;
}

export interface TrackComparison {
  left: ComparisonSide;
  right: ComparisonSide;
  measurements: ComparisonMeasurement[];
  distance: number | null;
  contributions: Record<string, number>;
  modelContext: SimilarityContext | null;
  limitations: string[];
}
