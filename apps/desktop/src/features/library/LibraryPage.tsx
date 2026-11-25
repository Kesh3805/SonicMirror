import { Music } from "lucide-react";
import { useParams } from "react-router";
import { EmptyState } from "../../components/EmptyState";

const TITLES: Record<string, string> = {
  tracks: "Tracks",
  albums: "Albums",
  artists: "Artists",
  collections: "Collections",
};

export function LibraryPage() {
  const { view = "tracks" } = useParams();
  const label = TITLES[view] ?? "Tracks";

  return (
    <div className="sm-page">
      <header className="sm-page-header">
        <h1 className="sm-page-title">Library</h1>
        <p className="sm-eyebrow">{label}</p>
      </header>
      <EmptyState icon={<Music size={32} />} title="No music in your library">
        Your catalog will appear here once a local folder has been imported.
      </EmptyState>
    </div>
  );
}
