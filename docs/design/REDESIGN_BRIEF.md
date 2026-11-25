# SonicMirror Redesign Brief

Version 1 · 25 Nov 2026 · Lead product design
Inputs: eight research lenses (652 unique sites, 586 visited) and the current code: `apps/desktop/src/design-system/tokens.css`, `base.css`, `app/AppShell.tsx`, `app/shell.css`, `features/library/*`, `features/observatory/*`, `features/playback/*`, `visualizations/waveform/*`, `components/*`, PDS v1.0 and PRD v1.0.

The brief evolves PDS 1.0; it does not replace it. Where this brief changes a value, `tokens.css` stays the canonical source and the PDS should be amended in the same commit.

---

## 1. Diagnosis of the current UI

### What already works (keep it)

- **Honesty plumbing.** `MeasurementGrid` never substitutes zero. Every unavailable value shows "Not available" plus a reason taken from `UNAVAILABLE_REASONS`, such as "Too short to estimate tempo (under 8 s)". Tempo carries "Estimated · n confidence". The best measurement tools (Smaart, Youlean, iZotope) work the same way, and it is SonicMirror's moat.
- **A real waveform.** `WaveformCanvas` draws one min/max stroke per pixel column from real extrema, with a fixed −1..+1 scale, a zero baseline, nice time ticks and an accessible label that states the real peak. No smoothing and no per-track normalisation. Keep the algorithm untouched.
- **Token architecture.** Semantic `--sm-*` variables, a `data-theme` light/dark swap, reduced-motion zeroing and a z-index ladder are all in place. The type trio is bundled locally through `@fontsource` (Instrument Serif 400 and italic, Geist 400/500/600, Plex Mono 400/500), with no CDN.
- **Provenance.** The Observatory already shows engine version and analysis time, and the import summary says "analyzed on this device and were not modified". This is the right voice.
- **Accessibility basics.** There is a 2px focus outline with offset, `forced-colors` handling, a visually hidden table caption, `aria-busy` skeletons and `role="alert"` notices.

### What reads as generic or unfinished (concrete)

