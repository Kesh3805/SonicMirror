import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen } from "lucide-react";
import { useParams } from "react-router";
import { EmptyState } from "../../components/EmptyState";
import { ErrorNotice } from "../../components/ErrorNotice";
import { ipc, isNativeRuntime } from "../../ipc/client";
import type { ImportOutcome } from "../../ipc/types";
import { TracksTable } from "./TracksTable";
import "./library.css";

const TITLES: Record<string, string> = {
  tracks: "Tracks",
  albums: "Albums",
  artists: "Artists",
  collections: "Collections",
};

function ImportSummary({ outcomes }: { outcomes: ImportOutcome[] }) {
  if (outcomes.length === 0) return null;
  const failed = outcomes.filter((o) => o.error);
  const imported = outcomes.length - failed.length;
  return (
    <div className="sm-import-summary" role="status">
      <p>
        {imported} imported{failed.length > 0 ? ` · ${failed.length} could not be imported` : ""}.
        Your files were analyzed on this device and were not modified.
      </p>
      {failed.length > 0 && (
        <ul>
          {failed.map((o) => (
            <li key={o.fileName}>
              <span className="sm-data">{o.fileName}</span> — {o.error?.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LibraryPage() {
  const { view = "tracks" } = useParams();
  const label = TITLES[view] ?? "Tracks";
  const queryClient = useQueryClient();

  const tracks = useQuery({
    queryKey: ["tracks"],
    queryFn: ipc.listTracks,
    enabled: view === "tracks",
  });
  const importer = useMutation({
    mutationFn: ipc.importFiles,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tracks"] }),
  });

  const importButton = (
    <button
      type="button"
      className="sm-button sm-button-primary"
      onClick={() => importer.mutate()}
      disabled={importer.isPending || !isNativeRuntime()}
      aria-busy={importer.isPending}
    >
      <FolderOpen size={16} aria-hidden="true" />
      {importer.isPending ? "Analyzing…" : "Import music"}
    </button>
  );

  return (
    <div className="sm-page">
      <header className="sm-library-header">
        <div className="sm-page-header">
          <h1 className="sm-page-title">Library</h1>
          <p className="sm-eyebrow">{label}</p>
        </div>
        {view === "tracks" && importButton}
      </header>

      {importer.data && <ImportSummary outcomes={importer.data} />}
      {importer.isError && <ErrorNotice error={importer.error} />}

      {view !== "tracks" ? (
        <EmptyState title={`No ${label.toLowerCase()} yet.`} size="section">
          Grouped views arrive with the full library catalog.
        </EmptyState>
      ) : tracks.isError ? (
        <ErrorNotice error={tracks.error} onRetry={() => void tracks.refetch()} />
      ) : tracks.isPending ? (
        <div className="sm-skeleton sm-table-skeleton" aria-busy="true" />
      ) : tracks.data.length === 0 ? (
        <EmptyState title="Your library is empty.">
          Import audio files to analyze them. Files stay on this device and are never modified.
        </EmptyState>
      ) : (
        <TracksTable tracks={tracks.data} />
      )}
    </div>
  );
}
