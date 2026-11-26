import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Dialog } from "../../components/Dialog";
import { ErrorNotice } from "../../components/ErrorNotice";
import { SkeletonRows } from "../../components/Skeleton";
import { ipc } from "../../ipc/client";
import { formatCount } from "../../lib/format";

interface AddTracksDialogProps {
  collectionName: string;
  /** Tracks already in the collection: shown checked and disabled. */
  memberIds: ReadonlySet<string>;
  pending: boolean;
  error: unknown;
  onAdd: (trackIds: string[]) => void;
  onClose: () => void;
}

/** Search and multi-select library tracks to add (PDS §7 "Collections"). */
export function AddTracksDialog({
  collectionName,
  memberIds,
  pending,
  error,
  onAdd,
  onClose,
}: AddTracksDialogProps) {
  const tracks = useQuery({ queryKey: ["tracks"], queryFn: ipc.listTracks });
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());
  const q = query.trim().toLocaleLowerCase();
  const shown = (tracks.data ?? []).filter(
    (t) =>
      !q ||
      [t.title, t.artist, t.album].filter(Boolean).join("\n").toLocaleLowerCase().includes(q),
  );
  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Dialog title={`Add tracks to ${collectionName}`} onClose={onClose} wide>
      <input
        type="search"
        className="sm-input"
        placeholder="Search title, artist or album"
        aria-label="Search tracks"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {tracks.isPending && <SkeletonRows rows={6} rowHeight={40} />}
      {tracks.isError && <ErrorNotice error={tracks.error} onRetry={() => void tracks.refetch()} />}
      {tracks.data && shown.length === 0 && (
        <p className="sm-collection-note">
          {tracks.data.length === 0 ? "The library is empty." : "No matching tracks."}
        </p>
      )}
      <ul className="sm-collection-pick-list" aria-label="Tracks">
        {shown.map((t) => {
          const member = memberIds.has(t.id);
          return (
            <li key={t.id}>
              <label className="sm-collection-pick" data-member={member ? "" : undefined}>
                <input
                  type="checkbox"
                  checked={member || picked.has(t.id)}
                  disabled={member}
                  onChange={() => toggle(t.id)}
                />
                <span className="sm-collection-pick-text">
                  <span>{t.title}</span>
                  <span className="sm-collection-note">
                    {member ? "Already in this collection" : (t.artist ?? "Unknown artist")}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {error !== null && error !== undefined && (
        <ErrorNotice error={error} />
      )}
      <div className="sm-dialog-actions">
        <button type="button" className="sm-button sm-button-quiet" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="sm-button sm-button-primary"
          disabled={picked.size === 0 || pending}
          onClick={() => onAdd([...picked])}
        >
          {pending
            ? "Adding…"
            : picked.size === 0
              ? "Add tracks"
              : `Add ${formatCount(picked.size)} ${picked.size === 1 ? "track" : "tracks"}`}
        </button>
      </div>
    </Dialog>
  );
}
