import { describe, expect, it } from "vitest";
import type { AtlasPoint } from "../../ipc/types";
import { THIN } from "../../lib/format";
import { descriptor, domainOf, positionIn } from "./colorBy";

const point = (id: string, tempoBpm: number | null, centroidHz = 1000): AtlasPoint => ({
  trackId: id,
  title: id,
  artist: null,
  x: 0,
  y: 0,
  centroidHz,
  integratedLufs: -14,
  tempoBpm,
  flatness: 0.1,
});

describe("domainOf", () => {
  it("uses measured values only and counts the rest as unknown", () => {
    const d = domainOf([point("a", 90), point("b", null), point("c", 130)], descriptor("tempoBpm"));
    expect(d).toEqual({ min: 90, max: 130, known: 2, unknown: 1 });
  });

  it("is null when nothing was measured", () => {
    expect(domainOf([point("a", null)], descriptor("tempoBpm"))).toBeNull();
  });
});

describe("positionIn", () => {
  it("maps linearly and clamps", () => {
    const d = { min: 100, max: 200, known: 2, unknown: 0 };
    expect(positionIn(150, d)).toBe(0.5);
    expect(positionIn(300, d)).toBe(1);
  });

  it("maps a constant domain to the midpoint", () => {
    expect(positionIn(5, { min: 5, max: 5, known: 3, unknown: 0 })).toBe(0.5);
  });
});

describe("descriptors", () => {
  it("format with units", () => {
    expect(descriptor("centroidHz").format(1840)).toBe(`1.84${THIN}kHz`);
    expect(descriptor("tempoBpm").format(117.6)).toBe(`118${THIN}BPM`);
    expect(descriptor("integratedLufs").format(-14.04)).toBe(`−14.0${THIN}LUFS`);
  });

  it("falls back to uniform for an unknown key", () => {
    expect(descriptor("nope" as never).key).toBe("uniform");
  });
});
