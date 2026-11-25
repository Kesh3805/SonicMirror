import { describe, expect, it } from "vitest";
import { FIT_PADDING, MAX_ZOOM, MIN_ZOOM, RESET, fit, hitTest, toScreen, zoomAt } from "./viewport";

const size = { width: 400, height: 300 };
const points = [
  { x: -1, y: -1 },
  { x: 1, y: 1 },
  { x: 0, y: 0.5 },
];

describe("fit", () => {
  it("keeps every point inside the padding and preserves aspect ratio", () => {
    const f = fit(points, size);
    for (const p of points) {
      const s = toScreen(p, f, RESET, size);
      expect(s.x).toBeGreaterThanOrEqual(FIT_PADDING - 1e-9);
      expect(s.x).toBeLessThanOrEqual(size.width - FIT_PADDING + 1e-9);
      expect(s.y).toBeGreaterThanOrEqual(FIT_PADDING - 1e-9);
      expect(s.y).toBeLessThanOrEqual(size.height - FIT_PADDING + 1e-9);
    }
    // The vertical span is the limiting one: (300 − 64) / 2.
    expect(f.scale).toBeCloseTo(118);
  });

  it("puts PC2 up", () => {
    const f = fit(points, size);
    const low = toScreen({ x: 0, y: -1 }, f, RESET, size);
    const high = toScreen({ x: 0, y: 1 }, f, RESET, size);
    expect(high.y).toBeLessThan(low.y);
  });

  it("handles a single point or a collinear set", () => {
    expect(fit([{ x: 2, y: 3 }], size)).toEqual({ scale: 1, cx: 2, cy: 3 });
    expect(fit([{ x: 0, y: 1 }, { x: 4, y: 1 }], size).scale).toBeCloseTo(84);
  });
});

describe("zoomAt", () => {
  it("keeps the anchored point under the pointer", () => {
    const f = fit(points, size);
    const anchor = toScreen(points[1]!, f, RESET, size);
    const v = zoomAt(RESET, 2, anchor, size);
    const after = toScreen(points[1]!, f, v, size);
    expect(after.x).toBeCloseTo(anchor.x);
    expect(after.y).toBeCloseTo(anchor.y);
    expect(v.zoom).toBe(2);
  });

  it("clamps to the documented range", () => {
    const centre = { x: 200, y: 150 };
    expect(zoomAt(RESET, 1000, centre, size).zoom).toBe(MAX_ZOOM);
    expect(zoomAt(RESET, 0.001, centre, size).zoom).toBe(MIN_ZOOM);
  });
});

describe("hitTest", () => {
  const screen = [
    { x: 10, y: 10 },
    { x: 14, y: 10 },
    { x: 100, y: 100 },
  ];
  it("returns the nearest point within the radius", () => {
    expect(hitTest(screen, ["a", "b", "c"], { x: 13, y: 10 })).toBe(1);
    expect(hitTest(screen, ["a", "b", "c"], { x: 50, y: 50 })).toBe(-1);
  });

  it("breaks exact ties by id", () => {
    expect(hitTest(screen, ["z", "b", "c"], { x: 12, y: 10 })).toBe(1);
    expect(hitTest(screen, ["a", "b", "c"], { x: 12, y: 10 })).toBe(0);
  });
});
