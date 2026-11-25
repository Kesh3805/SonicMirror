import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { EmptyState } from "../../components/EmptyState";
import { ErrorNotice } from "../../components/ErrorNotice";
import { Skeleton } from "../../components/Skeleton";
import { ipc } from "../../ipc/client";
import type { TrackRecord } from "../../ipc/types";
import { formatCount, formatDate, formatTotalDuration } from "../../lib/format";
import { ImportButton, ImportStatus, useImportMusic } from "../library/importer";
import "./overview.css";

const RECENT = 8;

function distinct(values: (string | null)[]): number {
  return new Set(values.filter((v): v is string => Boolean(v))).size;
}

/** Collection figures, all from the same catalog query as the Library. */
function CountsStrip({ tracks }: { tracks: TrackRecord[] }) {
  const known = tracks.filter((t) => t.durationMs !== null);
  const total = known.reduce((sum, t) => sum + (t.durationMs ?? 0), 0);
  const cells = [
    { label: "Tracks", value: formatCount(tracks.length) },
    { label: "Artists", value: formatCount(distinct(tracks.map((t) => t.artist))) },
    { label: "Albums", value: formatCount(distinct(tracks.map((t) => t.album))) },
    { label: "Total duration", value: known.length > 0 ? formatTotalDuration(total) : "—" },
  ];
  return (
    <section aria-label="Collection counts">
      <dl className="sm-counts">
        {cells.map((c) => (
          <div key={c.label} className="sm-count">
            <dt className="sm-kicker">{c.label}</dt>
            <dd className="sm-count-value sm-data">{c.value}</dd>
          </div>
        ))}
      </dl>
      {known.length < tracks.length && (
        <p className="sm-footnote">
          Duration unknown for {formatCount(tracks.length - known.length)}{" "}
          {tracks.length - known.length === 1 ? "track" : "tracks"}.
        </p>
      )}
      <p className="sm-footnote">Artists and albums count distinct values found in file tags.</p>
    </section>
  );
}

function RecentAccessions({ tracks }: { tracks: TrackRecord[] }) {
  const recent = [...tracks].sort((a, b) => b.createdAtMs - a.createdAtMs).slice(0, RECENT);
  return (
    <section className="sm-recent" aria-labelledby="recent-heading">
      <h2 id="recent-heading" className="sm-section-title">
        Recently added
      </h2>
      <ol className="sm-recent-list">
        {recent.map((t) => (
          <li key={t.id} className="sm-recent-row">
            <Link to={`/tracks/${t.id}`} className="sm-recent-title">
              {t.title}
            </Link>
            <span className="sm-recent-artist">{t.artist ?? ""}</span>
            <span className="sm-recent-date sm-data">{formatDate(t.createdAtMs)}</span>
          </li>
        ))}
      </ol>
      <Link to="/library/tracks" className="sm-recent-more">
        Open library →
      </Link>
    </section>
  );
}

export function OverviewPage() {
  const tracks = useQuery({ queryKey: ["tracks"], queryFn: ipc.listTracks });
  const importer = useImportMusic();

  return (
    <div className="sm-page">
      <header className="sm-page-head">
        <div className="sm-page-header">
          <p className="sm-kicker">Your collection</p>
          <h1 className="sm-page-title">Overview</h1>
        </div>
        <ImportButton importer={importer} />
      </header>

      <ImportStatus importer={importer} />
      {importer.isError && <ErrorNotice error={importer.error} />}

      {/* Data wins over a failed background refresh; the error shows only when nothing is known. */}
      {tracks.data === undefined ? (
        tracks.isError ? (
          <ErrorNotice error={tracks.error} onRetry={() => void tracks.refetch()} />
        ) : (
          <Skeleton height={72} />
        )
      ) : tracks.data.length === 0 ? (
        <EmptyState title="Nothing observed yet.">
          Import a folder of audio files. Every measurement is computed on this device; your files
          are never modified.
        </EmptyState>
      ) : (
        <>
          <CountsStrip tracks={tracks.data} />
          <RecentAccessions tracks={tracks.data} />
        </>
      )}
    </div>
  );
}
