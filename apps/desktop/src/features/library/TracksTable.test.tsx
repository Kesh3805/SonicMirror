import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { TrackRecord } from "../../ipc/types";
import { TracksTable } from "./TracksTable";

const base: TrackRecord = {
  id: "a",
  title: "Pulse Study No. 05",
  artist: null,
  album: null,
  genre: null,
  releaseYear: null,
  durationMs: 30_000,
  sampleRateHz: 44_100,
  channelCount: 2,
  codec: "pcm_s16le",
  availability: "available",
  createdAtMs: 0,
};

function renderTable(tracks: TrackRecord[]) {
  render(
    <MemoryRouter>
      <TracksTable tracks={tracks} />
    </MemoryRouter>,
  );
}

describe("TracksTable", () => {
  it("marks missing tags as absent from the file, not as data", () => {
    renderTable([base]);
    expect(screen.getAllByText("Not in file tags")).toHaveLength(2);
    expect(screen.queryByText(/Unknown/)).not.toBeInTheDocument();
  });

  it("shows decoded facts in display form", () => {
    renderTable([base]);
    const row = screen.getByRole("link", { name: "Pulse Study No. 05" }).closest("tr")!;
    expect(within(row).getByText("PCM")).toBeInTheDocument();
    expect(within(row).getByText("0:30")).toBeInTheDocument();
  });

  it("names unavailable files and stays quiet for available ones", () => {
    renderTable([base, { ...base, id: "b", title: "Gone", availability: "missing" }]);
    expect(screen.getByText("File missing")).toBeInTheDocument();
    expect(screen.queryByText("Available")).not.toBeInTheDocument();
  });
});
