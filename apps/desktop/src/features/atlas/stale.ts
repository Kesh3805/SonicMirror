// Wording for a stale Atlas snapshot (PDS §9 "Stale").

import type { AtlasChanges } from "../../ipc/types";
import { formatCount } from "../../lib/format";

/** "Tracks: 2 added and 1 reanalyzed since this map was made." */
export function changeSummary(c: AtlasChanges): string {
  const parts = [
    c.added > 0 ? `${formatCount(c.added)} added` : null,
    c.changed > 0 ? `${formatCount(c.changed)} reanalyzed` : null,
    c.removed > 0 ? `${formatCount(c.removed)} removed` : null,
  ].filter((p): p is string => p !== null);
  if (parts.length === 0) return "The analysis engine has changed since this map was made.";
  const list =
    parts.length === 1 ? parts[0]! : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)!}`;
  const n = c.added + c.changed + c.removed;
  return `${n === 1 ? "One track" : "Tracks"}: ${list} since this map was made.`;
}
