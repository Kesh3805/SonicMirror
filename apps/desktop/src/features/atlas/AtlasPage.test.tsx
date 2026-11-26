import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AtlasPoint, AtlasSnapshot, TrackRecord } from "../../ipc/types";
import { AtlasPage } from "./AtlasPage";

const getAtlas = vi.fn<() => Promise<AtlasSnapshot>>();
const listTracks = vi.fn<() => Promise<TrackRecord[]>>();
const getNeighbours = vi.fn();

vi.mock("../../ipc/client", async (original) => ({
  ...(await original<typeof import("../../ipc/client")>()),
  ipc: {
    getAtlas: () => getAtlas(),
    listTracks: () => listTracks(),
    getNeighbours: (id: string, k: number) => getNeighbours(id, k),
    importFiles: vi.fn(),
  },
}));

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const point = (id: string, title: string, tempoBpm: number | null): AtlasPoint => ({
  trackId: id,
  title,
  artist: null,
  x: Number(id.length),
  y: 0,
  centroidHz: 1500,
  integratedLufs: -12,
  tempoBpm,
  flatness: 0.1,
});

const snapshot = (over: Partial<AtlasSnapshot>): AtlasSnapshot => ({
  status: "ready",
  reason: null,
  vectorVersion: "vector/1.0.0",
  projectionVersion: "pca/1.0.0",
  minTracks: 3,
  total: 0,
  points: [],
  excluded: [],
  axes: [],
  ...over,
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AtlasPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listTracks.mockResolvedValue([]);
});

describe("AtlasPage", () => {
  it("asks for music when the catalog is empty, with no map", async () => {
    getAtlas.mockResolvedValue(
      snapshot({ status: "unavailable", reason: "too_few_tracks", total: 0 }),
    );
    renderPage();
    expect(await screen.findByText("Import music to build your Atlas.")).toBeInTheDocument();
    expect(screen.queryByRole("application")).toBeNull();
  });

  it("states the eligible count and why tracks are excluded", async () => {
    getAtlas.mockResolvedValue(
      snapshot({
        status: "unavailable",
        reason: "too_few_tracks",
        total: 3,
        excluded: [{ trackId: "z", title: "Broken", reason: "not analyzed" }],
      }),
    );
    listTracks.mockResolvedValue([{} as TrackRecord, {} as TrackRecord, {} as TrackRecord]);
    renderPage();
    expect(
      await screen.findByText("The map needs at least three analyzed tracks."),
    ).toBeInTheDocument();
    expect(screen.getByText(/eligible tracks: 2 of 3/)).toBeInTheDocument();
    expect(screen.getByText("not analyzed")).toBeInTheDocument();
  });

  it("explains a degenerate projection", async () => {
    getAtlas.mockResolvedValue(
      snapshot({ status: "unavailable", reason: "insufficient_variance", total: 4 }),
    );
    listTracks.mockResolvedValue([{} as TrackRecord]);
    renderPage();
    expect(await screen.findByText("These tracks measure too alike to map.")).toBeInTheDocument();
  });

  it("selects a track from the list and shows measured neighbours", async () => {
    getAtlas.mockResolvedValue(
      snapshot({
        total: 3,
        points: [point("a", "Alpha", 120), point("bb", "Beta", null), point("ccc", "Gamma", 90)],
        axes: [
          { explained: 0.6, top: [["centroid", 0.7]] },
          { explained: 0.3, top: [["flux", -0.5]] },
        ],
      }),
    );
    listTracks.mockResolvedValue([{} as TrackRecord]);
    getNeighbours.mockResolvedValue([
      {
        trackId: "ccc",
        title: "Gamma",
        artist: null,
        distance: 0.41234,
        contributions: { Timbre: 0.7, Dynamics: 0.3 },
      },
    ]);
    renderPage();

    expect(await screen.findByRole("application")).toBeInTheDocument();
    expect(screen.getByText("Map proximity is approximate")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Track list"));
    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));

    expect(await screen.findByText("0.412")).toBeInTheDocument();
    expect(screen.getByText("differs most in timbre")).toBeInTheDocument();
    expect(getNeighbours).toHaveBeenCalledWith("a", 5);
    expect(screen.queryByText(/%/)).toBeNull();
  });

  const three = () =>
    snapshot({
      total: 3,
      points: [point("a", "Alpha", 120), point("bb", "Beta", null), point("ccc", "Gamma", 90)],
    });

  it("filters by tempo, explains unmeasured tracks and drops hidden selections", async () => {
    getAtlas.mockResolvedValue(three());
    getNeighbours.mockResolvedValue([]);
    renderPage();
    await screen.findByRole("application");

    fireEvent.click(screen.getByLabelText("Track list"));
    fireEvent.click(screen.getByRole("button", { name: "Gamma" }));
    expect(await screen.findByLabelText("Selected: Gamma")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
    fireEvent.change(screen.getByLabelText("Tempo (estimated) minimum, BPM"), {
      target: { value: "100" },
    });

    expect(screen.getByText(/shown by filters/)).toBeInTheDocument();
    expect(screen.getByText(/hidden for a missing/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Beta" })).toBeNull();
    expect(screen.queryByLabelText("Selected: Gamma")).toBeNull();
    expect(screen.getByRole("status", { name: "Atlas status" })).toHaveTextContent(
      "1 selected track hidden by the filter was deselected",
    );
  });

  it("marks an unparseable bound and keeps the map when nothing matches", async () => {
    getAtlas.mockResolvedValue(three());
    renderPage();
    await screen.findByRole("application");

    fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
    const max = screen.getByLabelText("Tempo (estimated) maximum, BPM");
    fireEvent.change(max, { target: { value: "fast" } });
    expect(max).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Enter a number")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });
    expect(screen.getByText("No tracks match these filters.")).toBeInTheDocument();
    expect(screen.getByRole("application")).toBeInTheDocument();
    expect(screen.getByText("Map proximity is approximate")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.queryByText("No tracks match these filters.")).toBeNull();
  });

  it("builds a multi-selection with Ctrl and narrows it from the list", async () => {
    getAtlas.mockResolvedValue(three());
    getNeighbours.mockResolvedValue([]);
    renderPage();
    await screen.findByRole("application");

    fireEvent.click(screen.getByLabelText("Track list"));
    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));
    fireEvent.click(screen.getByRole("button", { name: "Gamma" }), { ctrlKey: true });

    const panel = await screen.findByLabelText("2 tracks selected");
    expect(panel).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Atlas status" })).toHaveTextContent("2 tracks selected");

    fireEvent.click(within(panel).getByRole("button", { name: /Gamma/ }));
    expect(await screen.findByLabelText("Selected: Gamma")).toBeInTheDocument();
  });

  it("toggles region mode and leaves it with Escape", async () => {
    getAtlas.mockResolvedValue(three());
    renderPage();
    const map = await screen.findByRole("application");
    const toggle = screen.getByRole("button", { name: "Select region" });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(map).toHaveAttribute("data-mode", "region");
    fireEvent.keyDown(map, { key: "Escape" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("offers only descriptors that were measured and counts unknowns", async () => {
    getAtlas.mockResolvedValue(
      snapshot({
        total: 3,
        points: [point("a", "Alpha", 120), point("bb", "Beta", null), point("ccc", "Gamma", 90)],
      }),
    );
    renderPage();
    const select = await screen.findByRole("combobox", { name: "Colour by" });
    fireEvent.change(select, { target: { value: "tempoBpm" } });
    expect(screen.getByText(/unknown/)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
