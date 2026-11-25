import { niceTimeTicks } from "./ticks";

describe("niceTimeTicks", () => {
  it("chooses readable steps with at most eight intervals", () => {
    expect(niceTimeTicks(3_000)).toEqual([0, 1000, 2000, 3000]);
    expect(niceTimeTicks(222_000)).toEqual([0, 30_000, 60_000, 90_000, 120_000, 150_000, 180_000, 210_000]);
  });

  it("returns no ticks for empty or invalid durations", () => {
    expect(niceTimeTicks(0)).toEqual([]);
    expect(niceTimeTicks(Number.NaN)).toEqual([]);
  });
});
