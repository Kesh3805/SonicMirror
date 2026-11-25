import { EmptyState } from "../../components/EmptyState";

export function AtlasPage() {
  return (
    <div className="sm-page">
      <header className="sm-page-header">
        <h1 className="sm-page-title">Sonic Atlas</h1>
      </header>
      <EmptyState title="The map needs at least three analyzed tracks.">
        The Atlas maps analyzed tracks by their measured acoustic features. It needs at least
        three analyzed tracks.
      </EmptyState>
    </div>
  );
}
