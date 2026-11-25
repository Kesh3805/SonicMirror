import { buildLut, cellToDb, dbToT, parseHex, rampColor, type Rgb } from "./ramp";

const stops: Rgb[] = [
  [0, 0, 0],
  [100, 100, 100],
  [200, 200, 200],
];

describe("spectrogram ramp", () => {
  it("parses hex colours", () => {
    expect(parseHex("#F3F0E8")).toEqual([243, 240, 232]);
    expect(parseHex(" #252622 ")).toEqual([37, 38, 34]);
  });

  it("interpolates evenly spaced stops and clamps the ends", () => {
    expect(rampColor(0, stops)).toEqual([0, 0, 0]);
    expect(rampColor(0.25, stops)).toEqual([50, 50, 50]);
    expect(rampColor(1, stops)).toEqual([200, 200, 200]);
    expect(rampColor(-2, stops)).toEqual([0, 0, 0]);
    expect(rampColor(7, stops)).toEqual([200, 200, 200]);
  });

  it("maps the fixed −80 to 0 dB domain and clamps outside it", () => {
    expect(dbToT(-80)).toBe(0);
    expect(dbToT(-40)).toBe(0.5);
    expect(dbToT(0)).toBe(1);
    expect(dbToT(-120)).toBe(0);
    expect(dbToT(6)).toBe(1);
  });

  it("decodes quantized cells and builds a monotonic lookup table", () => {
    expect(cellToDb(0, -127.5, 0.5)).toBe(-127.5);
    expect(cellToDb(255, -127.5, 0.5)).toBe(0);
    const lut = buildLut(stops, -127.5, 0.5);
    expect(Array.from(lut.slice(0, 3))).toEqual([0, 0, 0]);
    expect(Array.from(lut.slice(255 * 3))).toEqual([200, 200, 200]);
    for (let v = 1; v < 256; v++) expect(lut[v * 3]!).toBeGreaterThanOrEqual(lut[(v - 1) * 3]!);
  });
});
