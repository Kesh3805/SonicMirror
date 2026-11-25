import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import type { AtlasPoint } from "../../ipc/types";
import { parseHex, rampColor, type Rgb } from "../../visualizations/spectrogram/ramp";
import { useThemeKey } from "../../visualizations/useThemeKey";
import { type Descriptor, type Domain, positionIn } from "./colorBy";
import {
  type Size,
  type Viewport,
  RESET,
  ZOOM_STEP,
  fit,
  hitTest,
  toScreen,
  zoomAt,
} from "./viewport";

interface AtlasCanvasProps {
  points: readonly AtlasPoint[];
  descriptor: Descriptor;
  domain: Domain | null;
  selectedId: string | null;
  onSelect: (trackId: string | null) => void;
  viewport: Viewport;
  onViewport: (v: Viewport) => void;
  onSize: (size: Size) => void;
}

const PAN_STEP = 40;
/** Pointer travel below which a press counts as a click, not a drag. */
const CLICK_SLOP = 3;

function token(el: Element, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

const css = ([r, g, b]: Rgb, alpha = 1) => `rgb(${r} ${g} ${b} / ${alpha})`;

/**
 * The Atlas map (PDS §9, §14 "Atlas"): unitless PC1/PC2 coordinates on a
 * plain canvas with no decorative geography. Neutral points by default;
 * colour encodes one measured descriptor on the sequential ramp, and tracks
 * without that measurement are drawn hollow. Neighbours are never read from
 * screen positions.
 */
export function AtlasCanvas({
  points,
  descriptor,
  domain,
  selectedId,
  onSelect,
  viewport,
  onViewport,
  onSize,
}: AtlasCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [hover, setHover] = useState<number>(-1);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(
    null,
  );
  const theme = useThemeKey();

  const fitted = useMemo(() => fit(points, size), [points, size]);
  const screen = useMemo(
    () => points.map((p) => toScreen(p, fitted, viewport, size)),
    [points, fitted, viewport, size],
  );
  const ids = useMemo(() => points.map((p) => p.trackId), [points]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const next = {
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      };
      setSize(next);
      onSize(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onSize]);

  // Wheel zoom needs a non-passive listener to keep the page from scrolling.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const notches = Math.max(-5, Math.min(5, -e.deltaY / 100));
      onViewport(
        zoomAt(
          viewport,
          ZOOM_STEP ** notches,
          { x: e.clientX - rect.left, y: e.clientY - rect.top },
          size,
        ),
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [viewport, onViewport, size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);

    const neutral = token(canvas, "--sm-point");
    const outline = token(canvas, "--sm-point-outline");
    const accent = token(canvas, "--sm-point-selected");
    const paper = token(canvas, "--sm-paper");
    const stops = [0, 1, 2, 3, 4].map((i) => parseHex(token(canvas, `--sm-seq-${i}`)));
    const coloured = descriptor.key !== "uniform" && domain !== null;

    const dot = (i: number, r: number) => {
      const s = screen[i]!;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    };

    let selected = -1;
    for (let i = 0; i < points.length; i++) {
      if (points[i]!.trackId === selectedId) {
        selected = i;
        continue;
      }
      if (i === hover) continue;
      const value = coloured ? descriptor.read(points[i]!) : null;
      dot(i, 3);
      if (coloured && value === null) {
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (coloured && value !== null) {
        ctx.fillStyle = css(rampColor(positionIn(value, domain), stops), 0.9);
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      } else {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = neutral;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Hover and selection are drawn last so they are never hidden.
    if (hover >= 0 && hover !== selected) {
      dot(hover, 4);
      ctx.fillStyle = outline;
      ctx.fill();
      dot(hover, 6);
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (selected >= 0) {
      dot(selected, 8);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.stroke();
      dot(selected, 5);
      ctx.fillStyle = paper;
      ctx.fill();
      dot(selected, 5);
      ctx.fillStyle = accent;
      ctx.fill();
    }
  }, [points, screen, size, descriptor, domain, selectedId, hover, theme]);

  const local = (e: PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const hovered = hover >= 0 ? points[hover] : undefined;
  const hoveredValue = hovered ? descriptor.read(hovered) : null;
  const tip = hover >= 0 ? screen[hover] : undefined;

  return (
    <div
      ref={wrapRef}
      className="sm-atlas-canvas"
      tabIndex={0}
      role="application"
      aria-roledescription="map"
      aria-label="Sonic Atlas map. Arrow keys pan, plus and minus zoom, Home resets the view. Use the track list to reach every track."
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const at = local(e);
        drag.current = { ...at, panX: viewport.panX, panY: viewport.panY, moved: false };
      }}
      onPointerMove={(e) => {
        const at = local(e);
        const d = drag.current;
        if (d) {
          const dx = at.x - d.x;
          const dy = at.y - d.y;
          if (d.moved || Math.hypot(dx, dy) > CLICK_SLOP) {
            d.moved = true;
            setHover(-1);
            onViewport({ ...viewport, panX: d.panX + dx, panY: d.panY + dy });
            return;
          }
        }
        setHover(hitTest(screen, ids, at));
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        if (!d || d.moved) return;
        const i = hitTest(screen, ids, local(e));
        onSelect(i >= 0 ? points[i]!.trackId : null);
      }}
      onPointerLeave={() => {
        if (!drag.current) setHover(-1);
      }}
      onKeyDown={(e) => {
        const centre = { x: size.width / 2, y: size.height / 2 };
        const pan = (dx: number, dy: number) =>
          onViewport({ ...viewport, panX: viewport.panX + dx, panY: viewport.panY + dy });
        const actions: Record<string, () => void> = {
          ArrowLeft: () => pan(PAN_STEP, 0),
          ArrowRight: () => pan(-PAN_STEP, 0),
          ArrowUp: () => pan(0, PAN_STEP),
          ArrowDown: () => pan(0, -PAN_STEP),
          "+": () => onViewport(zoomAt(viewport, ZOOM_STEP ** 3, centre, size)),
          "=": () => onViewport(zoomAt(viewport, ZOOM_STEP ** 3, centre, size)),
          "-": () => onViewport(zoomAt(viewport, ZOOM_STEP ** -3, centre, size)),
          Home: () => onViewport(RESET),
          Escape: () => onSelect(null),
        };
        const action = actions[e.key];
        if (!action) return;
        e.preventDefault();
        action();
      }}
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      {hovered && tip && (
        <div
          className="sm-atlas-tip"
          data-side={tip.x > size.width / 2 ? "left" : "right"}
          style={{ left: tip.x, top: tip.y }}
          aria-hidden="true"
        >
          <span className="sm-atlas-tip-title">{hovered.title}</span>
          {hovered.artist && <span className="sm-atlas-tip-artist">{hovered.artist}</span>}
          {descriptor.key !== "uniform" && (
            <span className="sm-atlas-tip-value sm-data">
              {hoveredValue === null ? "not measured" : descriptor.format(hoveredValue)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
