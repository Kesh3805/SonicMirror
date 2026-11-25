import { render, screen } from "@testing-library/react";
import type { AudioFeature, StoredAnalysis } from "../../ipc/types";
import { ProvenanceChain, countFeatures } from "./ProvenanceChain";

const f = (key: string, status: AudioFeature["status"]): AudioFeature => ({
  key,
  value: status === "valid" ? 1 : null,
  unit: null,
  status,
  algorithmVersion: "x/1",
});

const analysis: StoredAnalysis = {
  analysisId: "r",
  engineVersion: "sonic-engine/0.1.0",
  featureSchemaVersion: "features/0.2.0",
  status: "partial",
  completedAtMs: new Date(2026, 10, 25, 21, 44).getTime(),
  features: [f("a", "valid"), f("b", "valid"), f("c", "unavailable"), f("d", "failed")],
};

describe("ProvenanceChain", () => {
  it("counts the features present by status", () => {
    expect(countFeatures(analysis)).toEqual({ valid: 2, unavailable: 1, failed: 1 });
  });

  it("renders only stored fields, starting at the analysis", () => {
    render(<ProvenanceChain analysis={analysis} />);
    expect(screen.getByText("analyzed 25 Nov 2026 21:44")).toBeInTheDocument();
    expect(screen.getByText("sonic-engine/0.1.0")).toBeInTheDocument();
    expect(screen.getByText("features/0.2.0")).toBeInTheDocument();
    expect(screen.getByText("1 unavailable")).toBeInTheDocument();
    expect(screen.getByText("1 failed")).toHaveAttribute("data-tone", "danger");
    expect(screen.queryByText(/STFT|2048/)).not.toBeInTheDocument();
  });

  it("says plainly when there is no analysis", () => {
    render(<ProvenanceChain analysis={null} />);
    expect(screen.getByText("not analyzed")).toBeInTheDocument();
  });
});
