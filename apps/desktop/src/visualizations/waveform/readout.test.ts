import type { WaveformView } from "../../ipc/types";
import { columnBuckets, columnExtrema, formatReadout, formatTimecode, readoutAt } from "./readout";

const view: WaveformView = {
  durationMs: 4_000,
  bucketDurationMs: 10,
  // Eight buckets; bucket 5 holds the loudest moment.
  min: [-0.1, -0.2, -0.1, -0.3, -0.2, -0.79, -0.1, -0.05],
  max: [0.1, 0.2, 0.15, 0.3, 0.25, 0.82, 0.1, 0.05],
};

describe("waveform readout", () => {
  it("maps pixel columns to bucket ranges that cover every bucket", () => {
    expect(columnBuckets(8, 0, 4)).toEqual([0, 2]);
    expect(columnBuckets(8, 3, 4)).toEqual([6, 8]);
    // More pixels than buckets: every column still reads one bucket.
    expect(columnBuckets(4, 7, 16)).toEqual([1, 2]);
  });

  it("reports the same merged extrema that are drawn", () => {
    expect(columnExtrema(view, 2, 4)).toEqual({ min: -0.79, max: 0.82 });
  });

  it("reads time and extrema at the pointer", () => {
    const r = readoutAt(view, 2.5, 4)!;
    expect(r.timeMs).toBe(2_500);
    expect(formatReadout(r)).toBe("0:02.5 · max 0.82 · min −0.79");
    expect(readoutAt(view, -1, 4)).toBeNull();
    expect(readoutAt(view, 4, 4)).toBeNull();
  });

  it("formats timecode with tenths", () => {
    expect(formatTimecode(102_340)).toBe("1:42.3");
    expect(formatTimecode(0)).toBe("0:00.0");
  });
});
