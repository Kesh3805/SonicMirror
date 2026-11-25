import { Orbit } from "lucide-react";
import { EmptyState } from "../../components/EmptyState";

export function AtlasPage() {
  return (
    <div className="sm-page">
      <header className="sm-page-header">
        <h1 className="sm-page-title">Sonic Atlas</h1>
      </header>
      <EmptyState icon={<Orbit size={32} />} title="Import music to build your Atlas">
        The Atlas maps analyzed tracks by their measured acoustic features. It needs at least
        three analyzed tracks.
      </EmptyState>
    </div>
  );
}
