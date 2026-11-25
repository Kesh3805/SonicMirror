// Colour mapping for spectrogram levels (PDS §14, Redesign brief A1): a fixed
// dB domain mapped onto the theme's sequential ramp, interpolated linearly in
// sRGB. Values outside the domain clamp to the end stops.

export type Rgb = [number, number, number];

/** The fixed display domain in dB relative to the artifact's reference. */
export const DB_DOMAIN: [number, number] = [-80, 0];

export function parseHex(hex: string): Rgb {
  const m = hex.trim().match(/^#([0-9a-f]{6})$/i);
  if (!m?.[1]) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Colour at position t ∈ [0, 1] along evenly spaced stops. */
export function rampColor(t: number, stops: Rgb[]): Rgb {
  if (stops.length === 0) return [0, 0, 0];
  if (stops.length === 1) return stops[0]!;
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(Math.floor(x), stops.length - 2);
  const f = x - i;
  const a = stops[i]!;
  const b = stops[i + 1]!;
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

/** Position of a dB level within the display domain, clamped to [0, 1]. */
export function dbToT(db: number, [lo, hi]: [number, number] = DB_DOMAIN): number {
  return Math.max(0, Math.min(1, (db - lo) / (hi - lo)));
}

/** Decode a quantized cell to dB. */
export function cellToDb(cell: number, floorDb: number, stepDb: number): number {
  return floorDb + cell * stepDb;
}

/** A 256-entry lookup table from quantized cell to RGB. */
export function buildLut(stops: Rgb[], floorDb: number, stepDb: number): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let v = 0; v < 256; v++) {
    const [r, g, b] = rampColor(dbToT(cellToDb(v, floorDb, stepDb)), stops);
    lut[v * 3] = r;
    lut[v * 3 + 1] = g;
    lut[v * 3 + 2] = b;
  }
  return lut;
}
