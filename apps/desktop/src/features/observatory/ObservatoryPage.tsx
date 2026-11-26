import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { EmptyState } from "../../components/EmptyState";
import { ErrorNotice } from "../../components/ErrorNotice";
import { Skeleton } from "../../components/Skeleton";
import { ipc } from "../../ipc/client";
import type { TrackRecord } from "../../ipc/types";
import { THIN, formatChannels, formatCodec, formatDuration, formatSampleRate } from "../../lib/format";
import { SpectrogramLane } from "../../visualizations/spectrogram/SpectrogramLane";
import { WaveformCanvas } from "../../visualizations/waveform/WaveformCanvas";
import { buildHeadline } from "./headline";
import { MeasurementGrid } from "./MeasurementGrid";
import { ProvenanceChain } from "./ProvenanceChain";
import "./observatory.css";

const WAVEFORM_BUCKETS = 1600;
const SPECTROGRAM_COLUMNS = 1024;
const SPECTROGRAM_BANDS = 128;

/** "TRACK · PCM · 44.1 kHz · Stereo · 0:30": null parts are omitted, not dashed. */
function kickerFor(t: TrackRecord): string {
  return [
    "TRACK",
    t.codec ? formatCodec(t.codec) : null,
    t.sampleRateHz ? formatSampleRate(t.sampleRateHz) : null,
    t.channelCount ? formatChannels(t.channelCount) : null,
    t.durationMs !== null ? formatDuration(t.durationMs) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function Credits({ track }: { track: TrackRecord }) {
  if (!track.artist && !track.album) {
    return <p className="sm-obs-credits sm-muted">No artist or album in file tags</p>;
  }
  return (
    <p className="sm-obs-credits">
      {track.artist}
      {track.artist && track.album && <span className="sm-muted"> · </span>}
      {track.album && <span className="sm-muted">{track.album}</span>}
    </p>
  );
}

function HeaderSkeleton() {
  return (
    <div className="sm-obs-header" aria-busy="true">
      <Skeleton width={260} height={12} />
      <Skeleton width="60%" height={48} />
      <Skeleton width={220} height={16} />
    </div>
  );
}

/** Track Observatory (Redesign brief §4.4). */
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
  const spectrogram = useQuery({
    queryKey: ["spectrogram", trackId, SPECTROGRAM_COLUMNS, SPECTROGRAM_BANDS],
    queryFn: () => ipc.getSpectrogram(trackId, SPECTROGRAM_COLUMNS, SPECTROGRAM_BANDS),
    enabled: analysis.data != null,
  });

  if (track.isPending) {
    return (
      <div className="sm-page">
        <HeaderSkeleton />
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
  const headline = analysis.data ? buildHeadline(analysis.data.features) : null;

  return (
    <div className="sm-page sm-obs">
      <header className="sm-obs-header">
        <p className="sm-kicker-data">{kickerFor(t)}</p>
        <h1 className="sm-obs-title">{t.title}</h1>
        <Credits track={t} />
        <div className="sm-obs-actions">
          <Link className="sm-button sm-button-secondary" to={`/compare?a=${t.id}`}>
            Compare
          </Link>
        </div>
      </header>

      <div className="sm-obs-lead">
        {headline && (
          <p className="sm-headline">
            {headline.map((part, i) =>
              "text" in part ? (
                <span key={i}>{part.text}</span>
              ) : (
                <span key={i} className="sm-data">
                  {part.value}
                  {THIN}
                  {part.unit}
                </span>
              ),
            )}
          </p>
        )}
        {analysis.isError ? (
          <ErrorNotice error={analysis.error} onRetry={() => void analysis.refetch()} />
        ) : (
          analysis.isSuccess && <ProvenanceChain analysis={analysis.data} />
        )}
      </div>

      {analysis.data === null && (
        <EmptyState title="Not analyzed yet." size="section">
          This track is in the catalog, but no measurements exist. Nothing here is estimated.
        </EmptyState>
      )}

      {analysis.data && (
        <div className="sm-obs-body">
          <section className="sm-obs-lanes" aria-labelledby="signal-heading">
            <h2 id="signal-heading" className="sm-section-title">
              Signal
            </h2>
            {waveform.data ? (
              <WaveformCanvas view={waveform.data} />
            ) : waveform.isError ? (
              <ErrorNotice error={waveform.error} onRetry={() => void waveform.refetch()} />
            ) : (
              <Skeleton height={176} />
            )}
            {spectrogram.data ? (
              <SpectrogramLane
                view={spectrogram.data}
                trackDurationMs={waveform.data?.durationMs ?? spectrogram.data.durationMs}
              />
            ) : spectrogram.isError ? (
              <ErrorNotice error={spectrogram.error} onRetry={() => void spectrogram.refetch()} />
            ) : (
              <Skeleton height={232} />
            )}
          </section>

          <section className="sm-obs-measures" aria-label="Acoustic measurements">
            <MeasurementGrid features={analysis.data.features} />
          </section>
        </div>
      )}
    </div>
  );
}
