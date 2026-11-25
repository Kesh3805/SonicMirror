import { FolderOpen } from "lucide-react";
import { EmptyState } from "../../components/EmptyState";

export function OverviewPage() {
  return (
    <div className="sm-page">
      <header className="sm-page-header">
        <p className="sm-eyebrow">Your collection</p>
        <h1 className="sm-page-title">Overview</h1>
      </header>
      <EmptyState icon={<FolderOpen size={32} />} title="No music in your library">
        Importing local folders arrives with the native catalog. Your files will be analyzed on
        this device and never modified.
      </EmptyState>
    </div>
  );
}
