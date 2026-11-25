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

  it("shows unavailable measurements with a reason, never a zero", () => {
    render(<MeasurementGrid features={features} />);
    expect(screen.getByText("Not available")).toBeInTheDocument();
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