1. **The accent is spent everywhere, so it means nothing.** Oxide `#A53726` is used for:
   - the brand icon;
   - the active nav item, as a 3px left border, a pink `--sm-selected #F3DED5` fill *and* oxide label text;
   - the round play button fill;
   - the primary button fill;
   - range accent-color;
   - and, worst, the entire unplayed waveform (`--sm-wave: #A53726`).

   The waveform is the most important shape in the app, and today it is a red blob. The strongest references (u-he, Sonos, SoundCloud using orange 8 times against 97 neutrals, Audio Hijack's "orange only for live") cap the accent at one meaning.
2. **Too many hues for an "ink and paper" identity.**
   - The focus ring is blue (`#175E84`).
   - Points are blue (`#376B82`).
   - Compare-B is blue.
   - The provenance "Analyzed" label is green (`--sm-success`).
   - The heat ramp is purple to orange to yellow.
   - The categorical palette has five hues.

   Together these read as a stock dashboard, not an observatory.
3. **Soft consumer geometry.** Radii are 4/6/8px, the play button is a circle, and the selected nav item has a tinted fill. The research rejects all three (anti-patterns: "large pill radii and soft consumer cards"). The editorial and hairline direction wants 0–2px.
4. **Every measurement has equal weight.** `.sm-metric-grid` is three equal cells at 24px mono. Integrated loudness and Spectral flux standard deviation shout at the same volume. There is no hero value, no reference, no "where does this sit". The unit sits after a 4px margin instead of a thin space, at 12px, with no baseline relationship.
5. **Unavailable looks like content.** "Not available" is set at 14px in full ink, the same colour as real values. It should be clearly distinct while staying legible.
6. **The display serif is used by default, not deliberately.**
   - Every page, Settings included, opens with a 40px Instrument Serif H1.
   - Section headings ("Waveform", "Acoustic measurements") are 24px Geist medium, so they compete with the serif title.
   - In Library the eyebrow "TRACKS" sits *under* the "Library" H1, the reverse of a kicker.
7. **Template empty states.** Each one is a centred lucide icon, a 24px heading and grey copy (`EmptyState`), the generic SaaS pattern the research calls out (Jellyfin, undraw). The Observatory's 120px grey box with a music-note icon is the same fallback, at hero size.
8. **The shell is airy and loose for a desktop tool.**
   - Table rows are 48px with 14px text and no numeric columns besides duration.
   - The player strip is 72px of disabled controls.
   - The breadcrumb appears twice on the Observatory (top bar and in-page).
   - The rail status reads "Local library" with a hard-drive icon, but no count.
9. **The waveform is boxed like a widget.** It sits in a bordered, 4px-rounded rectangle with a canvas fill and no amplitude labels. It has no lane label or unit gutter, and its 144px height is not tied to any lane system. It looks like a component demo, not an instrument pane (Sonic Visualiser, iZotope RX).
10. **Settings is an unstyled `<fieldset>`** of radio buttons, the only visibly unfinished screen.
11. **The colour ramps are not perceptually ordered for the paper theme.** The `--sm-heat-*` ramp starts at near-black `#171916`, which is wrong for a light ground. Research consensus: sequential ramps flip lightness per theme.

---

## 2. Sharpened concept

**"A field notebook for an instrument."** SonicMirror should feel like a measurement plate printed on warm paper. Ink carries the structure, a serif carries the voice and a mono carries the evidence. Exactly one oxide mark says "this one, now".

The editorial layer comes from:
- the newsroom three-role type system (MIT Technology Review's TR Mono, Rest of World, FT's Financier for words and Metric for charts);
- the "cereal box" rule of stating the finding before the chart (Amanda Cox, Bloomberg).

The scientific layer comes from:
- the instrument conventions of Sonic Visualiser and iZotope RX/Insight (time-aligned lanes, a colour ruler, disclosed analysis parameters);
- Youlean and FabFilter (one hero metric, neutral reference ticks, never red for "loud");
- Our World in Data (method, source and export travel with every figure).

The generative layer stays honest, as in the Unknown Pleasures pulsar plot and Visual Cinnamon's per-song glyphs: shape is only ever drawn from this track's own measurements, deterministically.

The chrome comes from:
- Linear (warm neutrals, a dimmer rail, fewer dividers);
- Teenage Engineering (a 1px-gap spec grid, label above value, 0 radius);
- the Radix 12-step ramps (fixed-meaning surface steps).

The accent discipline comes from u-he, Audio Hijack and Solea: oxide means playhead, selection or the primary action, and nothing else.

Two moves differentiate the result. First, the serif is used where nobody else in the category uses it, at large scale, for track titles and stat-as-sentence headlines (no peer such as cosine.club, Cider or Loopcloud does this). Second, mono strictly means "measured" (the Bitwig convention extended): if a glyph is in Plex Mono, SonicMirror computed it or read it from the decoded file.

---

## 3. System specification

### 3.1 Colour tokens

These are rebuilt as fixed-meaning steps (Radix-style). Existing names are kept where possible so components keep compiling. "→" marks a changed value, and "+" marks a new token.

| Token | Role | Light | Dark |
|---|---|---|---|
| `--sm-paper` | app background (step 1) | `#F3F0E8` (unchanged) | `#171916` (unchanged) |
| + `--sm-subtle` | rail, inspector, player strip (step 2) | `#ECE8DE` | `#1D201C` |
| `--sm-canvas` | content surface: tables, plots, cards | → `#F3F0E8` (same as paper; cards are defined by rules, not fills) | → `#171916` |
| `--sm-raised` | popover, menu, tooltip | `#FBFAF6` | `#262A25` |
| `--sm-inset` | skeleton, disabled fill | `#E4DFD3` | `#131512` |
| `--sm-hover` | row/control hover (step 3) | → `#E9E5DA` | → `#242823` |
| `--sm-selected` | selected row/nav (step 4), **neutral** | → `#E4DFD3` | → `#2C302A` |
| `--sm-ink` | primary text (step 12) | `#252622` | `#E9E6DD` |
| `--sm-muted` | secondary text (step 11) | → `#5E5F57` | `#A3A59A` |
| + `--sm-faint` | placeholder em dash, axis minor ticks; ≥24px text or non-essential only | `#7A786E` | `#7F8277` |
| + `--sm-rule-quiet` | dividers between non-interactive regions (step 6) | `#DDD8CC` | `#2C302A` |
| `--sm-border` → alias of + `--sm-rule` | table rules, card grid gaps (step 7) | → `#C9C4B7` | → `#3A3E37` |
| `--sm-control-border` → alias of + `--sm-rule-strong` | input and secondary-button borders (≥3:1) | → `#8C887D` | → `#6B6E63` |
| `--sm-accent` | oxide: playhead, selection, primary action | `#A53726` | `#E17B60` |
| `--sm-accent-hover` | | `#8E2E20` | `#F39B81` |
| `--sm-accent-ink` | text on an accent fill | `#FFFFFF` | `#171916` |
| `--sm-focus` | focus ring; stays a distinct hue for accessibility | `#175E84` | `#8CCAE8` |
| `--sm-danger` | failed analysis, error only | `#A02E2E` | `#F28C88` |
| `--sm-success`, `--sm-warning`, `--sm-info` | status icons only, never text runs or provenance | unchanged | unchanged |
| `--sm-wave` (unplayed) | waveform not yet played | → `#8C887D` | → `#7F8277` |
| `--sm-wave-played` | | `#252622` | `#E9E6DD` |
| `--sm-wave-cursor` | playhead | → `#A53726` | → `#E17B60` |
| `--sm-point` | default Atlas point (drawn at 0.8 opacity) | → `#5E5F57` | → `#A3A59A` |
| `--sm-point-selected` | | `#A53726` | `#E17B60` |
| `--sm-compare-a` / `-b` | A filled oxide / B hollow ink | `#A53726` / `#252622` | `#E17B60` / `#E9E6DD` |
| `--sm-seq-0..4` | spectrogram and sequential colour-by; lightness-monotonic, darkest = most energy on paper | `#F3F0E8` `#D2C9B8` `#9C8F7C` `#5C5246` `#252622` | `#171916` `#3B3530` `#7A5E4F` `#C08A6E` `#F3E3CF` |
| + `--sm-seq-hot` | end-stop above −6 dBFS only (spectrogram) | `#A53726` | `#E17B60` |
| `--sm-heat-*` | **removed**, replaced by `--sm-seq-*` | | |
| `--sm-cat-1..5` | **deprecated** for clusters; use ink opacity or shape plus oxide highlight. Kept only for future format/folder colour-by, capped at 5 | unchanged | unchanged |
| `--sm-chart-grid` | → alias `--sm-rule-quiet` | | |
| `--sm-chart-axis` | → alias `--sm-muted` | | |
| `--sm-shadow-float` | popovers only | → `0 1px 0 var(--sm-rule), 0 6px 16px rgb(37 38 34 / 10%)` | `0 1px 0 var(--sm-rule), 0 6px 16px rgb(0 0 0 / 40%)` |

**Accent budget (normative).** Oxide may appear only as:
1. the playhead and playing-track marker;
2. a selected item (Atlas point, selected row's 2px left rule, active nav's 2px left rule, active tab underline);
3. the single primary button per view.

It is never used for headings, the brand icon, nav text, section fills, chart bars or links.

### 3.2 Contrast check (WCAG 2.2, computed with the relative-luminance formula)

| Pair | Light | Dark | Requirement | Result |
|---|---|---|---|---|
| ink on paper | 13.37:1 | 14.18:1 | 4.5 (text) | pass, AAA |
| ink on subtle (rail) | 12.45:1 | 13.19:1 | 4.5 | pass, AAA |
| muted on paper | 5.67:1 | 7.08:1 | 4.5 | pass |
| muted on subtle | 5.28:1 | 6.59:1 | 4.5 | pass |
| muted on selected (`#E4DFD3` / `#262A25`) | 4.86:1 | 5.84:1 | 4.5 | pass |
| faint on paper (em-dash placeholder ≥24px, minor ticks) | 3.89:1 | 4.52:1 | 3.0 (large text / non-text) | pass; **not for 11–14px text** |
| oxide on paper (accent glyphs, selected rule) | 5.81:1 | 6.07:1 | 3.0 non-text / 4.5 text | pass |
| accent-ink on oxide (primary button) | 6.62:1 | 6.07:1 | 4.5 | pass |
| accent-ink on accent-hover | 8.2:1 | – | 4.5 | pass |
| focus on paper | 6.21:1 | 9.88:1 | 3.0 (1.4.11) | pass |
| rule-strong on paper (input borders) | 3.11:1 | 3.40:1 | 3.0 (1.4.11) | pass |
| wave unplayed on paper | 3.11:1 | 4.52:1 | 3.0 (graphical object) | pass |
| rule / rule-quiet on paper | 1.53:1 / 1.25:1 | 1.62:1 / 1.32:1 | decorative separators only | exempt; never the sole boundary of a control |

Add `apps/desktop/src/design-system/contrast.test.ts`. It parses `tokens.css` for both themes and asserts the ratios above, so token drift fails CI.

### 3.3 Typography

There are four role tokens, and each face has one job (Goodhertz, Spitfire "neutral vs expressive", Vercel Geist role naming).

| Role token | Face | Use | Never |
|---|---|---|---|
| `--sm-font-display` | Instrument Serif 400 (+ italic) | track title, page title, stat-as-sentence, section heads (italic) | tables, buttons, rail, any number that is a measurement |
| `--sm-font-ui` | Geist 400/500 (600 only for the brand wordmark) | all chrome, prose, labels | measured values |
| `--sm-font-data` | IBM Plex Mono 400/500 | measured values, units, timecodes, axis ticks, file facts, keycaps | prose, labels |
| + `--sm-font-label` (alias of ui) | Geist 11px caps, +0.08em | kickers, card labels, column headers, lane labels | sentences |

**Scale** (replace the size tokens; old names map as noted):

| Token | Size / line height / tracking | Use |
|---|---|---|
| `--sm-type-display` | 56/1.02, −0.02em (serif) | Observatory track title ≥1200px |
| `--sm-type-page` | 40/1.05, −0.02em (serif) | Observatory title <1200px; Overview, Library and Atlas H1 |
| + `--sm-type-headline` | 28/1.2, −0.01em (serif) | stat-as-sentence headline |
| + `--sm-type-section` | 22/1.2, 0 (serif *italic*) | section heads: *Loudness*, *Spectrum*, *Rhythm*, *Waveform* |
| `--sm-type-subhead` | 16/1.4 (ui 500) | credits line, empty-state title |
| `--sm-type-body` | 14/1.5 | prose |
| `--sm-type-small` | 13/1.4 | UI default, table titles, rail |
| `--sm-type-label` | 12/1.35 | secondary rows |
| `--sm-type-annotation` | 11/1.3, caps +0.08em | kickers, card labels, column headers |
| + `--sm-type-num-hero` | 36/1.0 (mono 400) | one hero value per measurement group |
| + `--sm-type-num-lg` | 20/1.1 (mono 400) | secondary card values |
| + `--sm-type-num` | 13/1.3 (mono) | table numerics, definition rows |
| + `--sm-type-num-sm` | 11/1.2 (mono) | axis ticks, method lines, provenance |

The 12px floor applies to readable text. 11px is used only for uppercase labels and mono ticks, as Datawrapper and Atlassian advise.

**Numeral treatment.** Rewrite `.sm-data`:

```css
.sm-data { font-family: var(--sm-font-data); font-variant-numeric: tabular-nums lining-nums; }
.sm-num  { font-variant-numeric: tabular-nums lining-nums; } /* for Geist inline numbers */
```

- Use `font-variant-numeric`, not `font-feature-settings`, so other OpenType features survive.
- The minus sign is U+2212 everywhere (`formatDecibels` must emit `−14.2`, not a hyphen).
- The unit is a separate `<span class="sm-unit">` preceded by U+2009 (thin space). It is set at 0.5em of a hero value or 0.8em of small values, in `--sm-muted`, baseline-aligned.
- Fixed decimals per metric:

  | Metric | Format |
  |---|---|
  | LUFS, LU, dBFS, dB | 1 dp |
  | BPM | 1 dp |
  | Centroid, rolloff, bandwidth | integer Hz below 1 kHz; `n.nn kHz` from 1 to 10 kHz; `n.n kHz` at 10 kHz and above |
  | Ratios (flatness) | 3 dp |
  | Durations | `m:ss`, or `h:mm:ss` from 1 h |
  | Confidence | 2 dp |

- Thousands use a thin-space separator in mono ("2 418 Hz").
- QA: `111111` stacked over `666666` must align in Plex Mono and Geist tabular.

### 3.4 Spacing and grid

- Spacing tokens are unchanged (0/4/8/12/16/20/24/32/40/48/64). Usage bands: 0–8 inside controls and cards, 12–24 between components, 32+ between page regions (Atlassian).
- Add `--sm-scale: 1` on `:root`. A Settings "Density" control sets 0.92, 1 or 1.08, and rows, the type scale and lane heights multiply by it (Radix `--scaling`, Things text size).
- Content grid: 12 columns, 24px gutter, `--sm-content-max: 1440px`, flush-left. The Observatory uses an asymmetric 8/4 split at ≥1280px: lanes on the left, the measurement column on the right. Below that it stacks.
- The content padding stays 32 / 24 / 16 at the existing breakpoints.

### 3.5 Borders and radii

| Token | New value |
|---|---|
| `--sm-radius-none` | 0 |
| `--sm-radius-small` | → 2px |
| `--sm-radius-medium` | → 2px |
| `--sm-radius-large` | → 4px (modal only) |
| `--sm-radius-round` | dots, slider thumbs and status pips only; **the play button becomes square-cornered** |

- Lines: `--sm-line: 1px`. Selected and active markers are a 2px oxide rule (`--sm-mark: 2px`).
- Remove 3px left rules everywhere. Notices use a 2px semantic rule.
- Cards are never boxed with four borders. Grids use `gap: 1px; background: var(--sm-rule)` with cells on `--sm-canvas` (Teenage Engineering).
- Divider policy: draw a rule only between interactive regions or data rows. Delete all others (Linear, Audio Hijack 4).

### 3.6 Motion

| Token | Value | Use |
|---|---|---|
| `--sm-duration-fast` | → 100ms | hover, press |
| `--sm-duration-control` | → 160ms | disclosure, tab underline, inspector section |
| `--sm-duration-panel` | → 240ms | rail collapse, drawer, view change |
| `--sm-duration-focus` | → 400ms | Atlas re-projection only |
| `--sm-ease` | → `cubic-bezier(0.16, 1, 0.3, 1)` | all |

- The playhead moves linearly in real time.
- Skeletons use an opacity pulse (`--sm-inset` 100% to 70%, 1.4s). There is no gradient shimmer and no spinners.
- Reduced motion zeroes everything and the playhead keeps updating.
- Data never animates for decoration.

---

## 4. Surfaces

### 4.1 App shell (`AppShell.tsx`, `shell.css`)

The grid becomes `44px / 1fr / 56px` rows and `224px / 1fr` columns. The rail compacts to 56px below 1200px, as today.

**Top bar (44px, `--sm-paper`, one `--sm-rule-quiet` bottom hairline):**
- **Left (x=16):** wordmark "SonicMirror" in Instrument Serif 20px, ink. No oxide icon; the brand is typographic. At compact width only the glyph mark shows: a 12×12 tick-and-baseline SVG (§4.9 motif) in ink.
- **After the rail edge:** a breadcrumb in 13px Geist muted with the current segment in ink, using "/" separators in `--sm-faint`. The in-page Observatory breadcrumb is **removed**; the top bar owns the breadcrumb.
- **Right:** a "Find tracks" quiet button that shows its shortcut as a keycap `[Ctrl K]` (Plex Mono 11px, 1px `--sm-rule` border, 2px radius, 2px/6px padding). Render it only once search exists; until then omit it rather than show a dead control.

**Rail (224px, `--sm-subtle`, right edge one `--sm-rule-quiet` hairline):**
- Nav rows are 32px tall with 8px horizontal padding, a 16px monochrome lucide icon in `--sm-muted` and a 13px Geist label in `--sm-muted`.
- Hover: `--sm-hover` fill and ink text.
- Active (`aria-current`): ink text, `--sm-selected` fill, and a 2px oxide rule on the left edge drawn as an inset `box-shadow: inset 2px 0 0 var(--sm-accent)`. The icon turns ink. No pink fill and no oxide text.
- Library children are 28px rows with 13px text, indented to the label x, and shown only under Library (as today).
- Group order: Overview, Library (+ children), Atlas, then a spacer, then Settings.
- Rail foot (replaces "Local library"): two mono lines at 11px in `--sm-muted`, "LOCAL · this device" and `n tracks`, where n comes from the cached `["tracks"]` query and is omitted if not loaded. No invented "analyzed" count until an analysis-summary IPC exists.

**Player strip (56px, `--sm-subtle`, top hairline `--sm-rule-quiet`):**
- Columns: `minmax(220px, 1fr) auto minmax(160px, 1fr)`.
- **Left:**
  - a 32px square art slot (fallback: §4.9 plate glyph, or an `--sm-inset` square);
  - the title in 13px Geist ink;
  - the artist in 12px muted.
- **Empty:** "Nothing playing" in 13px muted, with no art box.
- **Centre:**
  - transport: previous and next are 32×32 quiet buttons; play/pause is 32×32, square with a 2px radius, an oxide fill only when a track is loaded and `--sm-inset` when disabled;
  - timecode `01:42 / 04:10` in Plex Mono 12px tabular, each side min-width 5ch.
- **Top edge:** a 2px full-width progress line that grows to 6px on hover. Played is ink and unplayed is `--sm-rule`, with the playhead marker in oxide. When the track has waveform data, the line becomes a 20px mini min/max waveform scrubber: the same algorithm at 400 buckets, played in ink, unplayed in `--sm-wave`. Never draw a decorative or placeholder waveform.
- **Right:**
  - a volume slider of 96px, with a 2px track and 10px thumb (round allowed) in ink;
  - an output-state mono label `OUT · −6 dB` that appears only when that value is real.
- Since playback is not implemented yet (E09), the strip ships its honest empty state now. Disabled controls carry `aria-disabled` plus the tooltip "Playback arrives with the native audio service".

### 4.2 Overview (`features/overview/OverviewPage.tsx`)

The page is built from blocks: Lead, Counts, Recent accessions, Distribution (Rest of World / OWID).

- **Header:** a kicker `YOUR COLLECTION` (11px caps, muted), then the H1 "Overview" (serif 40px), then a right-aligned "Import music" primary button. This order replaces today's eyebrow-above-title mismatch with Library: everywhere, the kicker goes above the title.
- **Counts strip** (only when `listTracks` resolves with tracks): one row, 1px-gap grid, four cells:
  - Tracks
  - Artists (distinct non-null)
  - Albums (distinct non-null)
  - Total duration (sum of `durationMs`; tracks with null duration excluded and footnoted: "duration unknown for 3 tracks")

  Each cell has a label (11px caps muted) above a value in `--sm-type-num-lg` mono. The scope line beneath reads `from 1 284 tracks in the local catalog` in 11px mono muted. Everything comes from one query, so the figures always agree with the Library (stats.fm and CRL anti-patterns).
- **Recent accessions:** the last 8 tracks by `createdAtMs`, as 32px rows: title, artist, and the import date "23 Nov 2026" from a single `formatDate`. A footer link reads "Open library →".
- **Distribution strips** (deferred until an analysis-summary IPC exists): 24px barcode plots per metric. Do not render any placeholder for them.
- **Empty:** a typographic block, left-aligned in the content column, max-width 480px:
  - a serif 28px line, "Nothing observed yet.";
  - a 14px body line, "Import a folder of audio files. Every measurement is computed on this device; your files are never modified.";
  - the primary "Import music" button and a quiet "What gets measured" link to Settings › About measurements (future).

  No icon, and no zero-count tiles.

### 4.3 Library: Tracks table (`features/library/*`)

- **Header:**
  - a kicker `LIBRARY` above an H1 that is the view name ("Tracks", serif 40px);
  - a count line in 13px mono muted: `1 284 tracks · 86 h 12 min`;
  - on the right, "Import music" (primary).
- **Toolbar** (40px, placed later when search and filter land): search input (min 240px) with a `[/]` keycap hint, then the result count `41 of 1 284`, right-aligned in mono.
- **Table:**
  - Header row 32px, sticky, on `--sm-paper` with a `--sm-rule` bottom border. Labels in 11px caps +0.08em muted. Sortable headers get a 10px caret and `aria-sort`.
  - Rows are 32px (36 / 28 with density) with a `--sm-rule-quiet` bottom hairline and no zebra.
  - Hover is `--sm-hover`. Selected is `--sm-selected` plus an inset 2px oxide left rule.
  - Columns:

    | Column | Width | Treatment |
    |---|---|---|
    | Title | flex, min 200 | 13px Geist ink, 500 weight; link to the Observatory |
    | Artist | 180 | 13px muted |
    | Album | 180 | 13px muted |
    | Duration | 72 | right-aligned, 13px mono tabular; units go in the header ("DUR"), never in cells |
    | Format | 72 | 12px mono caps muted, e.g. `FLAC` |
    | Status | 120 | from `availability`: `Available` renders nothing; otherwise a 12px icon plus text in muted, e.g. "File missing", "Unsupported" |

  - "Unknown artist" and "Unknown album" render as an em dash in `--sm-faint` with a `title="Not in file tags"` attribute, so missing tag data is visibly different from real values (the Bitwig derived-versus-user convention).
  - Missing tags are never italicised as if inferred.
- **Measurement columns** (LUFS, BPM, centroid with 40×3px inline micro-bars) are part of the design and are **gated on an IPC that returns per-track summary features**. They are not in this plan's code, and no column is drawn until the data exists.
- **Loading:** 8 skeleton rows at exact row height inside the real table frame, with the header visible. This replaces the single 288px block.
- **Empty:** the table header is hidden, and the same typographic block as Overview shows: "Your library is empty." The Import button stays where it sits when the table is populated.
- **Import summary:** a 2px `--sm-success` left rule (status semantics allowed), text 13px, the count in mono, failures listed as `filename.flac — reason` with the filename in mono.

### 4.4 Track Observatory (`features/observatory/*`)

**Header** (no art box unless real artwork exists; the 120px music-icon box is deleted):

- **Kicker** (11px mono caps muted): `TRACK · FLAC · 44.1 kHz · STEREO · 3:42`, built from `codec`, `sampleRateHz`, `channelCount` and `durationMs`. Null parts are omitted, not dashed.
- **Title:** Instrument Serif at `--sm-type-display` (56px) at ≥1200px and 40px below, −0.02em, max 2 lines with `overflow-wrap: anywhere`.
- **Credits:** 16px Geist, artist in ink · album in muted. Missing values are omitted, and if both are missing the line reads "No artist or album in file tags" in muted.
- **Actions** (right, top-aligned): Play (primary; disabled until playback exists) and Compare (secondary, hidden until the route exists).
- **Headline sentence** (`--sm-type-headline` serif 28px, ink, max 60ch), generated only from the measurements present:
  - With integrated loudness and tempo valid (confidence ≥ the existing threshold): "Integrated at −9.8 LUFS, with an estimated pulse near 124 BPM."
  - With only loudness: "Integrated at −9.8 LUFS."
  - With neither: omit the sentence entirely.

  Numbers inside the sentence are set in Plex Mono at the same size. Library comparisons ("louder than 82% of your library") are allowed only once a library-wide summary exists and n ≥ 20. They are not in this plan.

**Provenance strip** (directly under the header):
- A horizontal chain of hairline boxes (1px `--sm-rule`, 2px radius, 4px/8px padding, 11px mono muted) joined by `→` in `--sm-faint`:
  `FLAC 44.1 kHz 2ch` → `decoded` → `analyzed 23 Nov 2026 14:02` → `engine 0.4.1` → `features v3`.
- Every box comes from `StoredAnalysis` (`engineVersion`, `featureSchemaVersion`, `completedAtMs`) or from `TrackRecord`.
- Status: `complete` renders nothing extra. `partial` adds the box `partial · 3 measurements unavailable`, counted from the features list. `failed` adds a box with a 2px danger left rule.
- Green "Analyzed" text is removed.
- Window and FFT parameters are added to the chain **only when** the engine reports them (future IPC). Never hardcode "STFT 2048/512" in the UI.

**Lanes** (the waveform becomes lane 1 of a stack; Sonic Visualiser / RX):
- Container: full content width (8 columns at ≥1280), no outer border, lanes separated by `--sm-rule-quiet`.
- Each lane is a 32px left gutter plus the plot:
  - The gutter holds a lane label in 11px caps muted, written horizontally at the top ("AMPL") and a unit or scale tick column (`+1`, `0`, `−1` in 11px mono `--sm-faint`, right-aligned to the plot edge).
- Waveform lane: plot 128px tall, background transparent on `--sm-canvas`, zero baseline `--sm-rule`, time gridlines `--sm-rule-quiet`, unplayed `--sm-wave`, played `--sm-wave-played`, playhead 1px oxide.
- Time axis: 24px, 11px mono ticks in muted, shared by all lanes and placed under the last lane.
- Hover crosshair: a 1px `--sm-rule-strong` vertical line plus an axis-edge chip pinned under the time axis, `1:42.3 · max 0.82 · min −0.79`. The chip is 11px mono on `--sm-raised` with a 1px rule and 2px radius, and the values are read from the same bucket used for drawing. There are no floating tooltips over data (Observable crosshair, REW).
- Future lanes (spectrogram with a dB colour ruler, short-term loudness with a dotted integrated line and neutral reference ticks at −23/−16/−14/−9, onset ticks) slot into the same component. Each appears only when the engine provides its data. There are no placeholder lanes.
- Figure caption under the lanes: `Fig. 1 — Sample extrema, 1 600 buckets, fixed full scale.` in 11px mono muted. It states that nothing is normalised.

**Measurement groups** (right column at ≥1280px, below the lanes otherwise):
- Each group (Levels, Spectrum, Rhythm, Technical; order from `GROUP_ORDER`) has a section head in serif italic 22px (*Levels*) and a one-line kicker count `5 measured · 0 unavailable` in 11px mono muted.
- **Hero cell** (first card of a group; full width of the group): Levels → integrated loudness, Spectrum → centroid mean, Rhythm → tempo, Technical → duration.
  - Label: 11px caps muted.
  - Value: `--sm-type-num-hero` 36px mono ink, with the unit at 0.5em muted after a thin space.
  - Gloss: one line of 13px Geist muted taken from the catalog explanation's first sentence.
  - For the loudness hero, a 1px reference scale under the value with neutral ticks at −23, −16, −14 and −9 LUFS (labels in 10–11px mono muted) and the value's position as a 6px oxide tick. The ticks are references, not grades, and never red or green (FabFilter, Youlean anti-pattern).
- **Secondary cells:** a 1px-gap grid (`gap:1px; background:var(--sm-rule)`), 2 columns, cells on `--sm-canvas` with 16px padding and 8px from label to value. Label 11px caps muted, value `--sm-type-num-lg` 20px mono.
- **Qualifiers:** tempo shows `est. · confidence 0.62` in 11px mono muted. Below the confidence threshold the engine already marks it unavailable, so it is never shown as a number.
- **Unavailable:**
  - The cell keeps its geometry. The value slot shows `—` at the same size as a real value in `--sm-faint` (large text, 3.89:1).
  - Beneath it, "Not available" in 13px Geist ink, then the reason in 12px muted ("Too short to estimate tempo (under 8 s)").
  - No icon. `data-status` stays as the styling hook.
- **Method disclosure:**
  - The `Info` icon button is replaced by a text toggle, `+ method` / `− method`, in 11px mono muted. It keeps a ≥32px target height through padding.
  - When expanded in place, it shows the explanation (13px Geist) and then a mono line: `algorithm ebu-r128@1.2 · feature schema v3`.
- **Container queries:** under 260px cell width, hide the reference scale and keep value, unit and gloss (Insight 2 degradation).

**States:**
- Track loading: header skeleton at the exact geometry (kicker 12px bar, title 2×48px bars, credits 16px bar).
- Analysis `null`: provenance chain shows `not analyzed`. The lanes area is replaced by a typographic block: "Not analyzed yet." (serif 22px), plus "This track is in the catalog, but no measurements exist. Nothing below is estimated." No icon.
- Error: an inline notice that keeps the header visible.

### 4.5 Atlas empty state (`features/atlas/AtlasPage.tsx`)

- Header: kicker `SONIC ATLAS`, H1 "Atlas" (serif 40px), and a subtitle in 13px muted: "A 2-D projection of measured features. Nearby tracks measured similarly."
- Empty body, a left-aligned typographic block (max 520px):
  - serif 28px "The map needs at least three analyzed tracks.";
  - 14px "Positions come from principal components of the measurements on this device. No genres, tags or guesses are used.";
  - a mono line, `tracks in catalog: 2`, only when that count is known from `listTracks`; never an analyzed count it cannot verify;
  - the action "Import music".
- **No fake map, no sample dots, no empty axes.**
- The future populated Atlas design (labelled PC axes with % variance and loading words, label level of detail, inspector with neighbours and distances, minimap, `n/a` chip for unmeasured tracks) is specified in research lens 8. Its contract is out of scope for this plan.

### 4.6 Settings (`features/settings/SettingsPage.tsx`)

- The H1 "Settings" is set in 24px Geist 500, **not** serif. Settings is utility, and the serif is reserved for editorial moments (NPR rule: one display element per screen).
- Layout: rows on a 2-column definition grid (`200px 1fr`), each row 48px minimum, separated by `--sm-rule-quiet`.
- Rows:
  - **Appearance:** a segmented control, `Light | Dark | System`. It is 32px tall, with 1px `--sm-rule-strong` border and 2px radius. Segments are 13px. The active segment is ink text on `--sm-selected` with a 2px oxide underline. It is built on native radios, so the semantics stay.
  - **Density:** a segmented control, `Compact | Default | Comfortable`. It sets `--sm-scale` on `:root` and persists via the existing theme storage pattern.
  - **Motion:** a toggle labelled "Reduce motion", wired to the existing `data-reduced-motion`.
  - **About:** a mono block with the app version, the engine version (if exposed) and "All analysis runs on this computer."

### 4.7 Shared empty / loading / error components (`components/*`)

- **`EmptyState`** is rewritten typographically and left-aligned:
  - `title` in serif 22–28px (`size` prop: `"section" | "page"`);
  - body 14px muted, max 52ch;
  - optional `action`.
  - The `icon` prop is removed.
  - The `aria-label` is kept on the section.
- **`ErrorNotice`:**
  - 1px `--sm-rule` border, 2px danger left rule (`inset` box-shadow), 2px radius, `--sm-canvas`;
  - message 13px ink;
  - "Details" disclosure that shows the code in 11px mono;
  - Retry as a secondary button.
- **Skeleton:** add a `.sm-skeleton` pulse and a `Skeleton` primitive with `width` and `height` props to guarantee matching geometry.
- **Buttons:**
  - 32px tall (`--sm-control: 32px`, hit target kept ≥32), 12px horizontal padding, 2px radius, 13px Geist 500.
  - Primary uses the oxide fill (one per view).
  - Secondary is transparent with 1px `--sm-rule-strong` and ink text.
  - Quiet has no border, and hover is `--sm-hover`.
  - Keycap hints render as `<kbd class="sm-kbd">`.

### 4.8 Honesty rules (normative, unchanged in spirit, now explicit)

1. Every pixel of a figure is derived from stored measurements or decoded samples. There are no decorative or placeholder charts, sample points or "preview" shapes.
2. Unavailable means an em dash plus "Not available" plus the reason. Never zero, never blank, never hidden.
3. Estimates are labelled ("est.", confidence) at the value.
4. Comparisons to references are neutral ticks. Never colour a measured value as pass or fail.
5. Aggregates state their scope (n, source) and come from one query.
6. Tag data and measured data are typographically distinct: Geist for tags, Plex Mono for measured or decoded values.
7. Copy never claims analysis parameters the engine did not report.

### 4.9 Signature motif

One glyph: a short vertical tick on a baseline (a 1px ink stroke 8px tall over a 12px baseline), drawn from the waveform's own stroke vocabulary. It is used only as:
- the compact brand mark;
- the separator between Observatory groups;
- the empty-state lead mark (6px above the title);
- the loading indicator (three ticks pulsing in sequence; static under reduced motion).

It is not used anywhere else (MIT Technology Review's slash, Rest of World's diacritic).

A deterministic per-track "Sonic Plate" (ridgeline of band energies) is designed for later. It requires a spectral-frames IPC and is not in this plan.

---

## 5. Implementation plan

Each step is one small, independently committable change, in order. Run `pnpm -C apps/desktop test` and the typecheck after each one.

1. `feat(design-system): add neutral surface and rule tokens for paper and graphite` · `src/design-system/tokens.css` (add `--sm-subtle`, `--sm-faint`, `--sm-rule-quiet`, `--sm-rule`, `--sm-rule-strong`; alias `--sm-border` and `--sm-control-border`; new `--sm-hover`, `--sm-selected`, `--sm-muted` and `--sm-raised` values)
2. `test(design-system): assert WCAG contrast for key token pairs in both themes` · `src/design-system/contrast.test.ts`
3. `refactor(design-system): restrict oxide to playhead, selection and primary action` · `tokens.css` (`--sm-wave`, `--sm-wave-cursor`, `--sm-point`, `--sm-compare-b`), `docs/design/PRODUCT_DESIGN_SPECIFICATION.md` §2 accent budget
4. `feat(design-system): replace heat ramp with lightness-monotonic sequential ramps` · `tokens.css` (`--sm-seq-*`, `--sm-seq-hot`, remove `--sm-heat-*` after grepping for uses)
5. `style(design-system): flatten radii to 0-2px and soften float shadow` · `tokens.css`
6. `feat(design-system): add type role tokens and numeric scale` · `tokens.css` (`--sm-font-label`, `--sm-type-headline`, `--sm-type-section`, `--sm-type-num-*`)
7. `feat(design-system): tabular lining numerals and unit span utilities` · `src/design-system/base.css` (`.sm-data`, `.sm-num`, `.sm-unit`, `.sm-kbd`, `.sm-kicker`, `.sm-section-title`)
8. `fix(format): use true minus and thin-space units and grouping` · `src/lib/format.ts`, `src/lib/format.test.ts`
9. `feat(format): add single date formatter for accession and analysis dates` · `src/lib/format.ts`, `format.test.ts`; use it in `ObservatoryPage.tsx`
10. `style(design-system): retune motion durations and easing` · `tokens.css`
11. `refactor(components): typographic left-aligned empty state without icon` · `src/components/EmptyState.tsx`, `empty-state.css`, all call sites (`OverviewPage`, `AtlasPage`, `LibraryPage`, `ObservatoryPage`)
12. `style(components): hairline error notice and square-cornered buttons` · `src/components/ErrorNotice.tsx`, `notice.css`
13. `feat(components): add geometry-matching skeleton primitive` · `src/components/Skeleton.tsx`, `skeleton.css`; replace `.sm-skeleton` blocks in library and observatory
14. `style(shell): dim rail, 2px oxide active rule and typographic wordmark` · `src/app/AppShell.tsx`, `shell.css`, `AppShell.test.tsx`
15. `feat(shell): show local track count in rail foot` · `AppShell.tsx`, `shell.css`, `AppShell.test.tsx`
16. `style(playback): 56px strip with square transport and progress line` · `src/features/playback/PlaybackStrip.tsx`, `playback.css`
17. `style(library): 32px dense rows, caps headers and tag-missing dashes` · `src/features/library/TracksTable.tsx`, `library.css`
18. `feat(library): kicker header with track count and total duration` · `LibraryPage.tsx`, `library.css`
19. `feat(library): availability status column` · `TracksTable.tsx`, `library.css`, plus a test
20. `feat(observatory): kicker, display title and credits header without art placeholder` · `src/features/observatory/ObservatoryPage.tsx`, `observatory.css`
21. `feat(observatory): provenance chain from stored analysis fields` · `src/features/observatory/ProvenanceChain.tsx`, `observatory.css`, `ProvenanceChain.test.tsx`
22. `feat(observatory): headline sentence generated only from valid measurements` · `src/features/observatory/headline.ts`, `headline.test.ts`, `ObservatoryPage.tsx`
23. `refactor(waveform): render waveform as a labelled lane with scale gutter and figure caption` · `src/visualizations/waveform/WaveformCanvas.tsx`, `waveform.css`
24. `feat(waveform): axis-edge crosshair readout from drawn buckets` · `WaveformCanvas.tsx`, `waveform.css`, `src/visualizations/waveform/readout.ts`, `readout.test.ts`
25. `feat(observatory): hero measurement per group with 1px-gap secondary grid` · `MeasurementGrid.tsx`, `measurements.css`, `featureCatalog.ts` (add `hero: true`), `MeasurementGrid.test.tsx`
26. `feat(observatory): neutral loudness reference scale on integrated LUFS` · `src/features/observatory/ReferenceScale.tsx`, `measurements.css`, plus a test that the value tick is placed and no colour judgement is applied
27. `feat(observatory): explicit unavailable cell and inline method disclosure` · `MeasurementGrid.tsx`, `measurements.css`, `MeasurementGrid.test.tsx`
28. `feat(observatory): asymmetric lanes and measurements layout with container queries` · `observatory.css`, `measurements.css`
29. `feat(overview): counts strip and recent accessions from the track catalog` · `src/features/overview/OverviewPage.tsx`, `overview.css`, `OverviewPage.test.tsx`
30. `feat(settings): segmented appearance and density controls with --sm-scale` · `src/features/settings/SettingsPage.tsx`, `settings.css`, `src/app/theme.ts`, `theme.test.ts`, `tokens.css`, plus an Atlas empty-state copy change in `src/features/atlas/AtlasPage.tsx` folded into a separate commit if preferred: `feat(atlas): explain projection requirements in empty state`

Explicitly deferred because they need new IPC (do not stub them in the UI): Library measurement columns and micro-bars, Overview distribution strips, spectrogram/loudness/onset lanes, library-relative headline clauses, Sonic Plates and the populated Atlas.

---

## Appendix: references (most influential)

**Measurement and instrument UI**
- iZotope Insight 2 loudness: https://s3.amazonaws.com/izotopedownloads/docs/insight200/en/loudness/index.html
- iZotope Insight 2 history: https://s3.amazonaws.com/izotopedownloads/docs/insight200/en/history/index.html
- iZotope RX 9 spectrogram/waveform: https://s3.amazonaws.com/izotopedownloads/docs/rx9/en/spectrogram-waveform-display/index.html
- FabFilter Pro-L loudness metering: https://www.fabfilter.com/help/pro-l/using/loudnessmetering
- FabFilter Pro-Q analyzer: https://www.fabfilter.com/help/pro-q/using/analyzer
- Youlean measurements explained: https://youlean.co/youlean-loudness-meter-measurements-explained/
- Sonic Visualiser reference: https://www.sonicvisualiser.org/doc/reference/4.0/en/
- REW graph panel: https://www.roomeqwizard.com/help/help/html/graphpanel.html
- Observable Plot crosshair: https://observablehq.com/plot/interactions/crosshair
- Smaart (coherence blanking): https://en.wikipedia.org/wiki/Smaart

**Editorial and data typography**
- Datawrapper, fonts for data vis: https://www.datawrapper.de/blog/fonts-for-data-visualization
- Datawrapper, text in data vis: https://www.datawrapper.de/blog/text-in-data-visualizations
- Datawrapper, Amanda Cox interview: https://www.datawrapper.de/blog/amanda-cox-bloomberg
- MIT Technology Review redesign: https://www.technologyreview.com/2018/06/21/104236/behind-the-mit-technology-review-redesign/
- Rest of World visual style guide: https://restofworld.org/not-a-blog/visual-style-guide/
- Our World in Data grapher: https://ourworldindata.org/grapher/life-expectancy
- FT Visual Vocabulary: https://github.com/Financial-Times/chart-doctor/blob/main/visual-vocabulary/README.md
- CarbonPlan font roles: https://carbonplan.org/design/font
- Stripe Press: https://stripe.press/
- The Pudding: https://pudding.cool/

**Desktop chrome and systems**
- Linear UI redesign: https://linear.app/now/how-we-redesigned-the-linear-ui
- Linear design refresh: https://linear.app/now/behind-the-latest-design-refresh
- Radix colour scale: https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale
- Radix typography: https://www.radix-ui.com/themes/docs/theme/typography
- Vercel Geist typography: https://vercel.com/geist/typography
- Carbon type sets: https://carbondesignsystem.com/elements/typography/type-sets/
- Carbon motion: https://carbondesignsystem.com/elements/motion/overview/
- Carbon empty states: https://carbondesignsystem.com/patterns/empty-states-pattern/
- Carbon data table style: https://carbondesignsystem.com/components/data-table/style
- Atlassian typography (metric role): https://atlassian.design/foundations/typography
- Mario Guzman inspector guidelines: https://marioaguzman.github.io/design/inspectorguidelines
- Rogue Amoeba, design of Audio Hijack 4: https://weblog.rogueamoeba.com/2022/09/09/the-design-of-audio-hijack-4/
- Teenage Engineering design analysis: https://blakecrosley.com/guides/design/teenage-engineering
- Warp design tokens (Instrument Serif precedent): https://www.shadcn.io/design/warp/raw
- MDN font-variant-numeric: https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric
- APCA rationale: https://www.github.com/Myndex/SAPC-APCA/blob/master/documentation/WhyAPCA.md

**Music, maps and generative**
- cosine.club: https://cosine.club/
- u-he: https://www.u-he.com/
- Sonos: https://www.sonos.com/
- Solea DJ: https://solea-dj.com/
- Xianzhao Duan, Productivity 2021–2026: https://xianzhaoduan.com/undergrad-vis/
- Window to Mars: https://windowtomars.com/
- Musicmap: https://musicmap.info/
- Every Noise at Once (via furia.com): https://www.furia.com/log/405
- Music Galaxy: https://cprimozic.net/blog/building-music-galaxy/
- TensorFlow Embedding Projector paper: https://arxiv.org/pdf/1611.05469
- Apple Embedding Atlas: https://github.com/apple/embedding-atlas
- Axis Maps visual hierarchy: https://www.axismaps.com/guide/visual-hierarchy
- Distill, misreading t-SNE: https://distill.pub/2016/misread-tsne/
- Unknown Pleasures pulsar plot: https://blogs.scientificamerican.com/sa-visual/pop-culture-pulsar-origin-story-of-joy-division-s-unknown-pleasures-album-cover-video
- Shape of Song: https://www.bewitched.com/song.html
- Datawrapper, colorblindness: https://www.datawrapper.de/blog/colorblindness-part2

---

## 6. Amendments adopted from the design review (normative)

A design-director review of this brief (`REDESIGN_REVIEW.md`) found blocking issues. Where an
amendment conflicts with sections 1–5, **the amendment wins**.

**Research scope.** The goal was a survey of at least 1,000 sites; the swarm reached 652 unique
sites, 586 of them actually fetched (the rest recalled and marked as such in `REFERENCES.md`).
Counts such as "orange 8 times against 97 neutrals" and "no peer uses a serif" are observations
from that sample, not universal facts. Third-party analyses (the Teenage Engineering write-up, the
Warp token scrape) are secondary sources.

**Colour**
- A1. `--sm-seq-hot` is deleted. Sequential ramps end at `--sm-seq-4`; a spectrogram lane gets its
  own dB colour ruler when it exists. The diverging ramp `--sm-div-*` is deprecated until a
  consumer exists.
- A2. `--sm-faint` is only for decorative, `aria-hidden` marks (arrows, `/` separators, minor tick
  strokes). Every text glyph, including lane scale labels and the em dash for missing tags, uses
  `--sm-muted`. Missing-tag dashes carry visually hidden "Not in file tags" text; unavailable
  dashes are `aria-hidden` because "Not available" carries the meaning.
- A3. The rail sits on `--sm-paper`, separated from content by one `--sm-rule-quiet` hairline
  (Linear). Rail hover uses `--sm-hover`, the active row uses ink text, the `--sm-active` fill and a
  2px inset oxide rule. Hover and active fills must differ visibly from the rail surface; the
  contrast test enforces a minimum ratio for those pairs.
- A4. The playhead is 2px oxide with a 1px `--sm-paper` halo on each side, so it clears 3:1 over
  played (ink) waveform.
- A5. The loudness reference tick is ink (2px × 8px), not oxide. Compare A is a filled ink shape,
  Compare B a hollow ink shape; oxide marks only the selected one.
- A6. Surface collisions are nudged: light `--sm-inset` `#E7E2D7`, dark `--sm-selected` `#30342D`.

**Controls and playback**
- A7. No dead controls. Until the native audio service exists (E09), the player strip shows only
  "Nothing playing" and the mono line "Playback arrives with the native audio service". The
  transport, the volume control and the Observatory "Play" button are hidden, and return in one
  commit with playback. Observatory "Play" will be a secondary button; the strip's transport is the
  only oxide primary for playback.
- A8. Density control is deferred. When it ships it scales row height, lane height and vertical
  padding only, never type, via `calc(… * var(--sm-scale))`.

**Formatting**
- A9. `formatDecibels` already emits U+2212 and handles signed zero; the formatting step covers
  thin-space units and grouping only. Tempo stays an integer ("124 BPM", labelled est.); the
  headline says "near 124 BPM". Confidence is shown as `0.62` in mono, changed explicitly with its
  test. Frequencies use fixed decimals (`2.40 kHz`). New formatters: total duration
  (`86 h 12 min`), counts with thin-space grouping (`1 284`) and a locale-independent date
  (`23 Nov 2026`).
- A10. Kickers in mono are never `text-transform`ed (that would print "KHZ"); only literal words
  are uppercase. Codec names use a display map (`pcm_*` → `PCM`, `flac` → `FLAC`, …) and the Library
  column is labelled "Codec".

**Observatory**
- A11. The provenance chain starts at `analyzed …`; technical facts appear in the kicker and the
  Technical group only, and the Technical group has no hero.
- A12. The loudness reference scale has a −30 to −5 LUFS domain, ticks at −23 (EBU R128), −16 and
  −14 (common streaming normalisation) with labels, 11px type, and values outside the domain pinned
  at the edge with a mono "below scale" / "above scale" note. No −9 tick. Hidden when the hero cell
  is narrower than 260px.
- A13. The headline appears when the measurement's `status === "valid"`; the UI never re-implements
  engine thresholds. Mono numbers inside the serif headline are set at 0.86em.
- A14. Method lines render `feature.algorithmVersion` and the real requested bucket count, never
  example strings. Group counts use `valid / unavailable / failed` of the features present; absent
  catalog keys are not counted.
- A15. The layout split uses container queries (`@container obs (min-width: 960px)`), with a stacked
  fallback. The waveform lane gutter is 48px.
- A16. The top bar breadcrumb shows the track title by reading the cached track query; the in-page
  breadcrumb is removed. The rail foot is hidden in the compact rail.

**States, motion and pages**
- A17. No motif loader: skeletons only. The skeleton pulse is disabled under reduced motion.
- A18. The Overview scope line that repeats the track count is removed; the total-duration footnote
  stays.
- A19. Settings keeps the page pattern (kicker above a serif title) for consistency.
- A20. The contrast test imports `tokens.css?raw`, parses `:root` and `:root[data-theme='dark']`,
  resolves `var()` aliases and asserts the pairs above.
