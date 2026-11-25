import { Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import "./playback.css";

/**
 * PDS §12 empty state: "No track selected", transport disabled.
 * Playback state will be owned by the native playback service (E09).
 */
export function PlaybackStrip() {
  return (
    <footer className="sm-player" aria-label="Playback">
      <div className="sm-player-track">
        <span className="sm-player-art" aria-hidden="true" />
        <span className="sm-player-empty">No track selected</span>
      </div>
      <div className="sm-player-transport">
        <div className="sm-player-buttons">
          <button type="button" className="sm-icon-button" aria-label="Previous track" disabled>
            <SkipBack size={18} aria-hidden="true" />
          </button>
          <button type="button" className="sm-play-button" aria-label="Play" disabled>
            <Play size={18} aria-hidden="true" />
          </button>
          <button type="button" className="sm-icon-button" aria-label="Next track" disabled>
            <SkipForward size={18} aria-hidden="true" />
          </button>
        </div>
        <span className="sm-player-time sm-data">— / —</span>
      </div>
      <div className="sm-player-volume">
        <Volume2 size={18} aria-hidden="true" />
        <input type="range" min={0} max={100} defaultValue={70} aria-label="Volume" />
      </div>
    </footer>
  );
}
