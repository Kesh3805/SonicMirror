import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComparisonMeasurement, TrackComparison, TrackRecord } from "../../ipc/types";
import { ComparePage } from "./ComparePage";

const compare = vi.fn<(a: string, b: string) => Promise<TrackComparison>>();
const listTracks = vi.fn<() => Promise<TrackRecord[]>>();
const getTrack = vi.fn<(id: string) => Promise<TrackRecord>>();

vi.mock("../../ipc/client", async (original) => ({
  ...(await original<typeof import("../../ipc/client")>()),
  ipc: {
    compare: (a: string, b: string) => compare(a, b),
    listTracks: () => listTracks(),
    getTrack: (id: string) => getTrack(id),
  },
}));

const track = (id: string, title: string): TrackRecord => ({
  id,
  title,
  artist: null,
  album: null,
  genre: null,
  releaseYear: null,
  durationMs: 1000,
  sampleRateHz: 44_100,
  channelCount: 2,
  codec: null,
  availability: "available",
  createdAtMs: 0,
});

const row = (over: Partial<ComparisonMeasurement>): ComparisonMeasurement => ({
  featureKey: "spectral_centroid_mean",
  unit: "Hz",
  leftValue: 1000,
  rightValue: 1900,
  difference: 900,
  leftStatus: "valid",
  rightStatus: "valid",
  leftDiagnostic: null,
  rightDiagnostic: null,
  incompatible: null,
  ...over,
});

const side = (id: string, title: string) => ({
  trackId: id,
  title,
  artist: null,
  analyzed: true,
  engineVersion: "e",
  featureSchemaVersion: "s",
});

const result = (over: Partial<TrackComparison> = {}): TrackComparison => ({
  left: side("a", "Alpha"),
  right: side("b", "Beta"),
  measurements: [
    row({}),
    row({
      featureKey: "integrated_loudness",
      unit: "LUFS",
      leftValue: -14,
      rightValue: -11.5,
      difference: 2.5,
    }),
    row({
      featureKey: "tempo_bpm",
      unit: "BPM",
      leftValue: 120,
      rightValue: null,
      difference: null,
      rightStatus: "unavailable",
      rightDiagnostic: "low_confidence",
    }),
    row({
      featureKey: "mfcc_mean",
      unit: null,
      leftValue: [1, 2],
      rightValue: [1.5, 1],
      difference: [0.5, -1],
    }),
  ],
  distance: 1.23456,
  contributions: { Timbre: 0.6, Dynamics: 0.4 },
  modelContext: {
    vectorVersion: "vector/1.0.0",
    normalization: "median and interquartile range over the library",
    referenceTracks: 6,
  },
  limitations: [],
  ...over,
});

function Where() {
  const loc = useLocation();
  return <output data-testid="where">{loc.search}</output>;
}

function renderAt(search: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/compare${search}`]}>
        <Routes>
          <Route
            path="/compare"
            element={
              <>
                <ComparePage />
                <Where />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listTracks.mockResolvedValue([track("a", "Alpha"), track("b", "Beta"), track("c", "Gamma")]);
  getTrack.mockImplementation(async (id) => track(id, id === "a" ? "Alpha" : "Beta"));
});

describe("ComparePage", () => {
  it("asks for two tracks and runs no comparison until both are chosen", async () => {
    renderAt("");
    expect(screen.getByText(/Choose two tracks to compare/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Select track" })).toHaveLength(2);
    expect(compare).not.toHaveBeenCalled();
  });

  it("shows raw values, signed B − A differences and unavailable reasons", async () => {
    compare.mockResolvedValue(result());
    renderAt("?a=a&b=b");

    expect(await screen.findByText("+900 Hz")).toBeInTheDocument();
    expect(screen.getByText("1 000 Hz")).toBeInTheDocument();
    expect(screen.getByText("+2.5 LU")).toBeInTheDocument();
    expect(screen.getByText("No steady pulse was found with enough confidence.")).toBeInTheDocument();
    expect(screen.getByText("mfcc mean by coefficient", { exact: false })).toBeInTheDocument();
    expect(compare).toHaveBeenCalledWith("a", "b");

    const distance = screen.getByRole("region", { name: "Acoustic distance" });
    expect(within(distance).getByText("1.23")).toBeInTheDocument();
    expect(within(distance).getByText(/6 tracks/)).toBeInTheDocument();
  });

  it("swaps sides through the URL", async () => {
    compare.mockResolvedValue(result());
    renderAt("?a=a&b=b");
    fireEvent.click(await screen.findByRole("button", { name: "Swap A and B" }));
    expect(screen.getByTestId("where")).toHaveTextContent("?a=b&b=a");
    await waitFor(() => expect(compare).toHaveBeenLastCalledWith("b", "a"));
  });

  it("prevents choosing the same track on both sides", async () => {
    compare.mockResolvedValue(result());
    renderAt("?a=a");
    fireEvent.click(await screen.findByRole("button", { name: "Select track" }));
    const dialog = await screen.findByRole("dialog", { name: "Choose track B" });
    const alpha = await within(dialog).findByRole("button", { name: /Alpha/ });
    expect(alpha).toBeDisabled();
    expect(within(alpha).getByText(/Already track A/)).toBeInTheDocument();

    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "gam" } });
    expect(within(dialog).queryByRole("button", { name: /Beta/ })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: /Gamma/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("where")).toHaveTextContent("?a=a&b=c");
  });

  it("explains a missing distance instead of inventing one", async () => {
    compare.mockResolvedValue(
      result({
        distance: null,
        contributions: {},
        modelContext: null,
        limitations: ["The tracks were analyzed with different feature schemas."],
      }),
    );
    renderAt("?a=a&b=b");
    expect(await screen.findByText("No shared distance for this pair.")).toBeInTheDocument();
    expect(screen.getByText(/different feature schemas/)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /Share of squared distance/ })).toBeNull();
  });

  it("refuses a URL that names one track twice", () => {
    renderAt("?a=a&b=a");
    expect(screen.getByText(/cannot be compared with itself/)).toBeInTheDocument();
    expect(compare).not.toHaveBeenCalled();
  });
});
