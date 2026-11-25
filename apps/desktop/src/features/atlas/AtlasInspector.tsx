import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Link } from "react-router";
import { SkeletonRows } from "../../components/Skeleton";
import { ErrorNotice } from "../../components/ErrorNotice";
import { ipc } from "../../ipc/client";
import type { AtlasNeighbour, AtlasPoint } from "../../ipc/types";
import type { Descriptor } from "./colorBy";
import { dominantGroup, formatDistance } from "./neighbours";

/** Neighbours shown for the selected track (PDS §9). */
export const NEIGHBOUR_COUNT = 5;

interface AtlasInspectorProps {
  point: AtlasPoint;
  descriptor: Descriptor;
  onSelect: (trackId: string) => void;
  onClose: () => void;
}

/**
 * The selected track and its nearest neighbours, measured in the original
 * normalized feature space rather than read off the map.
 */
export function AtlasInspector({ point, descriptor, onSelect, onClose }: AtlasInspectorProps) {
  const neighbours = useQuery({
    queryKey: ["atlas-neighbours", point.trackId, NEIGHBOUR_COUNT],
    queryFn: () => ipc.getNeighbours(point.trackId, NEIGHBOUR_COUNT),
  });
  const value = descriptor.read(point);

  return (
    <aside className="sm-atlas-inspector" aria-label={`Selected: ${point.title}`}>
      <div className="sm-atlas-inspector-head">
        <p className="sm-kicker">Selected track</p>
        <button
          type="button"
          className="sm-button sm-button-quiet sm-atlas-close"
          onClick={onClose}
          aria-label="Clear selection"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <h2 className="sm-atlas-inspector-title">{point.title}</h2>
      <p className="sm-atlas-inspector-artist">{point.artist ?? "Unknown artist"}</p>
      {descriptor.key !== "uniform" && (
        <p className="sm-atlas-inspector-value">
          <span className="sm-atlas-label">{descriptor.label}</span>{" "}
          <span className="sm-data">{value === null ? "not measured" : descriptor.format(value)}</span>
        </p>
      )}
      <Link className="sm-button sm-button-secondary" to={`/tracks/${point.trackId}`}>
        Open in Observatory
      </Link>

      <section className="sm-atlas-neighbours" aria-labelledby="atlas-neighbours-title">
        <h3 id="atlas-neighbours-title" className="sm-atlas-section-title">
          Nearest measured
        </h3>
        {neighbours.isPending && <SkeletonRows rows={NEIGHBOUR_COUNT} rowHeight={44} />}
        {neighbours.isError && (
          <ErrorNotice error={neighbours.error} onRetry={() => void neighbours.refetch()} />
        )}
        {neighbours.data && <NeighbourList items={neighbours.data} onSelect={onSelect} />}
        <p className="sm-atlas-note">
          Distance is weighted Euclidean over normalized timbre, spectral balance, texture and
          dynamics, each group weighted equally. Smaller is more similar; it is not a percentage.
        </p>
      </section>
    </aside>
  );
}

function NeighbourList({
  items,
  onSelect,
}: {
  items: AtlasNeighbour[];
  onSelect: (trackId: string) => void;
}) {
  if (items.length === 0) return <p className="sm-atlas-note">No other tracks are on the map.</p>;
  return (
    <ol className="sm-atlas-neighbour-list">
      {items.map((n) => {
        const group = dominantGroup(n.contributions);
        return (
          <li key={n.trackId} className="sm-atlas-neighbour">
            <button
              type="button"
              className="sm-atlas-neighbour-button"
              onClick={() => onSelect(n.trackId)}
            >
              <span className="sm-atlas-neighbour-title">{n.title}</span>
              <span className="sm-atlas-neighbour-meta">
                {group ? `differs most in ${group.label.toLowerCase()}` : "identical measurements"}
              </span>
            </button>
            <span className="sm-data sm-atlas-neighbour-distance" aria-label={`distance ${formatDistance(n.distance)}`}>
              {formatDistance(n.distance)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
