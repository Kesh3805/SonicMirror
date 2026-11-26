// Comparison formatting (PDS §10): raw units, aligned mono, B − A signed.
// Differences of loudness in LUFS are stated in LU, the unit of a loudness
// difference; level differences in dBFS are stated in dB.

import type { ComparisonMeasurement } from "../../ipc/types";
import { THIN, UNKNOWN, formatNumber } from "../../lib/format";
import {
  FEATURE_CATALOG,
  type FeatureGroup,
  type FeatureInfo,
  GROUP_ORDER,
} from "../observatory/featureCatalog";

export interface Shown {
  value: string;
  unit: string;
}

const PLUS = "+";

const FALLBACK: FeatureInfo = {
  label: "",
  group: "Technical",
  format: "ratio",
  explanation: "",
};

export function infoFor(key: string): FeatureInfo {
  return FEATURE_CATALOG[key] ?? { ...FALLBACK, label: key.replaceAll("_", " ") };
}

/** Decimals per format, matching the Observatory's fixed precision. */
const DECIMALS: Record<FeatureInfo["format"], number> = {
  decibels: 1,
  frequency: 0,
  ratio: 3,
  seconds: 1,
  count: 0,
  bpm: 1,
  sampleRate: 0,
  vector: 2,
};

function unitFor(info: FeatureInfo, unit: string | null, difference: boolean): string {
  switch (info.format) {
    case "decibels":
      if (difference) return unit === "LUFS" ? "LU" : "dB";
      return unit ?? "dB";
    case "frequency":
    case "sampleRate":
      return "Hz";
    case "seconds":
      return "s";
    case "bpm":
      return "BPM";
    default:
      return unit && unit !== "ratio" ? unit : "";
  }
}

/** A raw measurement in its own unit. Vectors show their length. */
export function formatValue(m: ComparisonMeasurement, value: number | number[] | null): Shown {
  if (value === null) return { value: UNKNOWN, unit: "" };
  if (Array.isArray(value)) return { value: String(value.length), unit: "coefficients" };
  const info = infoFor(m.featureKey);
  return {
    value: formatNumber(value, DECIMALS[info.format]),
    unit: unitFor(info, m.unit, false),
  };
}

/** `B − A`, always signed so the direction is never implied by colour alone. */
export function formatDifference(m: ComparisonMeasurement): Shown | null {
  const d = m.difference;
  if (d === null || Array.isArray(d)) return null;
  const info = infoFor(m.featureKey);
  const body = formatNumber(d, DECIMALS[info.format]);
  const zero = Number(Math.abs(d).toFixed(DECIMALS[info.format])) === 0;
  return {
    value: zero ? body : d > 0 ? `${PLUS}${body}` : body,
    unit: unitFor(info, m.unit, true),
  };
}

export const joinUnit = (s: Shown) => (s.unit ? `${s.value}${THIN}${s.unit}` : s.value);

export interface RowGroup {
  group: FeatureGroup;
  rows: ComparisonMeasurement[];
}

/** Rows by feature domain in the Observatory's order; unknown keys go last. */
export function groupRows(measurements: readonly ComparisonMeasurement[]): RowGroup[] {
  return GROUP_ORDER.map((group) => ({
    group,
    rows: measurements.filter((m) => infoFor(m.featureKey).group === group),
  })).filter((g) => g.rows.length > 0);
}
