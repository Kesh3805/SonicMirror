import { useEffect, useRef, useState } from "react";
import type { SpectrogramView } from "../../ipc/types";
import { formatDuration, formatFrequency, formatNumber } from "../../lib/format";
import { useThemeKey } from "../useThemeKey";
import { formatTimecode } from "../waveform/readout";
import { niceTimeTicks } from "../waveform/ticks";
import { DB_DOMAIN, buildLut, cellToDb, parseHex, type Rgb } from "./ramp";
import "./spectrogram.css";

const PLOT_HEIGHT = 160;

function frequencyTicks(maxHz: number): number[] {
  const step = maxHz > 16_000 ? 5_000 : maxHz > 8_000 ? 2_000 : 1_000;
  const ticks: number[] = [];
  for (let f = 0; f <= maxHz; f += step) ticks.push(f);
  return ticks;
}

function rampStops(el: Element): Rgb[] {
  const style = getComputedStyle(el);
  return [0, 1, 2, 3, 4].map((i) => parseHex(style.getPropertyValue(`--sm-seq-${i}`)));
}

interface Readout {
  x: number;
  side: "left" | "right";
  text: string;
}

/**
 * Spectrogram lane (PDS §14): linear frequency from 0 Hz to the analysis
 * Nyquist, time aligned with the waveform, a fixed −80…0 dB colour domain on
 * the sequential ramp, a labelled legend stating the dB reference, and a
 * readout of the stored cell under the pointer.
 */
export function SpectrogramLane({ view }: { view: SpectrogramView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const legendRef = useRef<HTMLCanvasElement>(null);
  const [readout, setReadout] = useState<Readout | null>(null);
  const theme = useThemeKey();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || view.columns === 0 || view.bands === 0) return;
    const stops = rampStops(canvas);
    const lut = buildLut(stops, view.floorDb, view.stepDb);

    canvas.width = view.columns;
    canvas.height = view.bands;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const image = ctx.createImageData(view.columns, view.bands);
    for (let c = 0; c < view.columns; c++) {
      for (let b = 0; b < view.bands; b++) {
        const cell = view.cells[c * view.bands + b] ?? 0;
        // Band 0 is the lowest frequency and is drawn at the bottom.
        const o = ((view.bands - 1 - b) * view.columns + c) * 4;
        image.data[o] = lut[cell * 3]!;
        image.data[o + 1] = lut[cell * 3 + 1]!;
        image.data[o + 2] = lut[cell * 3 + 2]!;
        image.data[o + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);

    const legend = legendRef.current;
    const lctx = legend?.getContext("2d");
    if (legend && lctx) {
      legend.width = 256;
      legend.height = 1;
      const strip = lctx.createImageData(256, 1);
      const legendLut = buildLut(stops, DB_DOMAIN[0], (DB_DOMAIN[1] - DB_DOMAIN[0]) / 255);
      for (let v = 0; v < 256; v++) {
        strip.data[v * 4] = legendLut[v * 3]!;
        strip.data[v * 4 + 1] = legendLut[v * 3 + 1]!;
        strip.data[v * 4 + 2] = legendLut[v * 3 + 2]!;
        strip.data[v * 4 + 3] = 255;
      }
      lctx.putImageData(strip, 0, 0);
    }
  }, [view, theme]);

  const ticks = niceTimeTicks(view.durationMs);
  const freqTicks = frequencyTicks(view.maxHz);

  return (
    <figure className="sm-lanes sm-spectrogram">
      <div className="sm-lane">
        <div className="sm-lane-gutter" aria-hidden="true">
          <span className="sm-lane-label">Freq</span>
          {freqTicks.map((f) => (
            <span
              key={f}
              className="sm-lane-tick sm-freq-tick"
              style={{ bottom: `${(f / view.maxHz) * 100}%` }}
            >
              {f === 0 ? "0" : `${formatNumber(f / 1000, 0)}k`}
            </span>
          ))}
        </div>
        <div
          className="sm-lane-plot"
          style={{ height: PLOT_HEIGHT }}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const c = Math.min(view.columns - 1, Math.max(0, Math.floor((x / rect.width) * view.columns)));
            const b = Math.min(
              view.bands - 1,
              Math.max(0, Math.floor(((rect.height - y) / rect.height) * view.bands)),
            );
            const cell = view.cells[c * view.bands + b] ?? 0;
            const db = cellToDb(cell, view.floorDb, view.stepDb);
            const lo = (b / view.bands) * view.maxHz;
            const hi = ((b + 1) / view.bands) * view.maxHz;
            const f0 = formatFrequency(lo);
            const f1 = formatFrequency(hi);
            const level = cell === 0 ? `≤ ${formatNumber(db, 1)}` : formatNumber(db, 1);
            setReadout({
              x,
              side: x > rect.width / 2 ? "left" : "right",
              text: `${formatTimecode((x / rect.width) * view.durationMs)} · ${f0.value}–${f1.value} ${f1.unit} · ${level} dB`,
            });
          }}
          onPointerLeave={() => setReadout(null)}
        >
          <canvas
            ref={canvasRef}
            className="sm-spectrogram-image"
            role="img"
            aria-label={`Spectrogram, ${formatDuration(view.durationMs)} long, 0 to ${formatFrequency(view.maxHz).value} ${formatFrequency(view.maxHz).unit}, colour from ${DB_DOMAIN[0]} to ${DB_DOMAIN[1]} dB ${view.reference}.`}
          />
          {readout && <span className="sm-crosshair" style={{ left: readout.x }} aria-hidden="true" />}
        </div>
      </div>

      <div className="sm-lane-axis" aria-hidden="true">
        <div className="sm-lane-axis-ticks">
          {ticks.map((t) => (
            <span key={t} className="sm-lane-axis-tick" style={{ left: `${(t / view.durationMs) * 100}%` }}>
              {formatDuration(t)}
            </span>
          ))}
          {readout && (
            <span
              className="sm-readout"
              data-side={readout.side}
              style={{ left: readout.x }}
            >
              {readout.text}
            </span>
          )}
        </div>
      </div>

      <div className="sm-colour-ruler">
        <span className="sm-data">≤{" "}−80</span>
        <canvas ref={legendRef} className="sm-colour-ruler-strip" aria-hidden="true" />
        <span className="sm-data">≥{" "}0 dB</span>
      </div>

      <figcaption className="sm-lanes-caption">
        Fig. 2 — Spectrogram, {view.columns} × {view.bands} cells (loudest per block), linear
        frequency, {view.reference}.
      </figcaption>
    </figure>
  );
}
