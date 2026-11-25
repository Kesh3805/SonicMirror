// Display formatting rules (PDS §14, amended by the Redesign Brief §3.3 / A9).
// Unknown values render as an em dash; NaN is never displayed. Numbers use a
// typographic minus (U+2212), fixed decimals per metric for tabular alignment,
// and thin-space (U+2009) digit grouping.

export const UNKNOWN = "—";
/** U+2009 THIN SPACE: between a value and its unit, and between digit groups. */
export const THIN = " ";
const MINUS = "−";

const finite = (v: number | null | undefined): v is number =>
  typeof v === "number" && Number.isFinite(v);

/** Fixed decimals, thin-space grouping, typographic minus, no signed zero. */
export function formatNumber(value: number, decimals: number): string {
  const fixed = Math.abs(value).toFixed(decimals);
  const [int = "0", frac] = fixed.split(".");
  const grouped = int.length > 3 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, THIN) : int;
  const body = frac === undefined ? grouped : `${grouped}.${frac}`;
  const isZero = Number(fixed) === 0;
  return value < 0 && !isZero ? `${MINUS}${body}` : body;
}

/** mm:ss, or h:mm:ss for an hour or more. */
export function formatDuration(ms: number | null | undefined): string {
  if (!finite(ms) || ms < 0) return UNKNOWN;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** A library total: "86 h 12 min", or "12 min" under an hour. */
export function formatTotalDuration(ms: number | null | undefined): string {
  if (!finite(ms) || ms < 0) return UNKNOWN;
  const minutes = Math.round(ms / 60_000);
  if (minutes === 0 && ms > 0) return `<${THIN}1${THIN}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${formatNumber(h, 0)}${THIN}h ${m}${THIN}min` : `${m}${THIN}min`;
}

/** A whole-number count with thin-space grouping: "1 284". */
export function formatCount(n: number | null | undefined): string {
  return finite(n) ? formatNumber(Math.round(n), 0).replace(MINUS, "-") : UNKNOWN;
}

/**
 * Integer Hz below 1 kHz; two fixed decimals of kHz from 1 to 10 kHz; one
 * fixed decimal at 10 kHz and above. Fixed decimals keep columns aligned.
 */
export function formatFrequency(hz: number | null | undefined): { value: string; unit: string } {
  if (!finite(hz)) return { value: UNKNOWN, unit: "" };
  if (Math.abs(hz) < 1000) return { value: formatNumber(hz, 0), unit: "Hz" };
  const khz = hz / 1000;
  return { value: formatNumber(khz, Math.abs(khz) >= 10 ? 1 : 2), unit: "kHz" };
}

/** Sample rate in kHz with the unit: "44.1 kHz", "48 kHz". */
export function formatSampleRate(hz: number | null | undefined): string {
  if (!finite(hz)) return UNKNOWN;
  const khz = hz / 1000;
  const text = Number.isInteger(khz) ? String(khz) : khz.toFixed(khz * 10 === Math.round(khz * 10) ? 1 : 2);
  return `${text}${THIN}kHz`;
}

/** dB, dBFS, LUFS and LU use one fixed decimal. */
export function formatDecibels(db: number | null | undefined): string {
  return finite(db) ? formatNumber(db, 1) : UNKNOWN;
}

export function formatRatio(value: number | null | undefined, decimals = 3): string {
  return finite(value) ? formatNumber(value, decimals) : UNKNOWN;
}

export function formatChannels(count: number | null | undefined): string {
  if (!finite(count)) return UNKNOWN;
  if (count === 1) return "Mono";
  if (count === 2) return "Stereo";
  return `${count} channels`;
}

/**
 * Tempo to the nearest whole BPM. The engine refines an integer-lag peak, so
 * decimals would be false precision; tempo is always labelled an estimate.
 */
export function formatBpm(bpm: number | null | undefined): string {
  return finite(bpm) ? String(Math.round(bpm)) : UNKNOWN;
}

/** Confidence in [0, 1] with two decimals: "0.62". */
export function formatConfidence(value: number | null | undefined): string {
  return finite(value) ? Math.max(0, Math.min(1, value)).toFixed(2) : UNKNOWN;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Locale-independent date, "23 Nov 2026", in local time; with `time`,
 * "23 Nov 2026 14:02". Avoids `toLocaleString`, which varies by machine.
 */
export function formatDate(ms: number | null | undefined, options: { time?: boolean } = {}): string {
  if (!finite(ms)) return UNKNOWN;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return UNKNOWN;
  const date = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  if (!options.time) return date;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${date} ${hh}:${mm}`;
}

/** Display names for codec identifiers reported by the decoder. */
export function formatCodec(codec: string | null | undefined): string {
  if (!codec) return UNKNOWN;
  const c = codec.toLowerCase();
  if (c.startsWith("pcm")) return "PCM";
  const known: Record<string, string> = {
    flac: "FLAC",
    mp3: "MP3",
    aac: "AAC",
    alac: "ALAC",
    vorbis: "Vorbis",
    opus: "Opus",
  };
  return known[c] ?? codec.toUpperCase();
}
