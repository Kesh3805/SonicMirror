import { Info } from "lucide-react";
import { useId, useState } from "react";
import type { AudioFeature } from "../../ipc/types";
import {
  UNKNOWN,
  formatBpm,
  formatChannels,
  formatConfidence,
  formatDecibels,
  formatFrequency,
  formatRatio,
  formatDuration,
} from "../../lib/format";
import { FEATURE_CATALOG, GROUP_ORDER, UNAVAILABLE_REASONS, type FeatureInfo } from "./featureCatalog";
import "./measurements.css";

function display(feature: AudioFeature, info: FeatureInfo): { value: string; unit: string } {
  if (feature.status !== "valid" || typeof feature.value !== "number") {
    return { value: UNKNOWN, unit: "" };
  }
  const v = feature.value;
  switch (info.format) {
    case "decibels":
      return { value: formatDecibels(v), unit: feature.unit ?? "dB" };
    case "frequency":
      return formatFrequency(v);
    case "ratio":
      return { value: formatRatio(v), unit: "" };
    case "seconds":
      return { value: formatDuration(v * 1000), unit: "" };
    case "count":
      return { value: formatChannels(v), unit: "" };
    case "bpm":
      return { value: formatBpm(v), unit: "BPM" };
  }
}

function Measurement({ feature, info }: { feature: AudioFeature; info: FeatureInfo }) {
  const [open, setOpen] = useState(false);
  const explanationId = useId();
  const valid = feature.status === "valid";
  const { value, unit } = display(feature, info);
  const reason =
    UNAVAILABLE_REASONS[feature.diagnosticCode ?? ""] ??
    (feature.status === "failed" ? "The measurement failed." : "Not measurable for this recording.");

  return (
    <div className="sm-metric" data-status={feature.status}>
      <div className="sm-metric-label">
        <span>{info.label}</span>
        <button
          type="button"
          className="sm-metric-info"
          aria-expanded={open}
          aria-controls={explanationId}
          aria-label={`About ${info.label}`}
          onClick={() => setOpen((o) => !o)}
        >
          <Info size={14} aria-hidden="true" />
        </button>
      </div>
      {valid ? (
        <>
          <p className="sm-metric-value sm-data">
            {value}
            {unit && <span className="sm-metric-unit">{unit}</span>}
          </p>
          {info.format === "bpm" && (
            <p className="sm-metric-qualifier sm-data">
              est.
              {feature.confidence !== undefined &&
                ` · confidence ${formatConfidence(feature.confidence)}`}
            </p>
          )}
        </>
      ) : (
        <p className="sm-metric-unavailable">
          Not available<span className="sm-metric-reason">{reason}</span>
        </p>
      )}
      {open && (
        <p id={explanationId} className="sm-metric-explanation">
          {info.explanation}{" "}
          <span className="sm-data sm-metric-version">{feature.algorithmVersion}</span>
        </p>
      )}
    </div>
  );
}

/** PDS §8: measurement groups as flat cells divided by rules. */
export function MeasurementGrid({ features }: { features: AudioFeature[] }) {
  const known = features.filter((f) => f.key in FEATURE_CATALOG);
  return (
    <div className="sm-measurements">
      {GROUP_ORDER.map((group) => {
        const items = known.filter((f) => FEATURE_CATALOG[f.key]?.group === group);
        if (items.length === 0) return null;
        return (
          <section key={group} className="sm-measure-group" aria-labelledby={`group-${group}`}>
            <h3 id={`group-${group}`} className="sm-eyebrow">
              {group}
            </h3>
            <div className="sm-metric-grid">
              {items.map((f) => {
                const info = FEATURE_CATALOG[f.key];
                return info ? <Measurement key={f.key} feature={f} info={info} /> : null;
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
