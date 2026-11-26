import { describe, expect, it } from "vitest";
import type { ComparisonMeasurement } from "../../ipc/types";
import { THIN } from "../../lib/format";
import { formatDifference, formatValue, groupRows, joinUnit } from "./format";

/** Expected text with thin spaces, as the formatter writes them. */
const t = (s: string) => s.replaceAll(" ", THIN);

const m = (over: Partial<ComparisonMeasurement>): ComparisonMeasurement => ({
  featureKey: "spectral_centroid_mean",
  unit: "Hz",
  leftValue: null,
  rightValue: null,
  difference: null,
  leftStatus: "valid",
  rightStatus: "valid",
  leftDiagnostic: null,
  rightDiagnostic: null,
  incompatible: null,
  ...over,
});

describe("comparison formatting", () => {
  it("shows raw values in their own unit", () => {
    expect(joinUnit(formatValue(m({}), 1834.6))).toBe(t("1 835 Hz"));
    const lufs = m({ featureKey: "integrated_loudness", unit: "LUFS" });
    expect(joinUnit(formatValue(lufs, -14.04))).toBe(t("−14.0 LUFS"));
    expect(formatValue(m({}), null).value).toBe("—");
    expect(joinUnit(formatValue(m({ featureKey: "mfcc_mean" }), [1, 2, 3]))).toBe(t("3 coefficients"));
  });

  it("signs every non-zero difference and states loudness differences in LU", () => {
    expect(joinUnit(formatDifference(m({ difference: 900 }))!)).toBe(t("+900 Hz"));
    expect(joinUnit(formatDifference(m({ difference: -12.4 }))!)).toBe(t("−12 Hz"));
    expect(joinUnit(formatDifference(m({ difference: 0.2 }))!)).toBe(t("0 Hz"));
    const lufs = m({ featureKey: "integrated_loudness", unit: "LUFS", difference: 2.5 });
    expect(joinUnit(formatDifference(lufs)!)).toBe(t("+2.5 LU"));
    const rms = m({ featureKey: "rms_dbfs", unit: "dBFS", difference: -3 });
    expect(joinUnit(formatDifference(rms)!)).toBe(t("−3.0 dB"));
    const lra = m({ featureKey: "loudness_range", unit: "LU", difference: 0.4 });
    expect(joinUnit(formatDifference(lra)!)).toBe(t("+0.4 LU"));
  });

  it("has no scalar difference for vectors or missing values", () => {
    expect(formatDifference(m({ difference: null }))).toBeNull();
    expect(formatDifference(m({ featureKey: "mfcc_mean", difference: [1, -1] }))).toBeNull();
  });

  it("groups rows by domain in the Observatory order", () => {
    const groups = groupRows([
      m({ featureKey: "tempo_bpm" }),
      m({ featureKey: "integrated_loudness" }),
      m({ featureKey: "spectral_flux_mean" }),
      m({ featureKey: "new_feature" }),
    ]);
    expect(groups.map((g) => [g.group, g.rows.map((r) => r.featureKey)])).toEqual([
      ["Levels", ["integrated_loudness"]],
      ["Spectrum", ["spectral_flux_mean"]],
      ["Rhythm", ["tempo_bpm"]],
      ["Technical", ["new_feature"]],
    ]);
  });
});
