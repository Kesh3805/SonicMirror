import { fireEvent, render, screen } from "@testing-library/react";
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
    expect(screen.getByText("Estimated · 82% confidence")).toBeInTheDocument();
  });

  it("shows unavailable measurements with a reason, never a zero", () => {
    render(<MeasurementGrid features={features} />);
    expect(screen.getAllByText("Not available")).toHaveLength(2);
    expect(screen.getByText("Too quiet to measure loudness (below −70 LUFS).")).toBeInTheDocument();
    expect(screen.getByText("The recording is digitally silent.")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it("reveals an explanation on request", () => {
    render(<MeasurementGrid features={features} />);
    const button = screen.getByRole("button", { name: "About Spectral centroid" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/centre of mass/)).toBeInTheDocument();
  });
});
