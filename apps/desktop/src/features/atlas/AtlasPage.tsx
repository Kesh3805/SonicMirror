import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { ErrorNotice } from "../../components/ErrorNotice";
import { Skeleton } from "../../components/Skeleton";
import { ipc } from "../../ipc/client";
import type { AtlasPoint, AtlasSnapshot } from "../../ipc/types";
import { formatCount } from "../../lib/format";
import { ImportButton, ImportStatus, useImportMusic } from "../library/importer";
import { AtlasCanvas } from "./AtlasCanvas";
import { AtlasInspector } from "./AtlasInspector";
import { AtlasLegend } from "./AtlasLegend";
import { type ColorKey, DESCRIPTORS, type Descriptor, descriptor, domainOf } from "./colorBy";
import { RESET, type Size, type Viewport, ZOOM_STEP, zoomAt } from "./viewport";
import "./atlas.css";

/**
 * Sonic Atlas (PDS §9). Positions are principal components of measurements
 * made on this device; when a map cannot be computed the page says why and
 * draws nothing. No fake map, no sample dots, no empty axes.
 */
export function AtlasPage() {
  const tracks = useQuery({ queryKey: ["tracks"], queryFn: ipc.listTracks });
  const atlas = useQuery({ queryKey: ["atlas"], queryFn: ipc.getAtlas });
  const importer = useImportMusic();

  return (
    <div className="sm-page sm-atlas-page">
      <header className="sm-page-head">
        <div className="sm-page-header">
          <p className="sm-kicker">Sonic Atlas</p>
          <h1 className="sm-page-title">Atlas</h1>
          <p className="sm-page-subtitle">
            A two-dimensional projection of measured features. Nearby tracks measured similarly.
          </p>
        </div>
        {atlas.data?.status === "ready" && (
          <button
            type="button"
            className="sm-button sm-button-secondary"
            onClick={() => void atlas.refetch()}
            disabled={atlas.isFetching}
          >
            {atlas.isFetching ? "Refreshing…" : "Refresh map"}
          </button>
        )}
      </header>

      <ImportStatus importer={importer} />
      {importer.isError && <ErrorNotice error={importer.error} />}

      {atlas.isError ? (
        <ErrorNotice error={atlas.error} onRetry={() => void atlas.refetch()} />
      ) : atlas.isPending || tracks.isPending ? (
        <Skeleton height={420} />
      ) : atlas.data.status === "ready" ? (
        <AtlasWorkspace snapshot={atlas.data} />
      ) : (
        <Unavailable
          snapshot={atlas.data}
          trackCount={tracks.data?.length}
          action={<ImportButton importer={importer} />}
        />
      )}
    </div>
  );
}

function Unavailable({
  snapshot,
  trackCount,
  action,
}: {
  snapshot: AtlasSnapshot;
  trackCount: number | undefined;
  action: React.ReactNode;
}) {
  const placed = snapshot.total - snapshot.excluded.length;
  if (trackCount === 0 || snapshot.total === 0) {
    return (
      <EmptyState title="Import music to build your Atlas." action={action}>
        Positions come from principal components of the measurements made on this device. No
        genres, tags or guesses are used.
      </EmptyState>
    );
  }
  if (snapshot.reason === "insufficient_variance") {
    return (
      <EmptyState title="These tracks measure too alike to map." action={action}>
        Every analyzed track has nearly the same measurements, so no direction separates them.
        Import music that differs in timbre, brightness or dynamics.
        <span className="sm-empty-fact sm-data">
          eligible tracks: {formatCount(placed)} of {formatCount(snapshot.total)}
        </span>
      </EmptyState>
    );
  }
  return (
    <>
      <EmptyState
        title={`The map needs at least ${snapshot.minTracks === 3 ? "three" : formatCount(snapshot.minTracks)} analyzed tracks.`}
        action={action}
      >
        Positions come from principal components of the measurements made on this device. No
        genres, tags or guesses are used.
        <span className="sm-empty-fact sm-data">
          eligible tracks: {formatCount(placed)} of {formatCount(snapshot.total)}
        </span>
      </EmptyState>
      <Exclusions snapshot={snapshot} />
    </>
  );
}

