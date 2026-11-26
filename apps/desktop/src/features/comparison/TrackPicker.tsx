import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { ErrorNotice } from "../../components/ErrorNotice";
import { SkeletonRows } from "../../components/Skeleton";
import { ipc } from "../../ipc/client";
import type { TrackRecord } from "../../ipc/types";

interface TrackPickerProps {
  /** "A" or "B": the side being chosen. */
  side: "A" | "B";
  /** The track on the other side, which cannot be chosen again. */
  otherId: string | null;
  onPick: (trackId: string) => void;
  onClose: () => void;
}

function matches(t: TrackRecord, q: string): boolean {
  if (!q) return true;
  const hay = [t.title, t.artist, t.album].filter(Boolean).join("\n").toLocaleLowerCase();
  return hay.includes(q);
}

/**
 * Single-select track picker (PDS §10). Searches the local library; the track
 * already on the other side is shown but cannot be picked, with the reason.
 */
export function TrackPicker({ side, otherId, onPick, onClose }: TrackPickerProps) {
  const tracks = useQuery({ queryKey: ["tracks"], queryFn: ipc.listTracks });
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const other = side === "A" ? "B" : "A";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const q = query.trim().toLocaleLowerCase();
  const shown = (tracks.data ?? [])
    .filter((t) => matches(t, q))
    .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));

  return (
    <div className="sm-compare-scrim" onClick={onClose}>
      <div
        className="sm-compare-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <div className="sm-compare-picker-head">
          <h2 id={titleId} className="sm-compare-picker-title">
            Choose track {side}
          </h2>
          <button
            type="button"
            className="sm-button sm-button-quiet"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <input
          ref={inputRef}
          type="search"
          className="sm-input"
          placeholder="Search title, artist or album"
          aria-label="Search tracks"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {tracks.isPending && <SkeletonRows rows={6} rowHeight={44} />}
        {tracks.isError && (
          <ErrorNotice error={tracks.error} onRetry={() => void tracks.refetch()} />
        )}
        {tracks.data && shown.length === 0 && (
          <p className="sm-compare-note">
            {tracks.data.length === 0 ? "The library is empty." : "No matching tracks."}
          </p>
        )}
        <ul className="sm-compare-picker-list">
          {shown.map((t) => {
            const taken = t.id === otherId;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  className="sm-compare-picker-row"
                  disabled={taken}
                  onClick={() => onPick(t.id)}
                >
                  <span className="sm-compare-picker-name">{t.title}</span>
                  <span className="sm-compare-note">
                    {taken
                      ? `Already track ${other}. Choose a different recording.`
                      : (t.artist ?? "Unknown artist")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
