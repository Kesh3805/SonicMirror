import { useQuery } from "@tanstack/react-query";
import { Navigate, useParams } from "react-router";
import { EmptyState } from "../../components/EmptyState";
import { ErrorNotice } from "../../components/ErrorNotice";
import { SkeletonRows } from "../../components/Skeleton";
import { ipc } from "../../ipc/client";
import type { TrackRecord } from "../../ipc/types";
import { formatCount, formatTotalDuration } from "../../lib/format";
import { ImportButton, ImportStatus, useImportMusic } from "./importer";
import { TracksTable } from "./TracksTable";
import "./library.css";

const TITLES: Record<string, string> = {
  tracks: "Tracks",
  albums: "Albums",
  artists: "Artists",
  collections: "Collections",
};

/** "1 284 tracks · 86 h 12 min", from the same query as the table. */
function CountLine({ tracks }: { tracks: TrackRecord[] }) {
  const known = tracks.filter((t) => t.durationMs !== null);
  const total = known.reduce((sum, t) => sum + (t.durationMs ?? 0), 0);
  return (
    <p className="sm-count-line sm-data">
      {formatCount(tracks.length)} {tracks.length === 1 ? "track" : "tracks"}
      {known.length > 0 && ` · ${formatTotalDuration(total)}`}
      {known.length < tracks.length && known.length > 0 && (
        <span className="sm-count-note">
          {" "}
          (duration unknown for {formatCount(tracks.length - known.length)})
        </span>
      )}
    </p>
  );
}

export function LibraryPage() {
  const { view = "tracks" } = useParams();
  const label = TITLES[view];
  const tracks = useQuery({
    queryKey: ["tracks"],
    queryFn: ipc.listTracks,
    enabled: view === "tracks",
  });
  const importer = useImportMusic();

  if (label === undefined) return <Navigate to="/library/tracks" replace />;

  return (
    <div className="sm-page">
      <header className="sm-page-head">
        <div className="sm-page-header">
          <p className="sm-kicker">Library</p>
          <h1 className="sm-page-title">{label}</h1>
          {view === "tracks" && tracks.data && tracks.data.length > 0 && (
            <CountLine tracks={tracks.data} />
          )}
        </div>
        {view === "tracks" && <ImportButton importer={importer} />}
      </header>

      <ImportStatus importer={importer} />
      {importer.isError && <ErrorNotice error={importer.error} />}

      {view !== "tracks" ? (
        <EmptyState title={`No ${label.toLowerCase()} yet.`} size="section">
          Grouped views arrive with the full library catalog.
        </EmptyState>
      ) : tracks.data === undefined ? (
        tracks.isError ? (
          <ErrorNotice error={tracks.error} onRetry={() => void tracks.refetch()} />
        ) : (
          <div className="sm-table-frame" aria-busy="true">
            <SkeletonRows rows={8} rowHeight={32} />
          </div>
        )
      ) : tracks.data.length === 0 ? (
        <EmptyState title="Your library is empty.">
          Import a folder of audio files. Every measurement is computed on this device; your files
          are never modified.
        </EmptyState>
      ) : (
        <TracksTable tracks={tracks.data} />
      )}
    </div>
  );
}
