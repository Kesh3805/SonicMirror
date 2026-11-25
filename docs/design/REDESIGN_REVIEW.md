# Design review: SonicMirror Redesign Brief v1

I checked the brief against these files under `apps/desktop/src`: `design-system/tokens.css`, `app/shell.css`, `app/AppShell.tsx`, `features/observatory/{ObservatoryPage,MeasurementGrid,featureCatalog}.tsx/ts`, `features/playback/playback.css`, `lib/format.ts`, `ipc/types.ts` and `ipc/client.ts`. I also checked `crates/sonic-core/src/dsp/tempo.rs` and `media/decode.rs`. I computed every contrast ratio below with the WCAG relative-luminance formula. The brief's §3.2 numbers are correct except where noted.

## Blocking issues

1. **`--sm-seq-hot` breaks the brief's own rules.**
   - It breaks the accent budget: oxide may only mean playhead, selection or primary action.
   - It breaks honesty rule 4, because it colours loud content red.
   - It breaks the lightness-monotonic claim. In light, oxide luminance is 0.109, which sits between seq-2 (0.282) and seq-3 (0.088). Against seq-3 it is 1.15:1.
   - In dark, `#E17B60` against seq-3 `#C08A6E` is **1.01:1**, so the two cannot be told apart.
   - "Above −6 dBFS" is not well defined for STFT bins. It depends on how the window is normalised, and the engine does not report that.
   - **Fix:** delete `--sm-seq-hot`. Let the ramp end at seq-4, and give the future spectrogram lane its own dB colour ruler.

2. **`--sm-faint` is used for text that fails contrast (3.89:1 in light).** The brief limits faint to text of 24px or larger, then uses it for:
   - lane scale labels `+1 / 0 / −1` at 11px mono;
   - the Library em dash for missing artist or album at 13px;
   - the unavailable `—` in secondary cells at 20px. Regular-weight 20px does not count as large text.

   A `title` attribute is also not an accessible way to say "Not in file tags".
   - **Fix:** set all of these glyphs in `--sm-muted` (5.67:1 light, 7.08:1 dark).
   - Keep faint only for decorative, `aria-hidden` marks: the `→` arrows, the `/` separators and minor tick strokes.
   - Give the missing-tag dash a visually hidden "Not in file tags" text, and give the unavailable dash `aria-hidden="true"` so the "Not available" text carries the meaning.

3. **Rail hover is invisible.** Light `--sm-hover #E9E5DA` on `--sm-subtle #ECE8DE` is **1.03:1**. Dark `#242823` on `#1D201C` is 1.10:1.
   - **Fix:** give the rail its own steps. On the rail, use hover = `--sm-selected` (`#E4DFD3`, 1.09 against the rail). For the active row, use the ink text plus the 2px oxide rule, and add a darker active fill, for example `#DCD6C8`.
   - Alternatively, keep the rail on `--sm-paper` and separate it with a single hairline, as Linear does.
   - Either way, add hover-against-surface pairs to `contrast.test.ts`, with a minimum ΔL or 1.15:1.

4. **The playhead is not visible over played waveform.** A 1px oxide line over ink waveform measures 2.30:1 in light and 2.34:1 in dark, which fails the 3:1 required for graphical objects (WCAG 1.4.11).
   - **Fix:** draw the playhead 2px wide with a 1px `--sm-paper` halo on each side. Alternatively, draw it with a 6px oxide cap triangle in the time-axis gutter, where it sits on paper at 5.81:1.

5. **Oxide is used outside the accent budget, and some views get two primaries.**
   - The loudness reference "6px oxide tick" is neither playhead, selection nor primary action.
   - `--sm-compare-a` is oxide.
   - The Observatory has a primary "Play" *and* the oxide play button in the strip, which makes two primaries in one view. Overview has "Import music" plus the strip as well.
   - **Fix:**
     - Draw the reference value tick in ink, 2px wide and 8px tall.
     - Make Compare A a filled ink shape and Compare B a hollow ink shape (shape, not hue). Oxide then marks only the selected one of the pair.
     - Make Observatory "Play" a secondary button. Keep the strip's oxide transport, because it is the playhead's home.

