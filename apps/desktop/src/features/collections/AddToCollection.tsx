import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { Dialog } from "../../components/Dialog";
import { ErrorNotice } from "../../components/ErrorNotice";
import { SkeletonRows } from "../../components/Skeleton";
import { ipc } from "../../ipc/client";
import { formatCount } from "../../lib/format";
import { NameDialog } from "./NameDialog";
import { useAddToCollection, useCreateCollection } from "./mutations";
import { collectionKeys } from "./names";
import "./collections.css";

/**
 * "Add to collection" for one track: pick an existing collection or start a
 * new one with this track in it. Reports where the track went.
 */
export function AddToCollection({ trackId, title }: { trackId: string; title: string }) {
  const [open, setOpen] = useState<"pick" | "new" | null>(null);
  const [done, setDone] = useState<{ id: string; name: string; already: boolean } | null>(null);
  const collections = useQuery({
    queryKey: collectionKeys.all,
    queryFn: ipc.listCollections,
    enabled: open === "pick",
  });
  const add = useAddToCollection();
  const create = useCreateCollection();

  return (
    <>
      <button
        type="button"
        className="sm-button sm-button-secondary"
        onClick={() => {
          add.reset();
          setDone(null);
          setOpen("pick");
        }}
      >
        Add to collection
      </button>
      {done && (
        <p className="sm-collection-note" role="status">
          {done.already ? "Already in " : "Added to "}
          <Link to={`/library/collections/${done.id}`}>{done.name}</Link>.
        </p>
      )}

      {open === "pick" && (
        <Dialog title={`Add “${title}” to a collection`} onClose={() => setOpen(null)}>
          {collections.isPending && <SkeletonRows rows={3} rowHeight={44} />}
          {collections.isError && (
            <ErrorNotice error={collections.error} onRetry={() => void collections.refetch()} />
          )}
          {collections.data && collections.data.length === 0 && (
            <p className="sm-collection-note">No collections yet.</p>
          )}
          <ul className="sm-collection-pick-list" aria-label="Collections">
            {collections.data?.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="sm-collection-pick sm-collection-pick-button"
                  disabled={add.isPending}
                  onClick={() =>
                    add.mutate(
                      { id: c.id, trackIds: [trackId] },
                      {
                        onSuccess: (r) => {
                          setDone({ id: c.id, name: c.name, already: r.changed === 0 });
                          setOpen(null);
                        },
                      },
                    )
                  }
                >
                  <span className="sm-collection-pick-text">
                    <span>{c.name}</span>
                    <span className="sm-collection-note sm-data">
                      {formatCount(c.trackCount)} {c.trackCount === 1 ? "track" : "tracks"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {add.isError && <ErrorNotice error={add.error} />}
          <div className="sm-dialog-actions">
            <button
              type="button"
              className="sm-button sm-button-secondary"
              onClick={() => {
                create.reset();
                setOpen("new");
              }}
            >
              New collection…
            </button>
          </div>
        </Dialog>
      )}

      {open === "new" && (
        <NameDialog
          title="New collection"
          submitLabel="Create"
          note={`“${title}” will be its first track.`}
          pending={create.isPending}
          error={create.error}
          onClose={() => setOpen(null)}
          onSubmit={(name) =>
            create.mutate(
              { name, trackIds: [trackId] },
              {
                onSuccess: (c) => {
                  setDone({ id: c.id, name: c.name, already: false });
                  setOpen(null);
                },
              },
            )
          }
        />
      )}
    </>
  );
}
