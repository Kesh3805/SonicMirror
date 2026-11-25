// @vitest-environment node
// WCAG 2.2 contrast checks for the design tokens, in both themes.
// Token drift that breaks a pair fails CI (Redesign brief §3.2, A20).
// Read from disk: Vitest stubs CSS imports, including `?raw`.
import { readFileSync } from "node:fs";

const tokensCss = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

type Theme = Record<string, string>;

function parseBlock(css: string, selector: string): Theme {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`missing ${selector}`);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  const out: Theme = {};
  for (const [, name, value] of body.matchAll(/(--sm-[\w-]+)\s*:\s*([^;]+);/g)) {
    if (name && value) out[name] = value.trim();
  }
  return out;
}

const light = parseBlock(tokensCss, ":root");
const dark: Theme = { ...light, ...parseBlock(tokensCss, ":root[data-theme='dark']") };

function resolve(theme: Theme, name: string, depth = 0): string {
  const value = theme[name];
  if (value === undefined) throw new Error(`unknown token ${name}`);
  const alias = value.match(/^var\((--sm-[\w-]+)\)$/);
  if (alias?.[1]) {
    if (depth > 8) throw new Error(`alias loop at ${name}`);
    return resolve(theme, alias[1], depth + 1);
  }
  return value;
}

function luminance(hex: string): number {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m?.[1]) throw new Error(`not a hex colour: ${hex}`);
  const channels = [0, 2, 4].map((i) => parseInt(m[1]!.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(theme: Theme, a: string, b: string): number {
  const [la, lb] = [luminance(resolve(theme, a)), luminance(resolve(theme, b))];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// [foreground, background, minimum ratio, why]
const PAIRS: [string, string, number, string][] = [
  ["--sm-ink", "--sm-paper", 7, "primary text"],
  ["--sm-ink", "--sm-subtle", 7, "text on subtle surfaces"],
  ["--sm-muted", "--sm-paper", 4.5, "secondary text"],
  ["--sm-muted", "--sm-subtle", 4.5, "secondary text on subtle surfaces"],
  ["--sm-muted", "--sm-hover", 4.5, "secondary text on hovered rows"],
  ["--sm-muted", "--sm-selected", 4.5, "secondary text on selected rows"],
  ["--sm-accent-ink", "--sm-accent", 4.5, "primary button label"],
  ["--sm-accent-ink", "--sm-accent-hover", 4.5, "hovered primary button label"],
  ["--sm-accent", "--sm-paper", 3, "selection rules and playhead (non-text)"],
  ["--sm-focus", "--sm-paper", 3, "focus ring (WCAG 1.4.11)"],
  ["--sm-rule-strong", "--sm-paper", 3, "control boundaries (WCAG 1.4.11)"],
  ["--sm-wave", "--sm-paper", 3, "unplayed waveform (graphical object)"],
  ["--sm-wave-played", "--sm-paper", 3, "played waveform (graphical object)"],
  ["--sm-danger", "--sm-paper", 4.5, "error text"],
  // Fills must be distinguishable from the surface they sit on.
  ["--sm-hover", "--sm-paper", 1.12, "hover fill on paper"],
  ["--sm-selected", "--sm-paper", 1.18, "selected fill on paper"],
];

describe.each([
  ["light", light],
  ["dark", dark],
])("%s theme contrast", (_name, theme) => {
  it.each(PAIRS)("%s on %s ≥ %s (%s)", (fg, bg, min) => {
    expect(ratio(theme, fg, bg)).toBeGreaterThanOrEqual(min);
  });

  it("orders the sequential ramp by increasing contrast with the ground", () => {
    const steps = [0, 1, 2, 3, 4].map((i) => ratio(theme, `--sm-seq-${i}`, "--sm-paper"));
    for (let i = 1; i < steps.length; i++) expect(steps[i]!).toBeGreaterThan(steps[i - 1]!);
  });

  it("keeps selection distinct from skeleton fills", () => {
    expect(resolve(theme, "--sm-selected")).not.toBe(resolve(theme, "--sm-inset"));
    expect(resolve(theme, "--sm-selected")).not.toBe(resolve(theme, "--sm-rule-quiet"));
  });
});
