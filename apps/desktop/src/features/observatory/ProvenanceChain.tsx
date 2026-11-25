import { Fragment } from "react";
import type { StoredAnalysis } from "../../ipc/types";
import { formatDate } from "../../lib/format";

export interface FeatureCounts {
  valid: number;
  unavailable: number;
  failed: number;
}

/** Counts of the features present; catalog keys absent from the list are not counted. */
export function countFeatures(analysis: StoredAnalysis): FeatureCounts {
  const counts = { valid: 0, unavailable: 0, failed: 0 };
  for (const f of analysis.features) counts[f.status] += 1;
  return counts;
}

/**
 * Provenance chain (Redesign brief §4.4, A11): where the numbers came from,
 * built only from stored fields. Technical file facts live in the kicker, so
 * the chain starts at the analysis. Analysis parameters are added only when
 * the engine reports them.
 */
export function ProvenanceChain({ analysis }: { analysis: StoredAnalysis | null }) {
  if (!analysis) {
    return (
      <ol className="sm-provenance" aria-label="Analysis provenance">
        <li className="sm-provenance-step">not analyzed</li>
      </ol>
    );
  }

  const counts = countFeatures(analysis);
  const steps: { label: string; tone?: "danger" }[] = [
    { label: `analyzed ${formatDate(analysis.completedAtMs, { time: true })}` },
    { label: analysis.engineVersion },
    { label: analysis.featureSchemaVersion },
  ];
  if (counts.unavailable > 0) steps.push({ label: `${counts.unavailable} unavailable` });
  if (counts.failed > 0) steps.push({ label: `${counts.failed} failed`, tone: "danger" });

  return (
    <ol className="sm-provenance" aria-label="Analysis provenance">
      {steps.map((step, i) => (
        <Fragment key={step.label}>
          {i > 0 && (
            <li className="sm-provenance-arrow" aria-hidden="true">
              →
            </li>
          )}
          <li className="sm-provenance-step" data-tone={step.tone}>
            {step.label}
          </li>
        </Fragment>
      ))}
    </ol>
  );
}
