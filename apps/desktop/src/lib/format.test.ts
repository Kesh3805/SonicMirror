import {
  UNKNOWN,
  formatChannels,
  formatDecibels,
  formatDuration,
  formatFrequency,
  formatSampleRate,
} from "./format";

describe("formatDuration", () => {
  it("uses mm:ss below an hour and h:mm:ss above", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(222_000)).toBe("3:42");
    expect(formatDuration(3_725_000)).toBe("1:02:05");
  });

  it("renders unknown values as an em dash, never NaN", () => {
    expect(formatDuration(null)).toBe(UNKNOWN);
    expect(formatDuration(Number.NaN)).toBe(UNKNOWN);
    expect(formatDuration(-1)).toBe(UNKNOWN);
  });
});

describe("formatFrequency", () => {
  it("switches from Hz to kHz at 1000", () => {
    expect(formatFrequency(440)).toEqual({ value: "440", unit: "Hz" });
    expect(formatFrequency(2410.4)).toEqual({ value: "2.41", unit: "kHz" });
    expect(formatFrequency(Infinity)).toEqual({ value: UNKNOWN, unit: "" });
  });
});

describe("other formatters", () => {
  it("formats decibels to one decimal with a typographic minus", () => {
    expect(formatDecibels(-9.031)).toBe("−9.0");
    expect(formatDecibels(0)).toBe("0.0");
  });

  it("formats sample rates and channels", () => {
    expect(formatSampleRate(44_100)).toBe("44.1 kHz");
    expect(formatSampleRate(48_000)).toBe("48 kHz");
    expect(formatChannels(2)).toBe("Stereo");
    expect(formatChannels(6)).toBe("6 channels");
  });
});
