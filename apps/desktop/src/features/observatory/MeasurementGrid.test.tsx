import { fireEvent, render, screen, within } from "@testing-library/react";
import type { AudioFeature } from "../../ipc/types";
import { MeasurementGrid } from "./MeasurementGrid";

const features: AudioFeature[] = [
  {
    key: "rms_dbfs",
    value: -9.031,
    unit: "dBFS",
    status: "valid",
    algorithmVersion: "level/1.0.0",
  },
  {
    key: "spectral_centroid_mean",
    value: 2410.4,
    unit: "Hz",
    status: "valid",
    algorithmVersion: "spectral/1.0.0",
  },
  {
    key: "tempo_bpm",
    value: 119.62,
    unit: "BPM",
    status: "valid",
    algorithmVersion: "tempo/1.0.0",
    confidence: 0.824,
  },
  {
    key: "integrated_loudness",
    value: null,
    unit: "LUFS",
    status: "unavailable",
    algorithmVersion: "loudness/1.0.0",
    diagnosticCode: "below_absolute_gate",
  },
  {
    key: "mfcc_mean",
    value: [-312.456, 41.2, -7.5, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    unit: null,
    status: "valid",
    algorithmVersion: "mfcc/1.0.0",
  },
  {
    key: "spectral_flux_mean",
    value: null,
    unit: null,
    status: "unavailable",
    algorithmVersion: "spectral/1.0.0",
    diagnosticCode: "digital_silence",
  },
];

describe("MeasurementGrid", () => {
  it("formats valid measurements with units", () => {
    render(<MeasurementGrid features={features} />);
    expect(screen.getByText("−9.0")).toBeInTheDocument();
    expect(screen.getByText("dBFS")).toBeInTheDocument();
    expect(screen.getByText("2.41")).toBeInTheDocument();
    expect(screen.getByText("kHz")).toBeInTheDocument();
  });

  it("labels tempo as an estimate with its confidence", () => {
    render(<MeasurementGrid features={features} />);
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("est. · confidence 0.82")).toBeInTheDocument();
  });

  it("shows unavailable measurements with a reason, never a zero", () => {
    render(<MeasurementGrid features={features} />);
    expect(screen.getAllByText("Not available")).toHaveLength(2);
    expect(screen.getByText("Too quiet to measure loudness (below −70 LUFS).")).toBeInTheDocument();
    expect(screen.getByText("The recording is digitally silent.")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it("reveals the method and real algorithm version on request", () => {
    render(<MeasurementGrid features={features} />);
    const button = screen.getByRole("button", { name: "Method for Spectral centroid" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    // The hero gloss repeats the first sentence; the method adds the rest.
    expect(screen.getAllByText(/centre of mass/)).toHaveLength(2);
    expect(screen.getByText("algorithm spectral/1.0.0")).toBeInTheDocument();
  });

  it("heads each group with honest counts of the features present", () => {
    render(<MeasurementGrid features={features} />);
    const levels = screen.getByRole("region", { name: "Levels" });
    expect(within(levels).getByText("1 measured · 1 unavailable")).toBeInTheDocument();
    const rhythm = screen.getByRole("region", { name: "Rhythm" });
    expect(within(rhythm).getByText("1 measured · 0 unavailable")).toBeInTheDocument();
  });

  it("shows vector features as a coefficient count with every value on request", () => {
    render(<MeasurementGrid features={features} />);
    expect(screen.getByText("coefficients")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Method for MFCC mean" }));
    expect(screen.getByText("c0")).toBeInTheDocument();
    expect(screen.getByText("−312.46")).toBeInTheDocument();
    expect(screen.getByText("c12")).toBeInTheDocument();
  });
});
