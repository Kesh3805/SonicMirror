// Stat-as-sentence headline (Redesign brief §4.4, A13): the finding stated in
// words before the figures, built only from valid measurements. The engine
// decides validity (including the tempo confidence threshold); this module
// never re-implements those rules.
import type { AudioFeature } from "../../ipc/types";
import { THIN, formatBpm, formatDecibels } from "../../lib/format";

/** Plain text, or a measured value to be set in mono. */
export type HeadlinePart = { text: string } | { value: string; unit: string };

function valid(features: AudioFeature[], key: string): number | null {
  const f = features.find((x) => x.key === key);
  return f?.status === "valid" && typeof f.value === "number" ? f.value : null;
}

/** The headline parts, or null when no headline-worthy measurement is valid. */
export function buildHeadline(features: AudioFeature[]): HeadlinePart[] | null {
  const lufs = valid(features, "integrated_loudness");
  const bpm = valid(features, "tempo_bpm");

  if (lufs !== null && bpm !== null) {
    return [
      { text: "Integrated at " },
      { value: formatDecibels(lufs), unit: "LUFS" },
      { text: ", with an estimated pulse near " },
      { value: formatBpm(bpm), unit: "BPM" },
      { text: "." },
    ];
  }
  if (lufs !== null) {
    return [{ text: "Integrated at " }, { value: formatDecibels(lufs), unit: "LUFS" }, { text: "." }];
  }
  if (bpm !== null) {
    return [{ text: "An estimated pulse near " }, { value: formatBpm(bpm), unit: "BPM" }, { text: "." }];
  }
  return null;
}

/** The headline as a single string, for accessible names and tests. */
export function headlineText(parts: HeadlinePart[]): string {
  return parts.map((p) => ("text" in p ? p.text : `${p.value}${THIN}${p.unit}`)).join("");
}
