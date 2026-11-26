import { X } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { NameDialog } from "../collections/NameDialog";
import { useCreateCollection } from "../collections/mutations";
import type { AtlasPoint } from "../../ipc/types";
import { formatCount } from "../../lib/format";
import { type Descriptor, domainOf } from "./colorBy";

interface AtlasSelectionProps {
  points: readonly AtlasPoint[];
  descriptor: Descriptor;
  onFocus: (trackId: string) => void;
  onClose: () => void;
}

/**
 * Multi-selection inspector (PDS §9): the count, the measured extent of the
 * current descriptor across the selection, and an accessible list. Choosing
 * a track narrows the selection to it and shows its neighbours.
 */
export function AtlasSelection({ points, descriptor: d, onFocus, onClose }: AtlasSelectionProps) {
  const sorted = [...points].sort(
    (a, b) => a.title.localeCompare(b.title) || a.trackId.localeCompare(b.trackId),
  );
  const domain = d.key === "uniform" ? null : domainOf(points, d);
  const [saving, setSaving] = useState(false);
  const create = useCreateCollection();
  const navigate = useNavigate();

  return (
    <aside className="sm-atlas-inspector" aria-label={`${points.length} tracks selected`}>
      <div className="sm-atlas-inspector-head">
        <p className="sm-kicker">Selection</p>
        <button
          type="button"
          className="sm-button sm-button-quiet sm-atlas-close"
          onClick={onClose}
          aria-label="Clear selection"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <h2 className="sm-atlas-inspector-title">
        <span className="sm-data">{formatCount(points.length)}</span> tracks
      </h2>
      {d.key !== "uniform" && (
        <p className="sm-atlas-inspector-value">
          <span className="sm-atlas-label">{d.label}</span>{" "}
          <span className="sm-data">
            {domain === null
              ? "not measured"
              : domain.min === domain.max
                ? d.format(domain.min)
                : `${d.format(domain.min)} – ${d.format(domain.max)}`}
          </span>
          {domain && domain.unknown > 0 && (
            <span className="sm-atlas-note-inline">
              <span className="sm-data">{formatCount(domain.unknown)}</span> unknown
            </span>
          )}
        </p>
      )}
      <ul className="sm-atlas-neighbour-list">
        {sorted.map((p) => (
          <li key={p.trackId} className="sm-atlas-neighbour">
            <button
              type="button"
              className="sm-atlas-neighbour-button"
              onClick={() => onFocus(p.trackId)}
            >
              <span className="sm-atlas-neighbour-title">{p.title}</span>
              <span className="sm-atlas-neighbour-meta">{p.artist ?? "Unknown artist"}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="sm-atlas-actions">
        {sorted.length === 2 && (
          <Link
            className="sm-button sm-button-primary"
            to={`/compare?a=${sorted[0]!.trackId}&b=${sorted[1]!.trackId}`}
          >
            Compare these two
          </Link>
        )}
        <button
          type="button"
          className="sm-button sm-button-secondary"
          onClick={() => {
            create.reset();
            setSaving(true);
          }}
        >
          Save as collection
        </button>
        <button type="button" className="sm-button sm-button-quiet" onClick={onClose}>
          Clear selection
        </button>
      </div>
      {saving && (
        <NameDialog
          title="Save as collection"
          submitLabel="Create"
          note={`${formatCount(points.length)} selected tracks will be added.`}
          pending={create.isPending}
          error={create.error}
          onClose={() => setSaving(false)}
          onSubmit={(name) =>
            create.mutate(
              { name, trackIds: sorted.map((p) => p.trackId) },
              { onSuccess: (c) => void navigate(`/library/collections/${c.id}`) },
            )
          }
        />
      )}
    </aside>
  );
}
