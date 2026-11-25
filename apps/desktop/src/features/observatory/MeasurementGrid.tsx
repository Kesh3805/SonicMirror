import { useId, useState } from "react";
import type { AudioFeature } from "../../ipc/types";
import {
  THIN,
  UNKNOWN,
  formatBpm,
  formatChannels,
  formatConfidence,
  formatDecibels,
  formatDuration,
  formatFrequency,
  formatRatio,
  formatSampleRate,
} from "../../lib/format";
import { FEATURE_CATALOG, GROUP_ORDER, UNAVAILABLE_REASONS, type FeatureInfo } from "./featureCatalog";
import { ReferenceScale } from "./ReferenceScale";
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
    case "sampleRate": {
      const [rate = UNKNOWN, unit = ""] = formatSampleRate(v).split(THIN);
      return { value: rate, unit };
    }
  }
}

function firstSentence(text: string): string {
  const end = text.indexOf(". ");
  return end === -1 ? text : text.slice(0, end + 1);
}

function Measurement({
  feature,
  info,
  hero,
}: {
  feature: AudioFeature;
  info: FeatureInfo;
  hero: boolean;
}) {
  const [open, setOpen] = useState(false);
  const methodId = useId();
  const valid = feature.status === "valid";
  const { value, unit } = display(feature, info);
  const reason =
    UNAVAILABLE_REASONS[feature.diagnosticCode ?? ""] ??
    (feature.status === "failed" ? "The measurement failed." : "Not measurable for this recording.");

  return (
    <div className="sm-metric" data-status={feature.status} data-hero={hero || undefined}>
      <p className="sm-metric-label">{info.label}</p>

      {valid ? (
        <p className="sm-metric-value sm-data">
          {value}
          {unit && (
            <span className="sm-metric-unit">
              {THIN}
              {unit}
            </span>
          )}
        </p>
      ) : (
        <>
          <p className="sm-metric-value sm-metric-dash sm-data" aria-hidden="true">
            {UNKNOWN}
          </p>
          <p className="sm-metric-unavailable">Not available</p>
          <p className="sm-metric-reason">{reason}</p>
        </>
      )}

      {valid && info.format === "bpm" && (
        <p className="sm-metric-qualifier sm-data">
          est.
          {feature.confidence !== undefined && ` · confidence ${formatConfidence(feature.confidence)}`}
        </p>
      )}

      {valid && hero && <p className="sm-metric-gloss">{firstSentence(info.explanation)}</p>}

      {valid && feature.key === "integrated_loudness" && typeof feature.value === "number" && (
        <ReferenceScale lufs={feature.value} />
      )}

      <button
        type="button"
        className="sm-text-button sm-metric-method sm-data"
        aria-expanded={open}
        aria-controls={open ? methodId : undefined}
        aria-label={`Method for ${info.label}`}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "− method" : "+ method"}
      </button>
      {open && (
        <div id={methodId} className="sm-metric-method-body">
          <p>{info.explanation}</p>
          <p className="sm-data">algorithm {feature.algorithmVersion}</p>
        </div>
      )}
    </div>
  );
}

function groupCountLabel(features: AudioFeature[]): string {
  const valid = features.filter((f) => f.status === "valid").length;
  const unavailable = features.filter((f) => f.status === "unavailable").length;
  const failed = features.filter((f) => f.status === "failed").length;
  const parts = [`${valid} measured`, `${unavailable} unavailable`];
  if (failed > 0) parts.push(`${failed} failed`);
  return parts.join(" · ");
}

/**
 * Measurement groups (Redesign brief §4.4): a serif-italic head, honest counts,
 * one hero value where the group has one, and a 1px-gap grid of the rest.
 */
export function MeasurementGrid({ features }: { features: AudioFeature[] }) {
  const known = features.filter((f) => f.key in FEATURE_CATALOG);
  return (
    <div className="sm-measurements">
      {GROUP_ORDER.map((group) => {
        const items = known.filter((f) => FEATURE_CATALOG[f.key]?.group === group);
        if (items.length === 0) return null;
        const hero = items.find((f) => FEATURE_CATALOG[f.key]?.hero);
        const rest = items.filter((f) => f !== hero);
        return (
          <section key={group} className="sm-measure-group" aria-labelledby={`group-${group}`}>
            <header className="sm-measure-head">
              <h3 id={`group-${group}`} className="sm-section-title">
                {group}
              </h3>
              <p className="sm-kicker-data">{groupCountLabel(items)}</p>
            </header>
            {hero && (
              <div className="sm-metric-hero">
                <Measurement feature={hero} info={FEATURE_CATALOG[hero.key]!} hero />
              </div>
            )}
            {rest.length > 0 && (
              <div className="sm-metric-grid">
                {rest.map((f) => (
                  <Measurement key={f.key} feature={f} info={FEATURE_CATALOG[f.key]!} hero={false} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
