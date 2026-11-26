import { describe, expect, it } from "vitest";
import { changeSummary } from "./stale";

const c = (added: number, changed: number, removed: number) => ({ added, changed, removed });

describe("changeSummary", () => {
  it("names each kind of change with its count", () => {
    expect(changeSummary(c(1, 0, 0))).toBe("One track: 1 added since this map was made.");
    expect(changeSummary(c(2, 1, 0))).toBe(
      "Tracks: 2 added and 1 reanalyzed since this map was made.",
    );
    expect(changeSummary(c(3, 1, 2))).toBe(
      "Tracks: 3 added, 1 reanalyzed and 2 removed since this map was made.",
    );
  });

  it("blames the engine when no track changed", () => {
    expect(changeSummary(c(0, 0, 0))).toBe(
      "The analysis engine has changed since this map was made.",
    );
  });
});
