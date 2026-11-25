import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "../../components/EmptyState";
import { ErrorNotice } from "../../components/ErrorNotice";
import { ipc } from "../../ipc/client";
import { formatCount } from "../../lib/format";
import { ImportButton, ImportStatus, useImportMusic } from "../library/importer";

/** The projection needs at least this many analyzed tracks (PRD §14). */
const MIN_TRACKS = 3;

/**
 * Sonic Atlas (Redesign brief §4.5). Until projections exist the page states
 * the actual reason the map is not shown and how positions will be computed.
 * No fake map, no sample dots, no empty axes.
 */
export function AtlasPage() {
  const tracks = useQuery({ queryKey: ["tracks"], queryFn: ipc.listTracks });
  const importer = useImportMusic();
  const count = tracks.data?.length;
  const enough = count !== undefined && count >= MIN_TRACKS;

  return (
    <div className="sm-page">
      <header className="sm-page-header">
        <p className="sm-kicker">Sonic Atlas</p>
        <h1 className="sm-page-title">Atlas</h1>
        <p className="sm-page-subtitle">
          A two-dimensional projection of measured features. Nearby tracks measured similarly.
        </p>
      </header>

      <ImportStatus importer={importer} />
      {importer.isError && <ErrorNotice error={importer.error} />}

      {enough ? (
        <EmptyState title="The map is not available yet.">
          Your catalog has enough tracks, but projecting them is part of the next engine release.
          Nothing is drawn until real positions exist.
          <span className="sm-empty-fact sm-data">tracks in catalog: {formatCount(count)}</span>
        </EmptyState>
      ) : (
        <EmptyState
          title="The map needs at least three analyzed tracks."
          action={<ImportButton importer={importer} />}
        >
          Positions come from principal components of the measurements made on this device. No
          genres, tags or guesses are used.
          {count !== undefined && (
            <span className="sm-empty-fact sm-data">tracks in catalog: {formatCount(count)}</span>
          )}
        </EmptyState>
      )}
    </div>
  );
}
