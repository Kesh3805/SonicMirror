import { Link } from "react-router";
import type { TrackRecord } from "../../ipc/types";
import { formatDuration } from "../../lib/format";

/** PDS §7 tracks table (non-virtualized slice: title, artist, album, duration, format). */
export function TracksTable({ tracks }: { tracks: TrackRecord[] }) {
  return (
    <table className="sm-table">
      <caption className="sm-visually-hidden">{tracks.length} tracks</caption>
      <thead>
        <tr>
          <th scope="col">Title</th>
          <th scope="col">Artist</th>
          <th scope="col" className="sm-col-album">
            Album
          </th>
          <th scope="col" className="sm-col-num">
            Duration
          </th>
          <th scope="col" className="sm-col-format">
            Format
          </th>
        </tr>
      </thead>
      <tbody>
        {tracks.map((t) => (
          <tr key={t.id}>
            <td>
              <Link to={`/tracks/${t.id}`} className="sm-track-link">
                {t.title}
              </Link>
            </td>
            <td className="sm-muted">{t.artist ?? "Unknown artist"}</td>
            <td className="sm-muted sm-col-album">{t.album ?? "Unknown album"}</td>
            <td className="sm-col-num sm-data">{formatDuration(t.durationMs)}</td>
            <td className="sm-col-format sm-data">{t.codec?.toUpperCase() ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