function Exclusions({ snapshot }: { snapshot: AtlasSnapshot }) {
  if (snapshot.excluded.length === 0) return null;
  const n = snapshot.excluded.length;
  return (
    <details className="sm-atlas-excluded">
      <summary>
        <span className="sm-data">{formatCount(n)}</span> {n === 1 ? "track is" : "tracks are"} not
        on the map
      </summary>
      <ul>
        {snapshot.excluded.map((e) => (
          <li key={e.trackId}>
            {e.title} <span className="sm-data sm-atlas-reason">{e.reason}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

type View = "map" | "list";

function AtlasWorkspace({ snapshot }: { snapshot: AtlasSnapshot }) {
  const [colorKey, setColorKey] = useState<ColorKey>("uniform");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>(RESET);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [view, setView] = useState<View>("map");
  const onSize = useCallback((s: Size) => setSize(s), []);

  const d = descriptor(colorKey);
  const domain = useMemo(() => domainOf(snapshot.points, d), [snapshot.points, d]);
  const selected = snapshot.points.find((p) => p.trackId === selectedId) ?? null;
  const available = DESCRIPTORS.filter(
    (x) => x.key === "uniform" || snapshot.points.some((p) => x.read(p) !== null),
  );
  const zoomBy = (steps: number) =>
    setViewport((v) =>
      zoomAt(v, ZOOM_STEP ** steps, { x: size.width / 2, y: size.height / 2 }, size),
    );

  return (
    <>
      <p className="sm-atlas-coverage">
        <span className="sm-data">{formatCount(snapshot.points.length)}</span> of{" "}
        <span className="sm-data">{formatCount(snapshot.total)}</span> tracks placed ·{" "}
        <span className="sm-data">
          {snapshot.vectorVersion} · {snapshot.projectionVersion}
        </span>
      </p>
      <Exclusions snapshot={snapshot} />

      <div className="sm-atlas-toolbar" role="toolbar" aria-label="Atlas view">
        <label className="sm-atlas-field">
          <span className="sm-atlas-label">Colour by</span>
          <select
            className="sm-select"
            value={colorKey}
            onChange={(e) => setColorKey(e.target.value as ColorKey)}
          >
            {available.map((x) => (
              <option key={x.key} value={x.key}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="sm-segmented" aria-label="Presentation">
          {(["map", "list"] as const).map((v) => (
            <label key={v}>
              <input
                type="radio"
                name="atlas-view"
                value={v}
                checked={view === v}
                onChange={() => setView(v)}
              />
              {v === "map" ? "Map" : "Track list"}
            </label>
          ))}
        </fieldset>
        {view === "map" && (
          <div className="sm-atlas-zoom">
            <button
              type="button"
              className="sm-button sm-button-quiet"
              aria-label="Zoom out"
              onClick={() => zoomBy(-3)}
            >
              <Minus size={16} aria-hidden="true" />
            </button>
            <span className="sm-data sm-atlas-zoom-level" aria-live="polite">
              {viewport.zoom.toFixed(1)}×
            </span>
            <button
              type="button"
              className="sm-button sm-button-quiet"
              aria-label="Zoom in"
              onClick={() => zoomBy(3)}
            >
              <Plus size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="sm-button sm-button-quiet"
              onClick={() => setViewport(RESET)}
            >
              <RotateCcw size={16} aria-hidden="true" />
              Reset view
            </button>
          </div>
        )}
      </div>

      <div className="sm-atlas-body" data-inspector={selected ? "" : undefined}>
        {view === "map" ? (
          <AtlasCanvas
            points={snapshot.points}
            descriptor={d}
            domain={domain}
            selectedId={selectedId}
            onSelect={setSelectedId}
            viewport={viewport}
            onViewport={setViewport}
            onSize={onSize}
          />
        ) : (
          <TrackList
            points={snapshot.points}
            descriptor={d}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}
        {selected && (
          <AtlasInspector
            key={selected.trackId}
            point={selected}
            descriptor={d}
            onSelect={setSelectedId}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      <AtlasLegend
        descriptor={d}
        domain={domain}
        placed={snapshot.points.length}
        axes={snapshot.axes}
      />
    </>
  );
}

function TrackList({
  points,
  descriptor: d,
  selectedId,
  onSelect,
}: {
  points: AtlasPoint[];
  descriptor: Descriptor;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const sorted = [...points].sort(
    (a, b) => a.title.localeCompare(b.title) || a.trackId.localeCompare(b.trackId),
  );
  return (
    <div className="sm-atlas-list">
      <table className="sm-atlas-table">
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col">Artist</th>
            {d.key !== "uniform" && <th scope="col">{d.label}</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const v = d.read(p);
            return (
              <tr key={p.trackId} aria-selected={p.trackId === selectedId}>
                <td>
                  <button
                    type="button"
                    className="sm-atlas-row-button"
                    onClick={() => onSelect(p.trackId)}
                  >
                    {p.title}
                  </button>
                </td>
                <td>{p.artist ?? "Unknown artist"}</td>
                {d.key !== "uniform" && (
                  <td className="sm-data">{v === null ? "—" : d.format(v)}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
