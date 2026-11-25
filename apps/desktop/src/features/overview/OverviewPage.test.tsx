import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { TrackRecord } from "../../ipc/types";
import { THIN } from "../../lib/format";
import { OverviewPage } from "./OverviewPage";

const track = (id: string, over: Partial<TrackRecord> = {}): TrackRecord => ({
  id,
  title: `Track ${id}`,
  artist: "Artist A",
  album: "Album A",
  genre: null,
  releaseYear: null,
  durationMs: 60_000,
  sampleRateHz: 44_100,
  channelCount: 2,
  codec: "flac",
  availability: "available",
  createdAtMs: Number(id) * 1000,
  ...over,
});

function renderWith(tracks: TrackRecord[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(["tracks"], tracks);
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("OverviewPage", () => {
  it("derives every count from the one catalog query", () => {
    renderWith([
      track("1"),
      track("2", { artist: "Artist B" }),
      track("3", { album: null, durationMs: null }),
    ]);
    const counts = screen.getByRole("region", { name: "Collection counts" });
    const value = (label: string) => within(counts).getByText(label).nextElementSibling?.textContent;
    expect(value("Tracks")).toBe("3");
    expect(value("Artists")).toBe("2");
    expect(value("Albums")).toBe("1");
    expect(value("Total duration")).toBe(`2${THIN}min`);
    expect(screen.getByText("Duration unknown for 1 track.")).toBeInTheDocument();
  });

  it("lists the most recent additions first", () => {
    renderWith([track("1"), track("3"), track("2")]);
    const titles = within(screen.getByRole("list")).getAllByRole("link").map((a) => a.textContent);
    expect(titles).toEqual(["Track 3", "Track 2", "Track 1"]);
  });

  it("shows a typographic empty state instead of zero tiles", () => {
    renderWith([]);
    expect(screen.getByRole("heading", { name: "Nothing observed yet." })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Collection counts" })).not.toBeInTheDocument();
  });
});
