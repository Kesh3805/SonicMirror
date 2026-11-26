import { useQuery } from "@tanstack/react-query";
import { ListMusic } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { EmptyState } from "../../components/EmptyState";
import { ErrorNotice } from "../../components/ErrorNotice";
import { SkeletonRows } from "../../components/Skeleton";
import { ipc } from "../../ipc/client";
import { formatCount } from "../../lib/format";
import { NameDialog } from "./NameDialog";
import { useCreateCollection } from "./mutations";
import { collectionKeys } from "./names";
import "./collections.css";

/** Library › Collections (PDS §7): a grid of named collections and their sizes. */
export function CollectionsView() {
  const collections = useQuery({ queryKey: collectionKeys.all, queryFn: ipc.listCollections });
  const [creating, setCreating] = useState(false);
  const create = useCreateCollection();
  const navigate = useNavigate();

  const newButton = (
    <button
      type="button"
      className="sm-button sm-button-secondary"
      onClick={() => {
        create.reset();
        setCreating(true);
      }}
    >
      New collection
    </button>
  );

  return (
    <>
      {collections.isError ? (
        <ErrorNotice error={collections.error} onRetry={() => void collections.refetch()} />
      ) : collections.isPending ? (
        <SkeletonRows rows={3} rowHeight={72} />
      ) : collections.data.length === 0 ? (
        <EmptyState title="No collections yet." action={newButton} size="section">
          Collections group tracks without moving or copying files. Save a selection from the
          Atlas, or start one here.
        </EmptyState>
      ) : (
        <>
          <div className="sm-collections-bar">{newButton}</div>
          <ul className="sm-collections-grid">
            {collections.data.map((c) => (
              <li key={c.id}>
                <Link className="sm-collection-card" to={`/library/collections/${c.id}`}>
                  <span className="sm-collection-cover" aria-hidden="true">
                    <ListMusic size={24} />
                  </span>
                  <span className="sm-collection-name">{c.name}</span>
                  <span className="sm-collection-count sm-data">
                    {formatCount(c.trackCount)} {c.trackCount === 1 ? "track" : "tracks"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {creating && (
        <NameDialog
          title="New collection"
          submitLabel="Create"
          pending={create.isPending}
          error={create.error}
          onClose={() => setCreating(false)}
          onSubmit={(name) =>
            create.mutate(
              { name },
              { onSuccess: (c) => void navigate(`/library/collections/${c.id}`) },
            )
          }
        />
      )}
    </>
  );
}
