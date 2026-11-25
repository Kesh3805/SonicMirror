import {
  THIN,
  UNKNOWN,
  formatBpm,
  formatChannels,
  formatCodec,
  formatConfidence,
  formatCount,
  formatDate,
  formatDecibels,
  formatDuration,
  formatFrequency,
  formatNumber,
  formatSampleRate,
  formatTotalDuration,
} from "./format";

describe("formatNumber", () => {
  it("uses a typographic minus, fixed decimals and no signed zero", () => {
    expect(formatNumber(-9.031, 1)).toBe("−9.0");
    expect(formatNumber(-0.00026, 1)).toBe("0.0");
    expect(formatNumber(2.4, 2)).toBe("2.40");
  });

  it("groups digits with thin spaces from four digits", () => {
    expect(formatNumber(999, 0)).toBe("999");
    expect(formatNumber(1284, 0)).toBe(`1${THIN}284`);
    expect(formatNumber(12_418, 0)).toBe(`12${THIN}418`);
    expect(formatNumber(1_284_000, 0)).toBe(`1${THIN}284${THIN}000`);
  });
});

describe("formatDuration", () => {
  it("uses m:ss below an hour and h:mm:ss above", () => {
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

describe("totals and counts", () => {
  it("formats library totals in hours and minutes", () => {
    expect(formatTotalDuration(86 * 3_600_000 + 12 * 60_000)).toBe(`86${THIN}h 12${THIN}min`);
    expect(formatTotalDuration(12 * 60_000)).toBe(`12${THIN}min`);
    expect(formatTotalDuration(20_000)).toBe(`<${THIN}1${THIN}min`);
    expect(formatTotalDuration(0)).toBe(`0${THIN}min`);
    expect(formatTotalDuration(null)).toBe(UNKNOWN);
  });

  it("formats counts with thin-space grouping", () => {
    expect(formatCount(2)).toBe("2");
    expect(formatCount(41_284)).toBe(`41${THIN}284`);
  });
});

describe("formatFrequency", () => {
  it("uses integer Hz below 1 kHz and fixed kHz decimals above", () => {
    expect(formatFrequency(440)).toEqual({ value: "440", unit: "Hz" });
    expect(formatFrequency(2400)).toEqual({ value: "2.40", unit: "kHz" });
    expect(formatFrequency(2410.4)).toEqual({ value: "2.41", unit: "kHz" });
    expect(formatFrequency(9_999)).toEqual({ value: "10.00", unit: "kHz" });
    expect(formatFrequency(10_000)).toEqual({ value: "10.0", unit: "kHz" });
    expect(formatFrequency(Infinity)).toEqual({ value: UNKNOWN, unit: "" });
  });
});

describe("other formatters", () => {
  it("formats decibels to one fixed decimal", () => {
    expect(formatDecibels(-14.27)).toBe("−14.3");
    expect(formatDecibels(0)).toBe("0.0");
    expect(formatDecibels(-0.00026)).toBe("0.0");
  });

  it("formats sample rates and channels", () => {
    expect(formatSampleRate(44_100)).toBe(`44.1${THIN}kHz`);
    expect(formatSampleRate(48_000)).toBe(`48${THIN}kHz`);
    expect(formatSampleRate(88_200)).toBe(`88.2${THIN}kHz`);
    expect(formatChannels(2)).toBe("Stereo");
    expect(formatChannels(6)).toBe("6 channels");
  });

  it("maps decoder codec identifiers to display names", () => {
    expect(formatCodec("pcm_s16le")).toBe("PCM");
    expect(formatCodec("flac")).toBe("FLAC");
    expect(formatCodec(null)).toBe(UNKNOWN);
  });
});

describe("tempo formatting", () => {
  it("rounds tempo to whole BPM and shows confidence with two decimals", () => {
    expect(formatBpm(119.6)).toBe("120");
    expect(formatBpm(null)).toBe(UNKNOWN);
    expect(formatConfidence(0.824)).toBe("0.82");
    expect(formatConfidence(1.4)).toBe("1.00");
  });
});

describe("formatDate", () => {
  it("is locale-independent", () => {
    const ms = new Date(2026, 10, 23, 14, 2).getTime();
    expect(formatDate(ms)).toBe("23 Nov 2026");
    expect(formatDate(ms, { time: true })).toBe("23 Nov 2026 14:02");
    expect(formatDate(null)).toBe(UNKNOWN);
  });
});
