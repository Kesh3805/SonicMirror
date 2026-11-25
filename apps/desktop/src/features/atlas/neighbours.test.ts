import { describe, expect, it } from "vitest";
import { dominantGroup, formatDistance } from "./neighbours";

describe("formatDistance", () => {
  it("shows three significant digits", () => {
    expect(formatDistance(1.23456)).toBe("1.23");
    expect(formatDistance(0.0456789)).toBe("0.0457");
    expect(formatDistance(12.345)).toBe("12.3");
    expect(formatDistance(123.45)).toBe("123");
    expect(formatDistance(0)).toBe("0.00");
  });

  it("never shows NaN", () => {
    expect(formatDistance(Number.NaN)).toBe("—");
  });
});

describe("dominantGroup", () => {
  it("picks the largest share", () => {
    expect(dominantGroup({ Timbre: 0.2, Dynamics: 0.7, "Spectral texture": 0.1 })).toEqual({
      label: "Dynamics",
      share: 0.7,
    });
  });

  it("is null for identical tracks", () => {
    expect(dominantGroup({})).toBeNull();
  });
});
