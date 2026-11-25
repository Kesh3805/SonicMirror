import type { AudioFeature } from "../../ipc/types";
import { THIN } from "../../lib/format";
import { buildHeadline, headlineText } from "./headline";

const feature = (key: string, value: number | null, status: AudioFeature["status"] = "valid"): AudioFeature => ({
  key,
  value,
  unit: null,
  status,
  algorithmVersion: "x/1",
});

describe("buildHeadline", () => {
  it("states loudness and tempo when both are valid", () => {
    const parts = buildHeadline([feature("integrated_loudness", -9.84), feature("tempo_bpm", 123.7)]);
    expect(headlineText(parts!)).toBe(
      `Integrated at −9.8${THIN}LUFS, with an estimated pulse near 124${THIN}BPM.`,
    );
  });

  it("drops tempo when the engine withheld it", () => {
    const parts = buildHeadline([
      feature("integrated_loudness", -14.27),
      feature("tempo_bpm", null, "unavailable"),
    ]);
    expect(headlineText(parts!)).toBe(`Integrated at −14.3${THIN}LUFS.`);
  });

  it("states tempo alone when loudness is unavailable", () => {
    const parts = buildHeadline([
      feature("integrated_loudness", null, "unavailable"),
      feature("tempo_bpm", 118),
    ]);
    expect(headlineText(parts!)).toBe(`An estimated pulse near 118${THIN}BPM.`);
  });

  it("omits the headline entirely when nothing is valid", () => {
    expect(buildHeadline([feature("tempo_bpm", null, "failed")])).toBeNull();
    expect(buildHeadline([])).toBeNull();
  });
});
