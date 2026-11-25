// Pixel-column ↔ bucket mapping shared by drawing and the hover readout, so
// the numbers a user reads are exactly the extrema that were drawn.
import type { WaveformView } from "../../ipc/types";
import { formatNumber } from "../../lib/format";

/** The bucket range [start, end) drawn in pixel column `x` of `width`. */
export function columnBuckets(buckets: number, x: number, width: number): [number, number] {
  const start = Math.floor((x / width) * buckets);
  const end = Math.max(start + 1, Math.floor(((x + 1) / width) * buckets));
  return [Math.min(start, buckets), Math.min(end, buckets)];
}

export interface ColumnExtrema {
  min: number;
  max: number;
}

/** Merged extrema for one pixel column, or null if the column has no data. */
export function columnExtrema(view: WaveformView, x: number, width: number): ColumnExtrema | null {
  const [start, end] = columnBuckets(view.min.length, x, width);
  let min = Infinity;
  let max = -Infinity;
  for (let i = start; i < end; i++) {
    min = Math.min(min, view.min[i] ?? Infinity);
    max = Math.max(max, view.max[i] ?? -Infinity);
  }
  return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
}

export interface Readout extends ColumnExtrema {
  timeMs: number;
}

/** What the crosshair reports at pointer column `x`. */
export function readoutAt(view: WaveformView, x: number, width: number): Readout | null {
  if (width <= 0 || x < 0 || x >= width) return null;
  const extrema = columnExtrema(view, Math.floor(x), width);
  if (!extrema) return null;
  return { ...extrema, timeMs: (x / width) * view.durationMs };
}

/** Timecode with tenths: "1:42.3". */
export function formatTimecode(ms: number): string {
  const tenths = Math.max(0, Math.floor(ms / 100));
  const m = Math.floor(tenths / 600);
  const s = Math.floor((tenths % 600) / 10);
  return `${m}:${String(s).padStart(2, "0")}.${tenths % 10}`;
}

/** "1:42.3 · max 0.82 · min −0.79" */
export function formatReadout(r: Readout): string {
  return `${formatTimecode(r.timeMs)} · max ${formatNumber(r.max, 2)} · min ${formatNumber(r.min, 2)}`;
}
