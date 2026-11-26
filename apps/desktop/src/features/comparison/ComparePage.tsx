import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ErrorNotice } from "../../components/ErrorNotice";
import { Skeleton } from "../../components/Skeleton";
import { ipc } from "../../ipc/client";
import type {
  ComparisonMeasurement,
  ComparisonStatus,
  TrackComparison,
  TrackRecord,
} from "../../ipc/types";
import { formatCount, formatNumber } from "../../lib/format";
import { formatDistance } from "../atlas/neighbours";
import { UNAVAILABLE_REASONS } from "../observatory/featureCatalog";
import { TrackPicker } from "./TrackPicker";
import { formatDifference, formatValue, groupRows, infoFor, joinUnit } from "./format";
import "./compare.css";

type Side = "A" | "B";

/**
 * Comparison (PDS §10, PRD FR-07): two recordings' measurements side by
 * side with `B − A` in raw units, and which feature groups drive their
 * distance. Track ids live in the query string (`?a=…&b=…`).
 */
export function ComparePage() {
  const [params, setParams] = useSearchParams();
  const a = params.get("a");
  const b = params.get("b");
  const [picking, setPicking] = useState<Side | null>(null);

  const set = (next: { a: string | null; b: string | null }) => {
    const p = new URLSearchParams();
    if (next.a) p.set("a", next.a);
    if (next.b) p.set("b", next.b);
    setParams(p, { replace: true });
  };

  const comparison = useQuery({
    queryKey: ["comparison", a, b],
    queryFn: () => ipc.compare(a!, b!),
    enabled: Boolean(a && b && a !== b),
  });

  return (
    <div className="sm-page sm-compare-page">
      <header className="sm-page-head">
        <div className="sm-page-header">
          <p className="sm-kicker">Comparison</p>
          <h1 className="sm-page-title">Compare tracks</h1>
          <p className="sm-page-subtitle">
            Measurements side by side. Differences are B minus A, in each measurement&apos;s own
            unit.
          </p>
        </div>
        {a && b && (
          <button
            type="button"
            className="sm-button sm-button-secondary"
            onClick={() => set({ a: b, b: a })}
          >
            <ArrowLeftRight size={16} aria-hidden="true" />
            Swap A and B
          </button>
        )}
      </header>

      <div className="sm-compare-sides">
        <SideHeader side="A" trackId={a} result={comparison.data?.left} onPick={setPicking} />
        <SideHeader side="B" trackId={b} result={comparison.data?.right} onPick={setPicking} />
      </div>

      {a && a === b && (
        <p className="sm-compare-note" role="status">
          A track cannot be compared with itself. Choose a different recording for one side.
        </p>
      )}

      {comparison.isError ? (
        <ErrorNotice error={comparison.error} onRetry={() => void comparison.refetch()} />
      ) : !a || !b ? (
        <p className="sm-compare-empty">
          Choose two tracks to compare their measurements. You can also start from a track in the
          Observatory or the Atlas.
        </p>
      ) : comparison.isPending && a !== b ? (
        <Skeleton height={360} />
      ) : comparison.data ? (
        <Results data={comparison.data} />
      ) : null}

      {picking && (
        <TrackPicker
          side={picking}
          otherId={picking === "A" ? b : a}
          onClose={() => setPicking(null)}
          onPick={(id) => {
            set(picking === "A" ? { a: id, b } : { a, b: id });
            setPicking(null);
          }}
        />
      )}
    </div>
  );
}

