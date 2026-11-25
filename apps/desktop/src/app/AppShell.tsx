import { AudioLines, HardDrive, Library, Orbit, PanelsTopLeft, Settings } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router";
import { PlaybackStrip } from "../features/playback/PlaybackStrip";
import "./shell.css";

const LIBRARY_VIEWS = [
  { to: "/library/tracks", label: "Tracks" },
  { to: "/library/albums", label: "Albums" },
  { to: "/library/artists", label: "Artists" },
  { to: "/library/collections", label: "Collections" },
] as const;

const BREADCRUMBS: Record<string, string> = {
  overview: "Overview",
  library: "Library",
  atlas: "Sonic Atlas",
  settings: "Settings",
};

function breadcrumbFor(pathname: string): string {
  const [section = "", view] = pathname.split("/").filter(Boolean);
  const base = BREADCRUMBS[section] ?? "";
  const child = LIBRARY_VIEWS.find((v) => v.to === `/${section}/${view}`);
  return child ? `${base} / ${child.label}` : base;
}

/** PDS §3: grid rows 48px / 1fr / 72px, rail + workspace in the middle row. */
export function AppShell() {
  const { pathname } = useLocation();
  const inLibrary = pathname.startsWith("/library");

  return (
    <div className="sm-shell">
      <header className="sm-topbar">
        <span className="sm-brand">
          <AudioLines size={20} aria-hidden="true" />
          <span className="sm-brand-text">SonicMirror</span>
        </span>
        <span className="sm-breadcrumb">{breadcrumbFor(pathname)}</span>
      </header>

      <div className="sm-middle">
        <nav className="sm-rail" aria-label="Primary">
          <NavLink className="sm-nav-link" to="/overview">
            <PanelsTopLeft size={18} aria-hidden="true" />
            <span className="sm-nav-label">Overview</span>
          </NavLink>
          <NavLink className="sm-nav-link" to="/library">
            <Library size={18} aria-hidden="true" />
            <span className="sm-nav-label">Library</span>
          </NavLink>
          {inLibrary &&
            LIBRARY_VIEWS.map((view) => (
              <NavLink key={view.to} className="sm-nav-link sm-nav-sub" to={view.to}>
                {view.label}
              </NavLink>
            ))}
          <NavLink className="sm-nav-link" to="/atlas">
            <Orbit size={18} aria-hidden="true" />
            <span className="sm-nav-label">Atlas</span>
          </NavLink>

          <span className="sm-rail-spacer" />

          <NavLink className="sm-nav-link" to="/settings">
            <Settings size={18} aria-hidden="true" />
            <span className="sm-nav-label">Settings</span>
          </NavLink>
          <p className="sm-rail-status">
            <HardDrive size={14} aria-hidden="true" />
            <span className="sm-rail-status-text">Local library</span>
          </p>
        </nav>

        <main className="sm-main" id="main">
          <Outlet />
        </main>
      </div>

      <PlaybackStrip />
    </div>
  );
}
