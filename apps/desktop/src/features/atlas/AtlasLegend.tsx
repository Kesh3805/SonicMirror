import { useId, useState } from "react";
import type { AtlasAxis } from "../../ipc/types";
import { formatCount } from "../../lib/format";
import type { Descriptor, Domain } from "./colorBy";

interface AtlasLegendProps {
  descriptor: Descriptor;
  domain: Domain | null;
  placed: number;
  axes: AtlasAxis[];
}

const DIMENSION_LABELS: Record<string, string> = {
  centroid: "centroid",
  bandwidth: "bandwidth",
  rolloff: "rolloff",
  flatness: "flatness",
  flux: "flux",
  crest_factor: "crest factor",
  loudness_range: "loudness range",
};

const dimensionLabel = (name: string) =>
  DIMENSION_LABELS[name] ?? name.replace(/^mfcc(\d+)$/, "MFCC $1");

/** "PC1 · 41 % · centroid +, rolloff +, MFCC 2 −" */
export function axisSummary(name: string, axis: AtlasAxis): string {
  const pct = Math.round(axis.explained * 100);
  const loadings = axis.top
    .map(([dim, l]) => `${dimensionLabel(dim)} ${l >= 0 ? "+" : "−"}`)
    .join(", ");
  return `${name} · ${pct} % of variance · ${loadings}`;
}

/** Legend strip (PDS §9): colour scale with real endpoints, counts and the proximity caveat. */
export function AtlasLegend({ descriptor, domain, placed, axes }: AtlasLegendProps) {
  const [open, setOpen] = useState(false);
  const explainId = useId();
  const mid = domain ? (domain.min + domain.max) / 2 : null;

  return (
    <div className="sm-atlas-legend">
      <div className="sm-atlas-legend-row">
        {descriptor.key === "uniform" || domain === null ? (
          <span className="sm-atlas-legend-item">
            <span className="sm-atlas-swatch" data-kind="neutral" aria-hidden="true" />
            <span className="sm-data">{formatCount(placed)}</span> tracks placed
            {descriptor.key !== "uniform" && " · none measured for this descriptor"}
          </span>
        ) : (
          <>
            <span className="sm-atlas-legend-item">
              <span className="sm-atlas-label">{descriptor.label}</span>
              <span className="sm-data">{descriptor.format(domain.min)}</span>
              <span className="sm-atlas-ramp" aria-hidden="true" />
              <span className="sm-data">{descriptor.format(domain.max)}</span>
              {domain.max === domain.min ? (
                <span className="sm-atlas-note-inline">constant value</span>
              ) : (
                mid !== null && (
                  <span className="sm-atlas-note-inline">
                    mid <span className="sm-data">{descriptor.format(mid)}</span>
                  </span>
                )
              )}
            </span>
            <span className="sm-atlas-legend-item">
              <span className="sm-data">{formatCount(domain.known)}</span> measured
              {domain.unknown > 0 && (
                <>
                  <span className="sm-atlas-swatch" data-kind="unknown" aria-hidden="true" />
                  <span className="sm-data">{formatCount(domain.unknown)}</span> unknown
                </>
              )}
            </span>
          </>
        )}
        <button
          type="button"
          className="sm-text-button sm-atlas-legend-explain"
          aria-expanded={open}
          aria-controls={open ? explainId : undefined}
          onClick={() => setOpen((o) => !o)}
        >
          Map proximity is approximate
        </button>
      </div>
      {open && (
        <div id={explainId} className="sm-atlas-explain">
          <p>
            Positions are the first two principal components of the weighted, normalized feature
            vectors. A flat map cannot keep every distance, so two dots that look close may differ
            in directions the map does not show. The neighbour list uses the full measurement
            space.
          </p>
          <ul className="sm-atlas-axes">
            {axes.map((a, i) => (
              <li key={i} className="sm-data">
                {axisSummary(`PC${i + 1}`, a)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
