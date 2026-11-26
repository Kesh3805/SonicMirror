import { describe, expect, it } from "vitest";
import type { AtlasPoint } from "../../ipc/types";
import {
  NO_FILTER,
  activeCount,
  matches,
  parseBound,
  unmeasuredHidden,
  visibleIds,
} from "./filters";

const p = (id: string, over: Partial<AtlasPoint> = {}): AtlasPoint => ({
  trackId: id,
  title: `Track ${id}`,
  artist: null,
  x: 0,
  y: 0,
  centroidHz: 1000,
  integratedLufs: -14,
  tempoBpm: 120,
  flatness: 0.1,
  ...over,
});

describe("Atlas filters", () => {
  it("passes everything with no conditions", () => {
    expect(matches(p("a", { tempoBpm: null }), NO_FILTER)).toBe(true);
    expect(activeCount(NO_FILTER)).toBe(0);
  });

  it("matches title or artist case-insensitively", () => {
    const f = { ...NO_FILTER, query: "  BELL " };
    expect(matches(p("a", { title: "Bells at dusk" }), f)).toBe(true);
    expect(matches(p("b", { artist: "The Bellwethers" }), f)).toBe(true);
    expect(matches(p("c"), f)).toBe(false);
    expect(activeCount(f)).toBe(1);
  });

  it("applies inclusive numeric bounds", () => {
    const f = { ...NO_FILTER, ranges: { tempoBpm: { min: 90, max: 120 } } };
    expect(matches(p("a", { tempoBpm: 90 }), f)).toBe(true);
    expect(matches(p("b", { tempoBpm: 120 }), f)).toBe(true);
    expect(matches(p("c", { tempoBpm: 121 }), f)).toBe(false);
    expect(matches(p("d", { tempoBpm: 89.9 }), f)).toBe(false);
  });

  it("supports open-ended bounds and ignores empty ranges", () => {
    const f = {
      ...NO_FILTER,
      ranges: { integratedLufs: { min: -16, max: null }, flatness: { min: null, max: null } },
    };
    expect(matches(p("a", { integratedLufs: -9 }), f)).toBe(true);
    expect(matches(p("b", { integratedLufs: -20 }), f)).toBe(false);
    expect(activeCount(f)).toBe(1);
  });

  it("excludes unmeasured tracks unless asked, and counts them", () => {
    const pts = [p("a"), p("b", { tempoBpm: null }), p("c", { tempoBpm: 200 })];
    const f = { ...NO_FILTER, ranges: { tempoBpm: { min: 100, max: 130 } } };
    expect([...visibleIds(pts, f)]).toEqual(["a"]);
    expect(unmeasuredHidden(pts, f)).toBe(1);

    const keep = { ...f, includeUnmeasured: true };
    expect([...visibleIds(pts, keep)]).toEqual(["a", "b"]);
    expect(unmeasuredHidden(pts, keep)).toBe(0);
  });

  it("parses bounds strictly", () => {
    expect(parseBound("")).toBeNull();
    expect(parseBound(" -14.5 ")).toBe(-14.5);
    expect(parseBound("abc")).toBe("invalid");
  });
});
