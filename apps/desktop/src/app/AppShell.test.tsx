import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "./App";

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

describe("AppShell", () => {
  it("redirects the root route to Overview", async () => {
    renderAt("/");
    expect(await screen.findByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
  });

  it("shows only implemented primary destinations", async () => {
    renderAt("/overview");
    const nav = await screen.findByRole("navigation", { name: "Primary" });
    const labels = Array.from(nav.querySelectorAll("a")).map((a) => a.textContent);
    expect(labels).toEqual(["Overview", "Library", "Atlas", "Settings"]);
  });

  it("marks Library current and expands its views on library routes", async () => {
    renderAt("/library/albums");
    const library = await screen.findByRole("link", { name: "Library" });
    expect(library).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Albums" })).toHaveAttribute("aria-current", "page");
  });

  it("renders an honest empty player with no dead controls", async () => {
    renderAt("/atlas");
    expect(await screen.findByText("Nothing playing")).toBeInTheDocument();
    const player = screen.getByRole("contentinfo", { name: "Playback" });
    expect(player.querySelectorAll("button, input")).toHaveLength(0);
  });

  it("shows the current location as a breadcrumb", async () => {
    renderAt("/library/albums");
    const crumbs = await screen.findByRole("navigation", { name: "Breadcrumb" });
    expect(crumbs).toHaveTextContent("Library/Albums");
  });

  it("omits the track count when the catalog is unavailable", async () => {
    renderAt("/overview");
    expect(await screen.findByText("LOCAL · this device")).toBeInTheDocument();
    expect(screen.queryByText(/\d+ tracks?$/)).not.toBeInTheDocument();
  });
});