function SideHeader({
  side,
  trackId,
  result,
  onPick,
}: {
  side: Side;
  trackId: string | null;
  result: TrackComparison["left"] | undefined;
  onPick: (side: Side) => void;
}) {
  // Title from the comparison when loaded, otherwise from the track itself.
  const track = useQuery<TrackRecord>({
    queryKey: ["track", trackId],
    queryFn: () => ipc.getTrack(trackId!),
    enabled: Boolean(trackId) && !result,
  });
  const title = result?.title ?? track.data?.title;
  const artist = result ? result.artist : track.data?.artist;

  return (
    <section className="sm-compare-side" aria-label={`Track ${side}`}>
      <span className="sm-compare-badge sm-data" data-side={side}>
        {side}
      </span>
      <div className="sm-compare-side-body">
        {trackId ? (
          <>
            <h2 className="sm-compare-side-title">
              {title ?? <span className="sm-compare-note">Loading…</span>}
            </h2>
            <p className="sm-compare-note">{artist ?? "Unknown artist"}</p>
            {result && !result.analyzed && (
              <p className="sm-compare-note">Not analyzed yet.</p>
            )}
          </>
        ) : (
          <p className="sm-compare-note">No track selected</p>
        )}
        <div className="sm-compare-side-actions">
          <button
            type="button"
            className={`sm-button ${trackId ? "sm-button-secondary" : "sm-button-primary"}`}
            onClick={() => onPick(side)}
          >
            {trackId ? "Replace track" : "Select track"}
          </button>
          {trackId && (
            <Link className="sm-button sm-button-quiet" to={`/tracks/${trackId}`}>
              Open in Observatory
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function statusText(status: ComparisonStatus, diagnostic: string | null): string {
  if (status === "missing") return "not reported";
  if (diagnostic && UNAVAILABLE_REASONS[diagnostic]) return UNAVAILABLE_REASONS[diagnostic];
  return status === "failed" ? "measurement failed" : "unavailable";
}

function ValueCell({
  m,
  value,
  status,
  diagnostic,
}: {
  m: ComparisonMeasurement;
  value: number | number[] | null;
  status: ComparisonStatus;
  diagnostic: string | null;
}) {
  if (value === null) {
    return (
      <td className="sm-compare-num">
        <span className="sm-data">—</span>
        <span className="sm-compare-reason">{statusText(status, diagnostic)}</span>
      </td>
    );
  }
  return <td className="sm-compare-num sm-data">{joinUnit(formatValue(m, value))}</td>;
}

function DifferenceCell({ m }: { m: ComparisonMeasurement }) {
  const d = formatDifference(m);
  if (d) return <td className="sm-compare-num sm-data">{joinUnit(d)}</td>;
  if (Array.isArray(m.difference)) {
    return <td className="sm-compare-num sm-compare-reason">per coefficient below</td>;
  }
  return (
    <td className="sm-compare-num sm-compare-reason">
      {m.incompatible ? `not comparable: ${m.incompatible}` : "—"}
    </td>
  );
}

function VectorDetails({ m }: { m: ComparisonMeasurement }) {
  const l = Array.isArray(m.leftValue) ? m.leftValue : null;
  const r = Array.isArray(m.rightValue) ? m.rightValue : null;
  const d = Array.isArray(m.difference) ? m.difference : null;
  const n = Math.max(l?.length ?? 0, r?.length ?? 0);
  if (n === 0) return null;
  const cell = (v: number | undefined, signed = false) =>
    v === undefined ? "—" : `${signed && v > 0 ? "+" : ""}${formatNumber(v, 2)}`;
  return (
    <tr className="sm-compare-vector">
      <td colSpan={4}>
        <details>
          <summary>{infoFor(m.featureKey).label} by coefficient</summary>
          <table className="sm-compare-table sm-compare-subtable">
            <thead>
              <tr>
                <th scope="col">Coefficient</th>
                <th scope="col">A</th>
                <th scope="col">B</th>
                <th scope="col">B − A</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: n }, (_, i) => (
                <tr key={i}>
                  <th scope="row" className="sm-data">
                    c{i}
                  </th>
                  <td className="sm-compare-num sm-data">{cell(l?.[i])}</td>
                  <td className="sm-compare-num sm-data">{cell(r?.[i])}</td>
                  <td className="sm-compare-num sm-data">{cell(d?.[i], true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </td>
    </tr>
  );
}

function Results({ data }: { data: TrackComparison }) {
  return (
    <>
      <Distance data={data} />
      <table className="sm-compare-table">
        <caption className="sm-visually-hidden">
          Measurements of track A and track B with the difference B minus A
        </caption>
        <thead>
          <tr>
            <th scope="col">Measurement</th>
            <th scope="col" className="sm-compare-num">
              A
            </th>
            <th scope="col" className="sm-compare-num">
              B
            </th>
            <th scope="col" className="sm-compare-num">
              Difference (B − A)
            </th>
          </tr>
        </thead>
        {groupRows(data.measurements).map((g) => (
          <tbody key={g.group}>
            <tr className="sm-compare-group">
              <th scope="colgroup" colSpan={4}>
                {g.group}
              </th>
            </tr>
            {g.rows.map((m) => (
              <MeasurementRows key={m.featureKey} m={m} />
            ))}
          </tbody>
        ))}
      </table>
    </>
  );
}

function MeasurementRows({ m }: { m: ComparisonMeasurement }) {
  return (
    <>
      <tr>
        <th scope="row">{infoFor(m.featureKey).label}</th>
        <ValueCell m={m} value={m.leftValue} status={m.leftStatus} diagnostic={m.leftDiagnostic} />
        <ValueCell
          m={m}
          value={m.rightValue}
          status={m.rightStatus}
          diagnostic={m.rightDiagnostic}
        />
        <DifferenceCell m={m} />
      </tr>
      {infoFor(m.featureKey).format === "vector" && <VectorDetails m={m} />}
    </>
  );
}

/** Original-space distance and the share each feature group contributes. */
function Distance({ data }: { data: TrackComparison }) {
  const shares = Object.entries(data.contributions).sort(
    ([ga, a], [gb, b]) => b - a || ga.localeCompare(gb),
  );
  return (
    <section className="sm-compare-distance" aria-labelledby="compare-distance-title">
      <h2 id="compare-distance-title" className="sm-compare-section-title">
        Acoustic distance
      </h2>
      {data.distance === null ? (
        <p className="sm-compare-note">No shared distance for this pair.</p>
      ) : (
        <>
          <p className="sm-compare-distance-value">
            <span className="sm-data">{formatDistance(data.distance)}</span>
            <span className="sm-compare-note">
              weighted Euclidean; smaller is more similar. It is not a percentage.
            </span>
          </p>
          <ul className="sm-compare-shares" aria-label="Share of squared distance by group">
            {shares.map(([group, share]) => (
              <li key={group}>
                <span className="sm-compare-share-label">{group}</span>
                <span className="sm-compare-share-track" aria-hidden="true">
                  <span
                    className="sm-compare-share-bar"
                    style={{ width: `${(share * 100).toFixed(1)}%` }}
                  />
                </span>
                <span className="sm-data sm-compare-share-value">
                  {formatNumber(share * 100, 0)}&#8201;%
                </span>
              </li>
            ))}
          </ul>
          {data.modelContext && (
            <p className="sm-compare-note sm-data">
              {data.modelContext.vectorVersion} · normalized by {data.modelContext.normalization}{" "}
              ({formatCount(data.modelContext.referenceTracks)} tracks)
            </p>
          )}
        </>
      )}
      {data.limitations.length > 0 && (
        <ul className="sm-compare-limits">
          {data.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
