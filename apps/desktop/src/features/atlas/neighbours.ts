// Presentation of original-space neighbour distances (PDS §14 "Atlas"):
// three significant digits, never a percentage of similarity.

/** Three significant digits without exponent notation for typical ranges. */
export function formatDistance(d: number): string {
  if (!Number.isFinite(d) || d < 0) return "—";
  if (d === 0) return "0.00";
  if (d >= 1000) return Math.round(d).toString();
  const digits = Math.max(0, 2 - Math.floor(Math.log10(d)));
  return d.toFixed(Math.min(digits, 6));
}

/** The feature group with the largest share of the squared distance. */
export function dominantGroup(
  contributions: Record<string, number>,
): { label: string; share: number } | null {
  let best: { label: string; share: number } | null = null;
  for (const [label, share] of Object.entries(contributions)) {
    if (share > 0 && (best === null || share > best.share)) best = { label, share };
  }
  return best;
}
