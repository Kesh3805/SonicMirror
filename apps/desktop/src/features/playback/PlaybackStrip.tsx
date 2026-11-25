import "./playback.css";

/**
 * Playback strip (Redesign brief §4.1, A7). Until the native audio service
 * exists (E09) it shows an honest empty state and no controls: no disabled
 * transport, no dead volume slider. The controls return in one change together
 * with playback.
 */
export function PlaybackStrip() {
  return (
    <footer className="sm-player" aria-label="Playback">
      <p className="sm-player-empty">Nothing playing</p>
      <p className="sm-player-note sm-kicker-data">Playback arrives with the native audio service</p>
    </footer>
  );
}
