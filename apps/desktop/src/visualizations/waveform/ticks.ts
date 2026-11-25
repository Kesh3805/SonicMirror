// "Nice" time ticks at 1, 2 or 5 × powers of ten seconds, aiming for 5–8
// ticks across the duration (PDS §14).

const STEPS_SECONDS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];

export function niceTimeTicks(durationMs: number, maxTicks = 8): number[] {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return [];
  const seconds = durationMs / 1000;
  const step = STEPS_SECONDS.find((s) => seconds / s <= maxTicks) ?? 3600;
  const ticks: number[] = [];
  for (let t = 0; t <= seconds + 1e-9; t += step) ticks.push(Math.round(t * 1000));
  return ticks;
}