6. **Density scaling breaks the type floor and is not feasible as specified.**
   - At `--sm-scale: 0.92`, 11px type becomes 10.1px and 13px becomes 12.0px, under the 11px and 12px floors the brief sets itself.
   - Type tokens are px constants today, so the plan would need `calc()` in every consumer. The canvas lane height lives in JS and would not follow a CSS variable.
   - **Fix:** density scales only row height, lane height and vertical padding, not type. Define the affected tokens as `calc(32px * var(--sm-scale))`. `WaveformCanvas` should read the lane height from `getComputedStyle` on resize.

7. **The brief contradicts itself on dead controls.** §4.1 says to omit the search button rather than show a dead control, yet the player strip ships three disabled transport buttons plus a disabled volume control, and the Observatory ships a disabled primary "Play". Disabled `aria-disabled` controls with a custom tooltip are also not reachable as specified: no tooltip primitive exists, and `title` on a disabled control is not announced reliably.
   - **Fix:** until E09, the strip shows only "Nothing playing" in 13px muted and a muted mono line, "Playback arrives with the native audio service". Hide the transport, the volume and the Observatory Play button. They return in one commit when the audio service lands.

8. **Some formatting rules are wrong against the current code.**
   - Step 8 says `formatDecibels` must start emitting U+2212. It already does (`lib/format.ts:37–43`, which also handles signed zero). The step should be scoped to thin-space units and grouping only.
   - "BPM 1 dp" adds false precision. The engine refines an integer-lag autocorrelation peak by parabolic interpolation at about 86 frames per second (hop 512). That is an estimate, and current `formatBpm` rounds to an integer on purpose.
     - **Fix:** keep the integer (`124 BPM`, plus "est."). The headline should read "near 124 BPM".
   - "Confidence 2 dp" (`0.62`) conflicts with today's `formatConfidence`, which returns `62%`. The brief also never states the change or updates `format.test.ts`.
     - **Fix:** pick one; I suggest `0.62` in mono. Make it an explicit commit with its test.
   - Frequency must use *fixed* decimals: `2.40 kHz`, not `2.4`. Today `trimDecimals` strips trailing zeros, which breaks tabular alignment.
     - **Fix:** set `minimumFractionDigits` equal to `maximumFractionDigits`, and put a test on the 10 kHz boundary.
   - The brief needs formatters it never assigns to a step:
     - total duration, `86 h 12 min`;
     - timecode with tenths, `1:42.3`;
     - the count with thin-space grouping, `1 284`;
     - `formatDate`, `23 Nov 2026`, with an explicit locale or a hand-built format. `toLocaleString(undefined…)` varies by machine and breaks snapshot tests.

9. **The token plan does not cover every changed value.** No step owns these changes:
   - `--sm-canvas` → paper;
   - `--sm-accent-hover` `#842B1E` → `#8E2E20`;
   - the `--sm-chart-grid` and `--sm-chart-axis` aliases;
   - `--sm-div-*`, which is still blue to oxide and therefore contradicts §3.1;
   - the layout tokens `--sm-topbar` 48→44, `--sm-sidebar` 216→224, `--sm-player` 72→56, `--sm-row` 48→32, `--sm-table-header` 36→32 and `--sm-control` 36→32.

   The type tokens are also undefined. The brief specifies "size/line-height/tracking" triples, but today each token is a single px value. The removed or renamed `--sm-type-heading` (24) and `--sm-type-data` (14) are not mapped, even though the brief says "old names map as noted". `--sm-type-subhead` silently drops from 18 to 16.

   **Fix:**
   - Emit `--sm-type-X-size`, `-leading` and `-tracking`, and add `.sm-type-X` utility classes.
   - Add a mapping table: `heading` → section, `data` → num.
   - Add these commits:
     - 1b `style(design-system): flatten canvas into paper`
     - 1c `refactor(design-system): alias chart grid and axis to rules`
     - 4b `refactor(design-system): deprecate diverging ramp until a consumer exists`
     - 5b `style(design-system): tighten shell and row dimensions`

