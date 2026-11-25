import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ipc, isNativeRuntime } from "../../ipc/client";
import type { ImportOutcome } from "../../ipc/types";
import { formatCount } from "../../lib/format";

/** Import through the native file dialog and refresh the catalog afterwards. */
export function useImportMusic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ipc.importFiles,
    onSuccess: () =>
      Promise.all(
        ["tracks", "atlas", "atlas-neighbours"].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      ),
  });
}

type Importer = ReturnType<typeof useImportMusic>;

/** The view's single primary action. */
export function ImportButton({ importer }: { importer: Importer }) {
  return (
    <button
      type="button"
      className="sm-button sm-button-primary"
      onClick={() => importer.mutate()}
      disabled={importer.isPending || !isNativeRuntime()}
      aria-busy={importer.isPending}
    >
      {importer.isPending ? "Analyzing…" : "Import music"}
    </button>
  );
}

/**
 * A live region that is always mounted, so assistive technology announces the
 * import result when it appears inside (a region mounted with its text often
 * is not announced).
 */
export function ImportStatus({ importer }: { importer: Importer }) {
  return (
    <div role="status" className="sm-import-status">
      {importer.data && <ImportSummary outcomes={importer.data} />}
    </div>
  );
}

/** Result of the last import, with failures named by file. */
export function ImportSummary({ outcomes }: { outcomes: ImportOutcome[] }) {
  if (outcomes.length === 0) return null;
  const failed = outcomes.filter((o) => o.error);
  const imported = outcomes.length - failed.length;
  return (
    <div className="sm-import-summary">
      <p>
        <span className="sm-data">{formatCount(imported)}</span> imported
        {failed.length > 0 && (
          <>
            {" · "}
            <span className="sm-data">{formatCount(failed.length)}</span> could not be imported
          </>
        )}
        . Analyzed on this device; your files were not modified.
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
