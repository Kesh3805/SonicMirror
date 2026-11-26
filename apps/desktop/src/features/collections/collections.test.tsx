import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CollectionSummary, TrackRecord } from "../../ipc/types";
import { CollectionPage } from "./CollectionPage";
import { CollectionsView } from "./CollectionsView";

const api = {
  listCollections: vi.fn<() => Promise<CollectionSummary[]>>(),
  getCollection: vi.fn<(id: string) => Promise<CollectionSummary>>(),
  collectionTracks: vi.fn<(id: string) => Promise<TrackRecord[]>>(),
  createCollection: vi.fn<(name: string, ids: string[]) => Promise<CollectionSummary>>(),
  renameCollection: vi.fn<(id: string, name: string) => Promise<CollectionSummary>>(),
  deleteCollection: vi.fn<(id: string) => Promise<null>>(),
  addToCollection: vi.fn(),
  removeFromCollection: vi.fn(),
  listTracks: vi.fn<() => Promise<TrackRecord[]>>(),
};

vi.mock("../../ipc/client", async (original) => ({
  ...(await original<typeof import("../../ipc/client")>()),
  ipc: new Proxy({}, { get: (_t, key: string) => api[key as keyof typeof api] }),
}));

const track = (id: string, title: string): TrackRecord => ({
  id,
  title,
  artist: null,
  album: null,
  genre: null,
  releaseYear: null,
  durationMs: 61_000,
  sampleRateHz: 44_100,
  channelCount: 2,
  codec: null,
  availability: "available",
  createdAtMs: 0,
});

const summary = (over: Partial<CollectionSummary> = {}): CollectionSummary => ({
  id: "c1",
  name: "Quiet",
  trackCount: 2,
  createdAtMs: 0,
  updatedAtMs: 0,
  ...over,
});

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>;
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/library/collections" element={<CollectionsView />} />
          <Route path="/library/collections/:collectionId" element={<CollectionPage />} />
        </Routes>
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listTracks.mockResolvedValue([track("a", "Alpha"), track("b", "Beta"), track("c", "Gamma")]);
  api.getCollection.mockResolvedValue(summary());
  api.collectionTracks.mockResolvedValue([track("a", "Alpha"), track("b", "Beta")]);
});

describe("Collections", () => {
  it("offers to create the first collection and validates the name inline", async () => {
    api.listCollections.mockResolvedValue([]);
    api.createCollection.mockResolvedValue(summary({ id: "new", name: "Night", trackCount: 0 }));
    renderAt("/library/collections");

    fireEvent.click(await screen.findByRole("button", { name: "New collection" }));
    const dialog = screen.getByRole("dialog", { name: "New collection" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));
    expect(within(dialog).getByText("Enter a name.")).toBeInTheDocument();
    expect(api.createCollection).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "  Night " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));
    await waitFor(() => expect(api.createCollection).toHaveBeenCalledWith("Night", []));
    await waitFor(() =>
      expect(screen.getByTestId("where")).toHaveTextContent("/library/collections/new"),
    );
  });

  it("lists collections with their sizes", async () => {
    api.listCollections.mockResolvedValue([summary(), summary({ id: "c2", name: "Solo", trackCount: 1 })]);
    renderAt("/library/collections");
    const card = await screen.findByRole("link", { name: /Quiet/ });
    expect(card).toHaveAttribute("href", "/library/collections/c1");
    expect(within(card).getByText("2 tracks")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Solo/ })).toHaveTextContent("1 track");
  });

  it("removes a member without deleting the track and says so", async () => {
    api.removeFromCollection.mockResolvedValue({ changed: 1, unchanged: 0 });
    renderAt("/library/collections/c1");
    fireEvent.click(await screen.findByRole("button", { name: "Remove Alpha from Quiet" }));
    await waitFor(() => expect(api.removeFromCollection).toHaveBeenCalledWith("c1", ["a"]));
    expect(
      await screen.findByText(/Removed Alpha from this collection\. The track is still in your library\./),
    ).toBeInTheDocument();
  });

  it("adds tracks, marking current members as already present", async () => {
    api.addToCollection.mockResolvedValue({ changed: 1, unchanged: 0 });
    renderAt("/library/collections/c1");
    fireEvent.click(await screen.findByRole("button", { name: "Add tracks" }));
    const dialog = screen.getByRole("dialog", { name: "Add tracks to Quiet" });
    const alpha = await within(dialog).findByRole("checkbox", { name: /Alpha/ });
    expect(alpha).toBeChecked();
    expect(alpha).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Gamma/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add 1 track" }));
    await waitFor(() => expect(api.addToCollection).toHaveBeenCalledWith("c1", ["c"]));
    expect(await screen.findByText("Added 1 track.")).toBeInTheDocument();
  });

  it("confirms deletion of the collection only, then returns to the list", async () => {
    api.deleteCollection.mockResolvedValue(null);
    api.listCollections.mockResolvedValue([]);
    renderAt("/library/collections/c1");
    fireEvent.click(await screen.findByRole("button", { name: "Delete collection" }));
    const dialog = screen.getByRole("dialog", { name: "Delete “Quiet”?" });
    expect(within(dialog).getByText(/no audio files are touched/)).toBeInTheDocument();
    expect(within(dialog).getByText(/2 tracks stay/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete collection" }));
    await waitFor(() => expect(api.deleteCollection).toHaveBeenCalledWith("c1"));
    await waitFor(() =>
      expect(screen.getByTestId("where")).toHaveTextContent(/^\/library\/collections$/),
    );
  });

  it("renames in place", async () => {
    api.renameCollection.mockResolvedValue(summary({ name: "Loud" }));
    renderAt("/library/collections/c1");
    fireEvent.click(await screen.findByRole("button", { name: "Rename" }));
    const dialog = screen.getByRole("dialog", { name: "Rename collection" });
    const field = within(dialog).getByLabelText("Name");
    expect(field).toHaveValue("Quiet");
    fireEvent.change(field, { target: { value: "Loud" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Rename" }));
    await waitFor(() => expect(api.renameCollection).toHaveBeenCalledWith("c1", "Loud"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("explains a collection that no longer exists", async () => {
    api.getCollection.mockRejectedValue({ code: "catalog.not_found", message: "not found", recoverable: false });
    renderAt("/library/collections/gone");
    expect(await screen.findByText("This collection no longer exists.")).toBeInTheDocument();
  });
});
