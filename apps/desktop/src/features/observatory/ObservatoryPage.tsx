import { useQuery } from "@tanstack/react-query";
import { Music } from "lucide-react";
import { Link, useParams } from "react-router";
import { EmptyState } from "../../components/EmptyState";
import { ErrorNotice } from "../../components/ErrorNotice";
import { ipc } from "../../ipc/client";
import { formatChannels, formatDuration, formatSampleRate } from "../../lib/format";
import { WaveformCanvas } from "../../visualizations/waveform/WaveformCanvas";
import { MeasurementGrid } from "./MeasurementGrid";
import "./observatory.css";

const WAVEFORM_BUCKETS = 1600;

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** PDS §8 Track Observatory: header, provenance, waveform, measurements. */
export function ObservatoryPage() {
  const { trackId = "" } = useParams();
  const track = useQuery({ queryKey: ["track", trackId], queryFn: () => ipc.getTrack(trackId) });
  const analysis = useQuery({
    queryKey: ["analysis", trackId],
    queryFn: () => ipc.getAnalysis(trackId),
  });
  const waveform = useQuery({
    queryKey: ["waveform", trackId, WAVEFORM_BUCKETS],
    queryFn: () => ipc.getWaveform(trackId, WAVEFORM_BUCKETS),
    enabled: analysis.data != null,
  });

  if (track.isPending) {
    return (
      <div className="sm-page" aria-busy="true">
        <div className="sm-skeleton sm-obs-header-skeleton" />
      </div>
    );
  }
  if (track.isError) {
    return (
      <div className="sm-page">
        <ErrorNotice error={track.error} onRetry={() => void track.refetch()} />
      </div>
    );
  }

  const t = track.data;
  const technical = [
    t.codec?.toUpperCase(),
    formatSampleRate(t.sampleRateHz),
    formatChannels(t.channelCount),
    formatDuration(t.durationMs),
  ].filter(Boolean);

  return (
    <div className="sm-page">
      <nav className="sm-breadcrumb-nav" aria-label="Breadcrumb">
        <Link to="/library/tracks">Library</Link> <span aria-hidden="true">/</span>{" "}
        <span aria-current="page">{t.title}</span>
      </nav>

      <header className="sm-obs-header">
        <div className="sm-obs-art" aria-hidden="true">
          <Music size={24} />
        </div>
        <div className="sm-obs-heading">
          <h1 className="sm-page-title">{t.title}</h1>
          <p className="sm-obs-credits">
            {t.artist ?? "Unknown artist"}
            {t.album ? ` · ${t.album}` : ""}
          </p>
          <p className="sm-obs-technical sm-data">{technical.join(" · ")}</p>
        </div>
      </header>

      {analysis.isError && (
        <ErrorNotice error={analysis.error} onRetry={() => void analysis.refetch()} />
      )}

      {analysis.data === null && (
        <EmptyState title="Not analyzed yet." size="section">
          This track is in the catalog but has no analysis.
        </EmptyState>
      )}

      {analysis.data && (
        <>
          <p className="sm-provenance sm-data">
            <span>{analysis.data.status === "complete" ? "Analyzed" : "Partially analyzed"}</span>
            <span>{formatTimestamp(analysis.data.completedAtMs)}</span>
            <span>{analysis.data.engineVersion}</span>
          </p>

          <section className="sm-obs-section" aria-labelledby="waveform-heading">
            <h2 id="waveform-heading" className="sm-section-heading">
              Waveform
            </h2>
            {waveform.data ? (
              <WaveformCanvas view={waveform.data} />
            ) : waveform.isError ? (
              <ErrorNotice error={waveform.error} onRetry={() => void waveform.refetch()} />
            ) : (
              <div className="sm-skeleton sm-waveform-skeleton" aria-busy="true" />
            )}
          </section>

          <section className="sm-obs-section" aria-labelledby="measurements-heading">
            <h2 id="measurements-heading" className="sm-section-heading">
              Acoustic measurements
            </h2>
            <MeasurementGrid features={analysis.data.features} />
          </section>
        </>
      )}
    </div>
  );
}