## Other issues

- **The contrast table has one wrong row.** "Muted on selected, dark" uses `#262A25`, which is the dark `--sm-raised`. The dark `--sm-selected` is `#2C302A`, which gives **5.38:1** (still a pass). Some surface tokens also collide:
  - Dark `--sm-selected` equals `--sm-rule-quiet` (`#2C302A`), so a selected row's bottom hairline disappears.
  - Light `--sm-selected` equals `--sm-inset` (`#E4DFD3`), so skeleton and selection look identical.
  - Nudge them, for example light inset `#E7E2D7` and dark selected `#30342D`.
- **The 32px lane gutter is too narrow.** "AMPL" in 11px Geist caps with +0.08em tracking is about 34px before padding. **Fix:** use a 48px gutter. Label tick values in muted.
- **Uppercasing the kicker corrupts units.** Applying uppercase to `TRACK · FLAC · 44.1 kHz · STEREO · 3:42` would render "KHZ". **Fix:** do not use `text-transform` on mono kickers; uppercase only the literal words. Also, `codec` is the Symphonia `short_name` (`decode.rs:121`), so a WAV shows `PCM_S16LE`. **Fix:** add a display map (pcm_* → `PCM`, flac → `FLAC`, alac → `ALAC`), and label the Library column "Codec", not "Format".
- **The technical facts appear three times.** They are in the kicker, in the first provenance box and in the Technical group, and duration is also the Technical hero. **Fix:** drop the first provenance box, because the chain starts at `analyzed …`. Give the Technical group no hero.
- **The loudness reference scale is underspecified and partly unsourced.**
  - The domain is missing (suggest −30 to −5 LUFS).
  - There is no rule for values outside the domain. Suggest pinning at the edge with a `◂ below scale` mono note.
  - The ticks have no labels saying what they mean.
  - −23 (EBU R128), −16 and −14 (common streaming normalisation, matching the existing catalog copy) have sources. **−9 has none** in the appendix. Drop it, or label it as a convention.
  - "10–11px" breaks the 11px floor. Use 11px.
- **The headline duplicates thresholds and values.** "Confidence ≥ the existing threshold" would copy `MIN_CONFIDENCE = 0.25` into TypeScript. The engine already withholds tempo below it (`tempo.rs:27`), so the condition is simply `status === "valid"`. Integrated loudness then appears three times: headline, hero and scale. Keep the headline and hero, and let the scale replace the gloss.
- **Mono numerals at 28px look heavy beside serif text.** Plex Mono at 28px inside a 28px serif sentence sets too heavy and too wide. Specify `font-size: 0.86em` for the mono spans, or explicitly accept the look and verify it in the app.
- **Examples could be hardcoded.** The method-line example `algorithm ebu-r128@1.2` and the caption `1 600 buckets` must render `feature.algorithmVersion` and `view` length (or the bucket count actually requested). Say this in the spec so nobody hardcodes the example strings, the same rule the brief already applies to STFT parameters.
- **Status counts are ambiguous.** "`5 measured · 0 unavailable`" and "partial · 3 measurements unavailable" do not say how `failed` is counted, or how catalog keys that are absent from the features list are counted. **Fix:** use `valid` / `unavailable` / `failed` counts, and do not count absent keys at all.
- **The diagnosis names a measurement that does not exist.** It cites "Spectral flux standard deviation", but the catalog has `spectral_flux_mean` and `spectral_centroid_std`. Correct the example.
- **The breakpoints should be container queries.** "8/4 split at ≥1280px" should depend on content width, not viewport width. At a 1280px window the content is about 992px, so the measurement column is about 330px and two secondary cells are about 150px each.
  - **Fix:** use `@container obs (min-width: 960px)`.
  - Add a stacked fallback for WebKitGTK older than 2.40, because Tauri on older Linux distributions ships that.
  - Hide the reference scale at a hero cell width under 260px, not a secondary cell width.
