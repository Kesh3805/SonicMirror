import { useQuery } from "@tanstack/react-query";
import { Library, Orbit, PanelsTopLeft, Settings } from "lucide-react";
import { Fragment } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { PlaybackStrip } from "../features/playback/PlaybackStrip";
import { ipc } from "../ipc/client";
import { formatCount } from "../lib/format";
import "./shell.css";

const LIBRARY_VIEWS = [
  { to: "/library/tracks", label: "Tracks" },
  { to: "/library/albums", label: "Albums" },
  { to: "/library/artists", label: "Artists" },
  { to: "/library/collections", label: "Collections" },
] as const;

const SECTIONS: Record<string, string> = {
  overview: "Overview",
  library: "Library",
  tracks: "Library",
  atlas: "Atlas",
  settings: "Settings",
};

/** The signature mark: a short tick standing on a baseline. */
function Mark() {
  return (
    <svg className="sm-mark" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3.5 2v8.5M1 10.5h10" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  );
}

function useBreadcrumb(pathname: string): string[] {
  const [section = "", child] = pathname.split("/").filter(Boolean);
  const isTrack = section === "tracks" && Boolean(child);
  // Reads the same cached query the Observatory uses; no extra request.
  const track = useQuery({
    queryKey: ["track", child],
    queryFn: () => ipc.getTrack(child ?? ""),
    enabled: isTrack,
  });
  const base = SECTIONS[section];
  if (!base) return [];
  if (isTrack) return [base, track.data?.title ?? "Track"];
  const view = LIBRARY_VIEWS.find((v) => v.to === `/${section}/${child}`);
  return view ? [base, view.label] : [base];
}

/** Rail foot: the real local track count, omitted until it is known. */
function LibraryStatus() {
  const tracks = useQuery({ queryKey: ["tracks"], queryFn: ipc.listTracks });
  const count = tracks.data?.length;
  return (
    <div className="sm-rail-foot sm-kicker-data">
      <span>LOCAL · this device</span>
      {count !== undefined && (
        <span>
          {formatCount(count)} {count === 1 ? "track" : "tracks"}
        </span>
      )}
    </div>
  );
}

/** Shell grid: 44px top bar / content / 56px player; 224px rail + workspace. */
export function AppShell() {
  const { pathname } = useLocation();
  const inLibrary = pathname.startsWith("/library");
  const crumbs = useBreadcrumb(pathname);

  return (
    <div className="sm-shell">
      <header className="sm-topbar">
        <span className="sm-brand">
          <Mark />
          <span className="sm-brand-text">SonicMirror</span>
        </span>
        <nav className="sm-breadcrumb" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <Fragment key={`${i}-${c}`}>
              {i > 0 && (
                <span className="sm-breadcrumb-sep" aria-hidden="true">
                  /
                </span>
              )}
              <span aria-current={i === crumbs.length - 1 ? "page" : undefined}>{c}</span>
            </Fragment>
          ))}
        </nav>
      </header>

      <div className="sm-middle">
        <nav className="sm-rail" aria-label="Primary">
          <NavLink className="sm-nav-link" to="/overview">
            <PanelsTopLeft size={16} aria-hidden="true" />
            <span className="sm-nav-label">Overview</span>
          </NavLink>
          <NavLink
            className={inLibrary ? "sm-nav-link sm-nav-ancestor" : "sm-nav-link"}
            to="/library"
            end
          >
            <Library size={16} aria-hidden="true" />
            <span className="sm-nav-label">Library</span>
          </NavLink>
          {inLibrary &&
            LIBRARY_VIEWS.map((view) => (
              <NavLink key={view.to} className="sm-nav-link sm-nav-sub" to={view.to}>
                {view.label}
              </NavLink>
            ))}
          <NavLink className="sm-nav-link" to="/atlas">
            <Orbit size={16} aria-hidden="true" />
            <span className="sm-nav-label">Atlas</span>
          </NavLink>

          <span className="sm-rail-spacer" />

          <NavLink className="sm-nav-link" to="/settings">
            <Settings size={16} aria-hidden="true" />
            <span className="sm-nav-label">Settings</span>
          </NavLink>
          <LibraryStatus />
        </nav>

        <main className="sm-main" id="main">
          <Outlet />
        </main>
      </div>

      <PlaybackStrip />
    </div>
  );
}
