import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { AtlasPoint } from "../../ipc/types";
import { descriptor, domainOf } from "./colorBy";
import {
  type AtlasFilter,
  NO_FILTER,
  RANGE_KEYS,
  RANGE_UNITS,
  type RangeKey,
  hint,
  parseBound,
} from "./filters";

interface AtlasFiltersProps {
  points: readonly AtlasPoint[];
  filter: AtlasFilter;
  onChange: (f: AtlasFilter) => void;
  onClose: () => void;
}

type Drafts = Record<RangeKey, { min: string; max: string }>;

const toText = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));

function draftsFrom(f: AtlasFilter): Drafts {
  return Object.fromEntries(
    RANGE_KEYS.map((k) => [k, { min: toText(f.ranges[k]?.min), max: toText(f.ranges[k]?.max) }]),
  ) as Drafts;
}

/**
 * Filters popover (PDS §9, §7): text plus validated ranges over measured
 * descriptors with explicit units. Changes apply as they are typed; a bound
 * that does not parse is marked invalid and left out.
 */
export function AtlasFilters({ points, filter, onChange, onClose }: AtlasFiltersProps) {
  const [drafts, setDrafts] = useState<Drafts>(() => draftsFrom(filter));
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const keys = RANGE_KEYS.filter((k) => points.some((p) => descriptor(k).read(p) !== null));

  useEffect(() => {
    panelRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, []);

  const setBound = (key: RangeKey, side: "min" | "max", text: string) => {
    const next = { ...drafts, [key]: { ...drafts[key], [side]: text } };
    setDrafts(next);
    const min = parseBound(next[key].min);
    const max = parseBound(next[key].max);
    if (min === "invalid" || max === "invalid") return;
    onChange({ ...filter, ranges: { ...filter.ranges, [key]: { min, max } } });
  };

  return (
    <div
      ref={panelRef}
      className="sm-atlas-filters"
      role="dialog"
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="sm-atlas-inspector-head">
        <h2 id={titleId} className="sm-atlas-label">
          Filters
        </h2>
        <button
          type="button"
          className="sm-button sm-button-quiet sm-atlas-close"
          onClick={onClose}
          aria-label="Close filters"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <label className="sm-atlas-filter-field">
        <span>Title or artist</span>
        <input
          type="search"
          className="sm-input"
          value={filter.query}
          onChange={(e) => onChange({ ...filter, query: e.target.value })}
        />
      </label>

      {keys.map((key) => {
        const d = descriptor(key);
        const domain = domainOf(points, d);
        const minBad = parseBound(drafts[key].min) === "invalid";
        const maxBad = parseBound(drafts[key].max) === "invalid";
        return (
          <fieldset key={key} className="sm-atlas-filter-range">
            <legend>
              {d.label} <span className="sm-data sm-atlas-unit">{RANGE_UNITS[key]}</span>
            </legend>
            <input
              className="sm-input sm-data"
              inputMode="decimal"
              aria-label={`${d.label} minimum, ${RANGE_UNITS[key]}`}
              aria-invalid={minBad || undefined}
              placeholder={domain ? hint(key, domain.min, "min") : "min"}
              value={drafts[key].min}
              onChange={(e) => setBound(key, "min", e.target.value)}
            />
            <span aria-hidden="true">–</span>
            <input
              className="sm-input sm-data"
              inputMode="decimal"
              aria-label={`${d.label} maximum, ${RANGE_UNITS[key]}`}
              aria-invalid={maxBad || undefined}
              placeholder={domain ? hint(key, domain.max, "max") : "max"}
              value={drafts[key].max}
              onChange={(e) => setBound(key, "max", e.target.value)}
            />
            {(minBad || maxBad) && <span className="sm-atlas-filter-error">Enter a number</span>}
          </fieldset>
        );
      })}

      <label className="sm-atlas-filter-check">
        <input
          type="checkbox"
          checked={filter.includeUnmeasured}
          onChange={(e) => onChange({ ...filter, includeUnmeasured: e.target.checked })}
        />
        Keep tracks without a filtered measurement
      </label>

      <button
        type="button"
        className="sm-button sm-button-secondary"
        onClick={() => {
          setDrafts(draftsFrom(NO_FILTER));
          onChange(NO_FILTER);
        }}
      >
        Reset filters
      </button>
    </div>
  );
}
