// Atlas filters (PDS §9, SAD "FeatureFilterDto"). Filtering only hides
// points; coordinates and the fitted view are never recomputed (FE-009).
// Tracks without a measurement fail a range on it unless the filter
// explicitly includes unmeasured tracks.

import type { AtlasPoint } from "../../ipc/types";
import { type ColorKey, descriptor } from "./colorBy";

export type RangeKey = Exclude<ColorKey, "uniform">;

export const RANGE_KEYS: readonly RangeKey[] = [
  "centroidHz",
  "integratedLufs",
  "tempoBpm",
  "flatness",
];

/** Units shown beside the range inputs; values are entered in these units. */
export const RANGE_UNITS: Record<RangeKey, string> = {
  centroidHz: "Hz",
  integratedLufs: "LUFS",
  tempoBpm: "BPM",
  flatness: "ratio",
};

export interface Range {
  min: number | null;
  max: number | null;
}

export interface AtlasFilter {
  /** Case-insensitive substring of title or artist. */
  query: string;
  ranges: Partial<Record<RangeKey, Range>>;
  /** Keep tracks that lack a filtered measurement instead of hiding them. */
  includeUnmeasured: boolean;
}

export const NO_FILTER: AtlasFilter = { query: "", ranges: {}, includeUnmeasured: false };

const isSet = (r: Range | undefined): r is Range => !!r && (r.min !== null || r.max !== null);

/** Number of active conditions, for the Filters button badge. */
export function activeCount(f: AtlasFilter): number {
  return (f.query.trim() ? 1 : 0) + RANGE_KEYS.filter((k) => isSet(f.ranges[k])).length;
}

export function matches(p: AtlasPoint, f: AtlasFilter): boolean {
  const q = f.query.trim().toLocaleLowerCase();
  if (q) {
    const hay = `${p.title}\n${p.artist ?? ""}`.toLocaleLowerCase();
    if (!hay.includes(q)) return false;
  }
  for (const key of RANGE_KEYS) {
    const r = f.ranges[key];
    if (!isSet(r)) continue;
    const v = descriptor(key).read(p);
    if (v === null || !Number.isFinite(v)) {
      if (f.includeUnmeasured) continue;
      return false;
    }
    if (r.min !== null && v < r.min) return false;
    if (r.max !== null && v > r.max) return false;
  }
  return true;
}

/** Ids of the points that pass the filter, in snapshot order. */
export function visibleIds(points: readonly AtlasPoint[], f: AtlasFilter): Set<string> {
  return new Set(points.filter((p) => matches(p, f)).map((p) => p.trackId));
}

/**
 * Points hidden only because they lack a filtered measurement. Shown so the
 * count of excluded tracks is explained rather than silent.
 */
export function unmeasuredHidden(points: readonly AtlasPoint[], f: AtlasFilter): number {
  if (f.includeUnmeasured) return 0;
  const keys = RANGE_KEYS.filter((k) => isSet(f.ranges[k]));
  if (keys.length === 0) return 0;
  return points.filter((p) =>
    keys.some((k) => {
      const v = descriptor(k).read(p);
      return v === null || !Number.isFinite(v);
    }),
  ).length;
}

/** Parse a range input: blank is "no bound", anything non-numeric is invalid. */
export function parseBound(text: string): number | null | "invalid" {
  const t = text.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : "invalid";
}
