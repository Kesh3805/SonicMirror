import { useEffect, useRef, useState } from "react";
import { formatCount, formatDuration } from "../../lib/format";
import type { WaveformView } from "../../ipc/types";
import { useThemeKey } from "../useThemeKey";
import { columnExtrema, formatReadout, readoutAt, type Readout } from "./readout";
import { niceTimeTicks } from "./ticks";
import "./waveform.css";

interface WaveformCanvasProps {
  view: WaveformView;
  /** Playhead position in milliseconds, if a track is loaded. */
  positionMs?: number;
}

const PLOT_HEIGHT = 128;

function readToken(el: Element, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

/**
 * The waveform as an instrument lane (Redesign brief §4.4, PDS §14): a
 * labelled scale gutter, one min/max stroke per pixel column from real sample
 * extrema on a fixed −1..+1 scale, a shared time axis, a figure caption, and a
 * crosshair readout taken from the same buckets that are drawn. Nothing is
 * normalized, smoothed or interpolated.
 */
export function WaveformCanvas({ view, positionMs }: WaveformCanvasProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<{ x: number; readout: Readout } | null>(null);
  const theme = useThemeKey();

  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = PLOT_HEIGHT * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, PLOT_HEIGHT);

    const gridColor = readToken(canvas, "--sm-rule-quiet");
    const baseline = readToken(canvas, "--sm-rule");
    const unplayed = readToken(canvas, "--sm-wave");
    const played = readToken(canvas, "--sm-wave-played");
    const cursor = readToken(canvas, "--sm-wave-cursor");
    const halo = readToken(canvas, "--sm-paper");
    const mid = PLOT_HEIGHT / 2;
    const half = PLOT_HEIGHT / 2 - 2;

    ctx.fillStyle = gridColor;
    for (const t of niceTimeTicks(view.durationMs)) {
      ctx.fillRect(Math.round((t / view.durationMs) * width), 0, 1, PLOT_HEIGHT);
    }
    ctx.fillStyle = baseline;
    ctx.fillRect(0, Math.round(mid), width, 1);

    const playedX = positionMs === undefined ? -1 : (positionMs / view.durationMs) * width;
    for (let x = 0; x < width; x++) {
      const extrema = columnExtrema(view, x, width);
      if (!extrema) continue;
      ctx.fillStyle = x < playedX ? played : unplayed;
      const top = mid - Math.max(-1, Math.min(1, extrema.max)) * half;
      const bottom = mid - Math.max(-1, Math.min(1, extrema.min)) * half;
      ctx.fillRect(x, top, 1, Math.max(1, bottom - top));
    }

    // Playhead: 2px oxide with a 1px paper halo so it clears 3:1 over ink.
    if (playedX >= 0) {
      const px = Math.round(playedX);
      ctx.fillStyle = halo;
      ctx.fillRect(px - 2, 0, 4, PLOT_HEIGHT);
      ctx.fillStyle = cursor;
      ctx.fillRect(px - 1, 0, 2, PLOT_HEIGHT);
    }
  }, [view, width, positionMs, theme]);

  const ticks = niceTimeTicks(view.durationMs);
  const peak = Math.max(0, ...view.max.map(Math.abs), ...view.min.map(Math.abs));

  return (
    <figure className="sm-lanes">
      <div className="sm-lane">
        <div className="sm-lane-gutter" aria-hidden="true">
          <span className="sm-lane-label">Ampl</span>
          <span className="sm-lane-tick" data-at="top">
            +1
          </span>
          <span className="sm-lane-tick" data-at="mid">
            0
          </span>
          <span className="sm-lane-tick" data-at="bottom">
            −1
          </span>
        </div>
        <div
          className="sm-lane-plot"
          ref={plotRef}
          style={{ height: PLOT_HEIGHT }}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const readout = readoutAt(view, x, rect.width);
            setHover(readout ? { x, readout } : null);
          }}
          onPointerLeave={() => setHover(null)}
        >
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Waveform, ${formatDuration(view.durationMs)} long, peak amplitude ${peak.toFixed(2)} of full scale.`}
          />
          {hover && (
            <span className="sm-crosshair" style={{ left: hover.x }} aria-hidden="true" />
          )}
        </div>
      </div>

      <div className="sm-lane-axis" aria-hidden="true">
        <div className="sm-lane-axis-ticks">
          {ticks.map((t) => (
            <span
              key={t}
              className="sm-lane-axis-tick"
              style={{ left: `${(t / view.durationMs) * 100}%` }}
            >
              {formatDuration(t)}
            </span>
          ))}
          {hover && (
            <span className="sm-readout" style={{ left: hover.x }}>
              {formatReadout(hover.readout)}
            </span>
          )}
        </div>
      </div>

      <figcaption className="sm-lanes-caption">
        Fig. 1 — Sample extrema, {formatCount(view.min.length)} buckets of{" "}
        {view.bucketDurationMs}
        {" "}ms, fixed full scale; nothing normalized.
      </figcaption>
    </figure>
  );
}
