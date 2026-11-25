// Colour-by descriptors for the Atlas (PDS §14 "Atlas"). The domain is the
// eligible snapshot's min/max, fixed while viewing; tracks without the
// measurement are drawn hollow and counted as Unknown, never as zero.

import type { AtlasPoint } from "../../ipc/types";
import { formatDecibels, formatFrequency, formatRatio, THIN } from "../../lib/format";

export type ColorKey = "uniform" | "centroidHz" | "integratedLufs" | "tempoBpm" | "flatness";

export interface Descriptor {
  key: ColorKey;
  label: string;
  read: (p: AtlasPoint) => number | null;
  format: (v: number) => string;
}

const freq = (v: number) => {
  const f = formatFrequency(v);
  return `${f.value}${THIN}${f.unit}`;
};

export const DESCRIPTORS: readonly Descriptor[] = [
  { key: "uniform", label: "Uniform", read: () => null, format: () => "" },
  { key: "centroidHz", label: "Spectral centroid", read: (p) => p.centroidHz, format: freq },
  {
    key: "integratedLufs",
    label: "Integrated loudness",
    read: (p) => p.integratedLufs,
    format: (v) => `${formatDecibels(v)}${THIN}LUFS`,
  },
  {
    key: "tempoBpm",
    label: "Tempo (estimated)",
    read: (p) => p.tempoBpm,
    format: (v) => `${Math.round(v)}${THIN}BPM`,
  },
  { key: "flatness", label: "Spectral flatness", read: (p) => p.flatness, format: (v) => formatRatio(v) },
];

export function descriptor(key: ColorKey): Descriptor {
  return DESCRIPTORS.find((d) => d.key === key) ?? DESCRIPTORS[0]!;
}

export interface Domain {
  min: number;
  max: number;
  /** Points with the measurement. */
  known: number;
  /** Points without it. */
  unknown: number;
}

/** Min/max over finite values; `null` when no point has the measurement. */
export function domainOf(points: readonly AtlasPoint[], d: Descriptor): Domain | null {
  let min = Infinity;
  let max = -Infinity;
  let known = 0;
  for (const p of points) {
    const v = d.read(p);
    if (v === null || !Number.isFinite(v)) continue;
    known++;
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  if (known === 0) return null;
  return { min, max, known, unknown: points.length - known };
}

/** Position along the ramp; a constant domain maps to the midpoint. */
export function positionIn(v: number, domain: Domain): number {
  if (domain.max === domain.min) return 0.5;
  return Math.max(0, Math.min(1, (v - domain.min) / (domain.max - domain.min)));
}
