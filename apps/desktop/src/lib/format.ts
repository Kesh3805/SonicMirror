// Display formatting rules from PDS §14 "Formatting".
// Unknown values render as an em dash; NaN is never displayed.

export const UNKNOWN = "—";

const finite = (v: number | null | undefined): v is number =>
  typeof v === "number" && Number.isFinite(v);

/** mm:ss, or h:mm:ss for an hour or more. */
export function formatDuration(ms: number | null | undefined): string {
  if (!finite(ms) || ms < 0) return UNKNOWN;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

function trimDecimals(value: number, max: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: max, minimumFractionDigits: 0 });
}

/** Hz below 1000, kHz above, up to two decimals. */
export function formatFrequency(hz: number | null | undefined): { value: string; unit: string } {
  if (!finite(hz)) return { value: UNKNOWN, unit: "" };
  return hz < 1000
    ? { value: trimDecimals(hz, 0), unit: "Hz" }
    : { value: trimDecimals(hz / 1000, 2), unit: "kHz" };
}

/** Sample rate in kHz, up to two decimals. */
export function formatSampleRate(hz: number | null | undefined): string {
  return finite(hz) ? `${trimDecimals(hz / 1000, 2)} kHz` : UNKNOWN;
}

/** dB, dBFS and LUFS use one decimal; the minus sign is typographic. */
export function formatDecibels(db: number | null | undefined): string {
  if (!finite(db)) return UNKNOWN;
  const text = db.toFixed(1);
  // −0.0003 rounds to "-0.0"; a signed zero carries no meaning.
  if (Number(text) === 0) return "0.0";
  return text.replace("-", "−");
}

export function formatRatio(value: number | null | undefined, decimals = 3): string {
  return finite(value) ? value.toFixed(decimals) : UNKNOWN;
}

export function formatChannels(count: number | null | undefined): string {
  if (!finite(count)) return UNKNOWN;
  if (count === 1) return "Mono";
  if (count === 2) return "Stereo";
  return `${count} channels`;
}

/** Tempo to the nearest whole BPM; always presented as an estimate. */
export function formatBpm(bpm: number | null | undefined): string {
  return finite(bpm) ? String(Math.round(bpm)) : UNKNOWN;
}

/** Confidence in [0, 1] as a whole percentage. */
export function formatConfidence(value: number | null | undefined): string {
  return finite(value) ? `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` : UNKNOWN;
}
