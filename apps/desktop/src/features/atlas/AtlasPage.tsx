import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "../../components/EmptyState";
import { ipc } from "../../ipc/client";
import { formatCount } from "../../lib/format";
import { ImportButton, ImportSummary, useImportMusic } from "../library/importer";

/**
 * Sonic Atlas (Redesign brief §4.5). Until projections exist the page explains
 * what the map needs and how positions are computed. No fake map, no sample
 * dots, no empty axes.
 */
export function AtlasPage() {
  const tracks = useQuery({ queryKey: ["tracks"], queryFn: ipc.listTracks });
  const importer = useImportMusic();

  return (
    <div className="sm-page">
      <header className="sm-page-header">
        <p className="sm-kicker">Sonic Atlas</p>
        <h1 className="sm-page-title">Atlas</h1>
        <p className="sm-page-subtitle">
          A two-dimensional projection of measured features. Nearby tracks measured similarly.
        </p>
      </header>

      {importer.data && <ImportSummary outcomes={importer.data} />}

      <EmptyState
        title="The map needs at least three analyzed tracks."
        action={<ImportButton importer={importer} />}
      >
        Positions come from principal components of the measurements made on this device. No
        genres, tags or guesses are used.
        {tracks.data !== undefined && (
          <span className="sm-empty-fact sm-data">
            tracks in catalog: {formatCount(tracks.data.length)}
          </span>
        )}
      </EmptyState>
    </div>
  );
}
