import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AtlasPoint, AtlasSnapshot, TrackRecord } from "../../ipc/types";
import { formatDate } from "../../lib/format";
import { AtlasPage } from "./AtlasPage";

const getAtlas = vi.fn<() => Promise<AtlasSnapshot>>();
const listTracks = vi.fn<() => Promise<TrackRecord[]>>();
const getNeighbours = vi.fn();
const refreshAtlas = vi.fn<() => Promise<AtlasSnapshot>>();

vi.mock("../../ipc/client", async (original) => ({
  ...(await original<typeof import("../../ipc/client")>()),
  ipc: {
    getAtlas: () => getAtlas(),
    listTracks: () => listTracks(),
    getNeighbours: (id: string, k: number) => getNeighbours(id, k),
    refreshAtlas: () => refreshAtlas(),
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
  snapshotId: "s1",
  createdAtMs: Date.UTC(2026, 10, 23, 14, 2),
  stale: false,
  changes: { added: 0, changed: 0, removed: 0 },
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
  const placed = () => [point("a", "Alpha", 120), point("bb", "Beta", null), point("ccc", "Gamma", 90)];

  it("shows when the map was made and no banner while it is current", async () => {
    getAtlas.mockResolvedValue(snapshot({ total: 3, points: placed() }));
    renderPage();
    expect(await screen.findByText(/mapped/)).toBeInTheDocument();
    const when = formatDate(Date.UTC(2026, 10, 23, 14, 2), { time: true });
    expect(screen.getByText(when, { selector: "time" })).toBeInTheDocument();
    expect(screen.queryByText("New or changed analysis available")).toBeNull();
  });

  it("keeps a stale map, says what changed and refreshes on request", async () => {
    getAtlas.mockResolvedValue(
      snapshot({
        total: 5,
        points: placed(),
        stale: true,
        changes: { added: 1, changed: 1, removed: 0 },
        excluded: [
          { trackId: "d", title: "Delta", reason: "added since this map" },
          { trackId: "e", title: "Echo", reason: "reanalyzed since this map" },
        ],
      }),
    );
    refreshAtlas.mockResolvedValue(
      snapshot({ snapshotId: "s2", total: 5, points: [...placed(), point("dddd", "Delta", 100)] }),
    );
    renderPage();

    expect(await screen.findByText("New or changed analysis available")).toBeInTheDocument();
    expect(
      screen.getByText(/Tracks: 1 added and 1 reanalyzed since this map was made\./),
    ).toBeInTheDocument();
    expect(screen.getByRole("application")).toBeInTheDocument();

    const banner = screen.getByRole("status", { name: "Map is out of date" });
    fireEvent.click(within(banner).getByRole("button", { name: "Refresh map" }));
    await waitFor(() => expect(refreshAtlas).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText("New or changed analysis available")).toBeNull());
    expect(document.querySelector(".sm-atlas-coverage")).toHaveTextContent(/^4 of 5 tracks placed/);
  });

  it("links a neighbour that is not on this map to its Observatory page", async () => {
    getAtlas.mockResolvedValue(snapshot({ total: 4, points: placed(), stale: true }));
    getNeighbours.mockResolvedValue([
      {
        trackId: "zz",
        title: "Zulu",
        artist: null,
        distance: 0.3,
        contributions: { Timbre: 1 },
      },
    ]);
    renderPage();
    await screen.findByRole("application");
    fireEvent.click(screen.getByLabelText("Track list"));
    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));
    const link = await screen.findByRole("link", { name: /Zulu/ });
    expect(link).toHaveAttribute("href", "/tracks/zz");
    expect(within(link).getByText(/not on this map/)).toBeInTheDocument();
  });

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
