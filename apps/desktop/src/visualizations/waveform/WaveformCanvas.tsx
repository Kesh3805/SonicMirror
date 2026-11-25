import { useEffect, useRef, useState } from "react";
import { formatDuration } from "../../lib/format";
import type { WaveformView } from "../../ipc/types";
import { niceTimeTicks } from "./ticks";
import "./waveform.css";

interface WaveformCanvasProps {
  view: WaveformView;
  /** Playhead position in milliseconds, if a track is loaded. */
  positionMs?: number;
}

const PLOT_HEIGHT = 144;
const AXIS_HEIGHT = 28;

function readToken(el: Element, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

/**
 * PDS §14 waveform: one vertical min/max stroke per pixel column from real
 * sample extrema, a zero baseline, a fixed −1..+1 amplitude scale and nice
 * time ticks. Nothing is interpolated or normalized per track.
 */
export function WaveformCanvas({ view, positionMs }: WaveformCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
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

    const grid = readToken(canvas, "--sm-chart-grid");
    const unplayed = readToken(canvas, "--sm-wave");
    const played = readToken(canvas, "--sm-wave-played");
    const cursor = readToken(canvas, "--sm-wave-cursor");
    const mid = PLOT_HEIGHT / 2;
    const half = PLOT_HEIGHT / 2 - 4;

    // Time grid.
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    for (const t of niceTimeTicks(view.durationMs)) {
      const x = Math.round((t / view.durationMs) * width) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, PLOT_HEIGHT);
      ctx.stroke();
    }
    // Zero baseline.
    ctx.beginPath();
    ctx.moveTo(0, mid + 0.5);
    ctx.lineTo(width, mid + 0.5);
    ctx.stroke();

    // One min/max stroke per pixel column, merging buckets that share a column.
    const buckets = view.min.length;
    const playedX = positionMs === undefined ? -1 : (positionMs / view.durationMs) * width;
    for (let x = 0; x < width; x++) {
      const start = Math.floor((x / width) * buckets);
      const end = Math.max(start + 1, Math.floor(((x + 1) / width) * buckets));
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = start; i < end && i < buckets; i++) {
        lo = Math.min(lo, view.min[i] ?? 0);
        hi = Math.max(hi, view.max[i] ?? 0);
      }
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) continue;
      ctx.fillStyle = x < playedX ? played : unplayed;
      const top = mid - Math.max(-1, Math.min(1, hi)) * half;
      const bottom = mid - Math.max(-1, Math.min(1, lo)) * half;
      ctx.fillRect(x, top, 1, Math.max(1, bottom - top));
    }

    if (playedX >= 0) {
      ctx.fillStyle = cursor;
      ctx.fillRect(Math.round(playedX), 0, 1, PLOT_HEIGHT);
    }
  }, [view, width, positionMs]);

  const ticks = niceTimeTicks(view.durationMs);
  const peak = Math.max(...view.max.map(Math.abs), ...view.min.map(Math.abs));

  return (
    <figure className="sm-waveform" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="sm-waveform-plot"
        style={{ height: PLOT_HEIGHT }}
        role="img"
        aria-label={`Waveform, ${formatDuration(view.durationMs)} long, peak amplitude ${peak.toFixed(2)} of full scale.`}
      />
      <div className="sm-waveform-axis" style={{ height: AXIS_HEIGHT }} aria-hidden="true">
        {ticks.map((t) => (
          <span
            key={t}
            className="sm-waveform-tick sm-data"
            style={{ left: `${(t / view.durationMs) * 100}%` }}
          >
            {formatDuration(t)}
          </span>
        ))}
      </div>
    </figure>
  );
}
