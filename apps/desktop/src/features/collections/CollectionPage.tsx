import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Dialog } from "../../components/Dialog";
import { EmptyState } from "../../components/EmptyState";
import { ErrorNotice } from "../../components/ErrorNotice";
import { SkeletonRows } from "../../components/Skeleton";
import { ipc, isApplicationError } from "../../ipc/client";
import type { CollectionSummary, TrackRecord } from "../../ipc/types";
import { formatCount, formatDuration } from "../../lib/format";
import { AddTracksDialog } from "./AddTracksDialog";
import { NameDialog } from "./NameDialog";
import {
  useAddToCollection,
  useDeleteCollection,
  useRemoveFromCollection,
  useRenameCollection,
} from "./mutations";
import { collectionKeys } from "./names";
import "./collections.css";

type Open = "rename" | "delete" | "add" | null;

/** Collection detail (PDS §7): members by title, rename, delete, add and remove. */
export function CollectionPage() {
  const { collectionId = "" } = useParams();
  const summary = useQuery({
    queryKey: collectionKeys.one(collectionId),
    queryFn: () => ipc.getCollection(collectionId),
  });
  const tracks = useQuery({
    queryKey: collectionKeys.tracks(collectionId),
    queryFn: () => ipc.collectionTracks(collectionId),
  });

  if (summary.isError) {
    const missing = isApplicationError(summary.error) && summary.error.code === "catalog.not_found";
    return (
      <div className="sm-page">
        {missing ? (
          <EmptyState
            title="This collection no longer exists."
            action={
              <Link className="sm-button sm-button-secondary" to="/library/collections">
                All collections
              </Link>
            }
          >
            It may have been deleted. Its tracks are still in your library.
          </EmptyState>
        ) : (
          <ErrorNotice error={summary.error} onRetry={() => void summary.refetch()} />
        )}
      </div>
    );
  }
  if (summary.isPending) {
    return (
      <div className="sm-page" aria-busy="true">
        <SkeletonRows rows={6} rowHeight={40} />
      </div>
    );
  }
  return <Detail collection={summary.data} tracks={tracks} />;
}

function Detail({
  collection,
  tracks,
}: {
  collection: CollectionSummary;
  tracks: UseQueryResult<TrackRecord[]>;
}) {
  const [open, setOpen] = useState<Open>(null);
  const [notice, setNotice] = useState("");
  const rename = useRenameCollection(collection.id);
  const remove = useDeleteCollection(collection.id);
  const add = useAddToCollection();
  const removeTracks = useRemoveFromCollection(collection.id);
  const navigate = useNavigate();
  const members = new Set((tracks.data ?? []).map((t) => t.id));
  const n = collection.trackCount;

  const addTracks = (
    <button
      type="button"
      className="sm-button sm-button-primary"
      onClick={() => {
        add.reset();
        setOpen("add");
      }}
    >
      Add tracks
    </button>
  );

  return (
    <div className="sm-page">
      <header className="sm-page-head">
        <div className="sm-page-header">
          <p className="sm-kicker">
            <Link to="/library/collections">Collections</Link>
          </p>
          <h1 className="sm-page-title sm-collection-title">{collection.name}</h1>
          <p className="sm-count-line sm-data">
            {formatCount(n)} {n === 1 ? "track" : "tracks"}
          </p>
        </div>
        <div className="sm-collection-actions">
          {n > 0 && addTracks}
          <button
            type="button"
            className="sm-button sm-button-secondary"
            onClick={() => {
              rename.reset();
              setOpen("rename");
            }}
          >
            Rename
          </button>
          <button
            type="button"
            className="sm-button sm-button-quiet"
            onClick={() => {
              remove.reset();
              setOpen("delete");
            }}
          >
            Delete collection
          </button>
        </div>
      </header>

      <p className="sm-collection-note" role="status" aria-label="Collection status">
        {notice}
      </p>

      {tracks.isError ? (
        <ErrorNotice error={tracks.error} onRetry={() => void tracks.refetch()} />
      ) : tracks.isPending ? (
        <SkeletonRows rows={6} rowHeight={40} />
      ) : tracks.data.length === 0 ? (
        <EmptyState title="This collection is empty." action={addTracks} size="section">
          Add tracks from your library. Nothing is copied or moved.
        </EmptyState>
      ) : (
        <table className="sm-collection-table">
          <thead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Artist</th>
              <th scope="col" className="sm-collection-num">
                Duration
              </th>
              <th scope="col">
                <span className="sm-visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tracks.data.map((t) => (
              <tr key={t.id}>
                <td>
                  <Link to={`/tracks/${t.id}`}>{t.title}</Link>
                </td>
                <td>{t.artist ?? "Unknown artist"}</td>
                <td className="sm-collection-num sm-data">{formatDuration(t.durationMs)}</td>
                <td className="sm-collection-num">
                  <button
                    type="button"
                    className="sm-text-button"
                    aria-label={`Remove ${t.title} from ${collection.name}`}
                    disabled={removeTracks.isPending}
                    onClick={() =>
                      removeTracks.mutate([t.id], {
                        onSuccess: () =>
                          setNotice(`Removed ${t.title} from this collection. The track is still in your library.`),
                      })
                    }
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {removeTracks.isError && <ErrorNotice error={removeTracks.error} />}

      {open === "rename" && (
        <NameDialog
          title="Rename collection"
          submitLabel="Rename"
          initialName={collection.name}
          pending={rename.isPending}
          error={rename.error}
          onClose={() => setOpen(null)}
          onSubmit={(name) => rename.mutate(name, { onSuccess: () => setOpen(null) })}
        />
      )}

      {open === "add" && (
        <AddTracksDialog
          collectionName={collection.name}
          memberIds={members}
          pending={add.isPending}
          error={add.error}
          onClose={() => setOpen(null)}
          onAdd={(ids) =>
            add.mutate(
              { id: collection.id, trackIds: ids },
              {
                onSuccess: (r) => {
                  setOpen(null);
                  setNotice(`Added ${formatCount(r.changed)} ${r.changed === 1 ? "track" : "tracks"}.`);
                },
              },
            )
          }
        />
      )}

      {open === "delete" && (
        <Dialog title={`Delete “${collection.name}”?`} onClose={() => setOpen(null)}>
          <div className="sm-dialog-body">
            <p>
              Only the collection is removed. Its {formatCount(n)} {n === 1 ? "track stays" : "tracks stay"}{" "}
              in your library, and no audio files are touched.
            </p>
            {remove.isError && <ErrorNotice error={remove.error} />}
            <div className="sm-dialog-actions">
              <button type="button" className="sm-button sm-button-quiet" onClick={() => setOpen(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="sm-button sm-button-danger"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(undefined, {
                    onSuccess: () => void navigate("/library/collections", { replace: true }),
                  })
                }
              >
                {remove.isPending ? "Deleting…" : "Delete collection"}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
