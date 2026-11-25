import { Link } from "react-router";
import type { TrackRecord } from "../../ipc/types";
import { formatCodec, formatDuration } from "../../lib/format";

const STATUS_LABEL: Record<TrackRecord["availability"], string | null> = {
  available: null,
  missing: "File missing",
  inaccessible: "Not accessible",
  unsupported: "Unsupported",
  corrupt: "Unreadable",
};

/** A tag value, or a muted dash that says the file had no such tag. */
function TagCell({ value }: { value: string | null }) {
  if (value) return <>{value}</>;
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="sm-visually-hidden">Not in file tags</span>
    </>
  );
}

/**
 * Dense catalog table (Redesign brief §4.3): 32px rows, caps headers, units
 * in headers rather than cells, and tag data in Geist versus decoded facts in
 * mono. Measurement columns arrive with a per-track summary IPC.
 */
export function TracksTable({ tracks }: { tracks: TrackRecord[] }) {
  return (
    <div className="sm-table-frame">
      <table className="sm-table">
        <caption className="sm-visually-hidden">{tracks.length} tracks</caption>
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col" className="sm-col-artist">
              Artist
            </th>
            <th scope="col" className="sm-col-album">
              Album
            </th>
            <th scope="col" className="sm-col-num">
              Dur
            </th>
            <th scope="col" className="sm-col-codec">
              Codec
            </th>
            <th scope="col" className="sm-col-status">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((t) => {
            const status = STATUS_LABEL[t.availability];
            return (
              <tr key={t.id} data-availability={t.availability}>
                <td>
                  <Link to={`/tracks/${t.id}`} className="sm-track-link">
                    {t.title}
                  </Link>
                </td>
                <td className="sm-muted sm-col-artist">
                  <TagCell value={t.artist} />
                </td>
                <td className="sm-muted sm-col-album">
                  <TagCell value={t.album} />
                </td>
                <td className="sm-col-num sm-data">{formatDuration(t.durationMs)}</td>
                <td className="sm-col-codec sm-data">{formatCodec(t.codec)}</td>
                <td className="sm-col-status">{status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
