// Atlas viewport math (PDS §9): projection units → CSS pixels with a
// preserved aspect ratio, pointer-anchored zoom within 0.5–20×, and hit
// testing by nearest screen distance with a stable-id tie-break.

export interface Point {
  x: number;
  y: number;
}

/** `screen = offset + unit × scale × zoom`, with y flipped so PC2 points up. */
export interface Viewport {
  zoom: number;
  /** Pan in CSS pixels relative to the fitted centre. */
  panX: number;
  panY: number;
}

export interface Size {
  width: number;
  height: number;
}

export const FIT_PADDING = 32;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 20;
export const HIT_RADIUS = 10;
export const ZOOM_STEP = 1.1;

export const RESET: Viewport = { zoom: 1, panX: 0, panY: 0 };

interface Fit {
  scale: number;
  cx: number;
  cy: number;
}

/** Scale and centre that fit every point inside the padded canvas at 1×. */
export function fit(points: readonly Point[], size: Size): Fit {
  if (points.length === 0) return { scale: 1, cx: 0, cy: 0 };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const availX = Math.max(1, size.width - 2 * FIT_PADDING);
  const availY = Math.max(1, size.height - 2 * FIT_PADDING);
  const candidates = [spanX > 0 ? availX / spanX : Infinity, spanY > 0 ? availY / spanY : Infinity];
  const scale = Math.min(...candidates);
  return {
    scale: Number.isFinite(scale) ? scale : 1,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  };
}

export function toScreen(p: Point, f: Fit, v: Viewport, size: Size): Point {
  const k = f.scale * v.zoom;
  return {
    x: size.width / 2 + v.panX + (p.x - f.cx) * k,
    y: size.height / 2 + v.panY - (p.y - f.cy) * k,
  };
}

/** Zoom by `factor` keeping the projection point under `anchor` fixed. */
export function zoomAt(v: Viewport, factor: number, anchor: Point, size: Size): Viewport {
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom * factor));
  const applied = zoom / v.zoom;
  // Offset of the anchor from the current centre scales with the zoom ratio.
  const ax = anchor.x - size.width / 2;
  const ay = anchor.y - size.height / 2;
  return {
    zoom,
    panX: ax - (ax - v.panX) * applied,
    panY: ay - (ay - v.panY) * applied,
  };
}

/**
 * The point nearest `at` within the hit radius, preferring the lower id on
 * an exact tie. Returns its index, or −1.
 */
export function hitTest(
  screen: readonly Point[],
  ids: readonly string[],
  at: Point,
  radius = HIT_RADIUS,
): number {
  let best = -1;
  let bestD = radius * radius;
  for (let i = 0; i < screen.length; i++) {
    const p = screen[i]!;
    const d = (p.x - at.x) ** 2 + (p.y - at.y) ** 2;
    if (d < bestD || (d === bestD && (best < 0 || ids[i]! < ids[best]!))) {
      best = i;
      bestD = d;
    }
  }
  return best;
}

/** Normalized rectangle from two drag corners. */
export function rectFrom(a: Point, b: Point) {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    right: Math.max(a.x, b.x),
    bottom: Math.max(a.y, b.y),
  };
}

/** Indices of screen points inside the rectangle spanned by `a` and `b`, edges included. */
export function pointsInRect(screen: readonly Point[], a: Point, b: Point): number[] {
  const r = rectFrom(a, b);
  const out: number[] = [];
  for (let i = 0; i < screen.length; i++) {
    const p = screen[i]!;
    if (p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom) out.push(i);
  }
  return out;
}