- **The top-bar breadcrumb lacks the track title.** `breadcrumbFor(pathname)` in `AppShell.tsx` is route-only, so removing the in-page breadcrumb loses the title. **Fix:** step 20 must also read the `["track", id]` query in the shell, or show only "Library / Track" and rely on the H1.
- **The rail foot does not fit in compact mode.** Two mono lines do not fit the 56px compact rail. Hide them there, and give the count an accessible name instead.
- **Two overview figures come from different queries.** `listTracks` returns the whole array (`ipc/client.ts:47`), so the counts are consistent. But the scope line "from 1 284 tracks" repeats the Tracks cell, so remove it. Total duration still needs its footnote.
- **Loading states contradict each other.** The motif's "three ticks pulsing" loader contradicts "no spinners, skeletons only". The skeleton pulse is a CSS animation that the duration tokens do not zero. **Fix:** remove the motif loader. Give `.sm-skeleton` `animation-duration: calc(var(--sm-duration-panel) * 5.8)`, or gate it under `prefers-reduced-motion` or `[data-reduced-motion]`.
- **The progress line can shift layout.** Growing it from 2px to 6px on hover inside a 56px strip must overlay the strip, for example absolutely positioned or with a `scaleY` transform. Specify this. The 400-bucket mini waveform needs a second `getWaveform` call, so defer it with playback (E09).
- **Settings H1 in Geist 24px** breaks the "kicker above serif title" pattern used on every other page. Either accept the exception and document it in the PDS, or keep the serif at 40px with no kicker. The "NPR rule" cited for it is not in the appendix.
- **Step 2's contrast test needs specifics.** It should import `tokens.css?raw` (Vite), resolve `var()` aliases, and parse both `:root` and `:root[data-theme='dark']`. Name these mechanics in the step.
- **Step 30 bundles two features.** Split it into `feat(settings): …` and `feat(atlas): …`, as the brief itself suggests. Also split out the Reduce motion toggle, after checking that `theme.ts` exposes `data-reduced-motion`.
- **The research claims are not substantiated.**
  - The user asked for at least 1000 sites; the brief reports 652 unique and 586 visited. State that gap plainly.
  - "SoundCloud uses orange 8 times against 97 neutrals" and "no peer uses a serif" are counts and absolute claims with no method or source. Rephrase them as observations from the sample.
  - The Bitwig, Things, NPR, Goodhertz, Spitfire, Smaart (Wikipedia only) and Teenage Engineering references rest on a third-party blog or have no appendix link.
  - The Teenage Engineering analysis comes from a third-party blog, and the Warp "tokens" come from a shadcn.io scrape. Mark these as secondary sources or replace them.

## Top 5 changes

1. **Turn the oxide waveform into an ink-on-paper instrument lane.** The unplayed waveform becomes `--sm-wave #8C887D` (3.11:1), played becomes ink, and the playhead is 2px oxide with a paper halo. Add a 48px labelled scale gutter, a shared mono time axis and a figure caption. This is the single largest change in how the app looks.
2. **Restrict oxide to its budget.** It stays only on the playhead, the selection rules (2px inset) and one primary button per view. Remove it from the brand icon, nav text, the pink selected fill and the reference tick. The neutral `--sm-selected` and the typographic wordmark go with this, once the rail hover contrast is fixed.
3. **Give each measurement group one hero value.** Use 36px Plex Mono with the unit at 0.5em after a thin space, fixed decimals and the U+2212 minus. Set the rest in a 1px-gap secondary grid, with serif-italic group heads. This replaces the flat grid of equal 24px cells.
4. **Redesign the Observatory header.** Replace the 120px music-icon box with a mono kicker (no uppercase transform on units), a 56px Instrument Serif title, credits, and the measurement-only headline sentence ("near 124 BPM", integer).
5. **Make the surfaces flat and dense.** Flatten radii to 0–2px, use 32px table rows with 11px caps headers, and fold canvas into paper. Make empty states typographic, left-aligned and without icons, with "Not available" set apart by muted text rather than faint text.
