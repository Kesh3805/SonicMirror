import { formatDecibels } from "../../lib/format";

/** Neutral reference points with sources (Redesign brief A12). */
export const LOUDNESS_REFERENCES = [
  { lufs: -23, label: "−23 R128" },
  { lufs: -16, label: "−16" },
  { lufs: -14, label: "−14" },
] as const;

export const LOUDNESS_DOMAIN: [number, number] = [-30, -5];

/** Position of a value in [0, 1] across the domain, and whether it was clamped. */
export function scalePosition(value: number, [lo, hi]: [number, number]) {
  const t = (value - lo) / (hi - lo);
  return { t: Math.max(0, Math.min(1, t)), below: t < 0, above: t > 1 };
}

/**
 * Where an integrated loudness sits among common references. The ticks are
 * references, not grades: everything is drawn in ink and nothing is coloured
 * as good or bad (FabFilter, Youlean).
 */
export function ReferenceScale({ lufs }: { lufs: number }) {
  const pos = scalePosition(lufs, LOUDNESS_DOMAIN);
  const pct = (x: number) => `${(scalePosition(x, LOUDNESS_DOMAIN).t * 100).toFixed(2)}%`;
  return (
    <div
      className="sm-refscale"
      role="img"
      aria-label={`${formatDecibels(lufs)} LUFS on a scale from −30 to −5 LUFS, with references at −23 (EBU R128), −16 and −14 LUFS.`}
    >
      <div className="sm-refscale-track">
        {LOUDNESS_REFERENCES.map((r) => (
          <span key={r.lufs} className="sm-refscale-ref" style={{ left: pct(r.lufs) }} />
        ))}
        <span
          className="sm-refscale-value"
          data-testid="refscale-value"
          style={{ left: `${(pos.t * 100).toFixed(2)}%` }}
        />
      </div>
      <div className="sm-refscale-labels" aria-hidden="true">
        {LOUDNESS_REFERENCES.map((r) => (
          <span key={r.lufs} style={{ left: pct(r.lufs) }}>
            {r.label}
          </span>
        ))}
      </div>
      {(pos.below || pos.above) && (
        <p className="sm-refscale-note sm-data">{pos.below ? "◂ below scale" : "above scale ▸"}</p>
      )}
    </div>
  );
}
