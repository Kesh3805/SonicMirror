# SonicMirror | Product Design Specification

Version 1.0 · 25 November 2026 · Core release · Windows 11 first

**Authority:** This specification implements approved PRD v1.0. Normative language: MUST is required, SHOULD is preferred, MAY is optional. tokens.css is the canonical visual token source. Screens and interactions below are normative; no Identity, Studio, Journal, AI, streaming, accounts or future-feature navigation. This is a design contract, not a claim that a working application or validated high-fidelity prototype exists.

## 1. Creative direction

A personal observatory for sound. Editorial composition (warm paper, restrained serif headings), scientific measurement (monospace values, explicit units, honest uncertainty), generative expression (real signal geometry, never fake data). The interface is a quiet instrument, not a SaaS dashboard. Use flat surfaces and thin dividers, no gradients outside data palettes, glass, glowing borders, pill-shaped panels, stock illustrations or decorative charts. Use album art at original aspect ratio in square slots with contained cropping only for thumbnails. Never fetch art remotely. Default fallback: inset square with centered 24px music-note icon, no random generated image. Brand lockup: text “SonicMirror” in Instrument Serif regular, 24px, with a 20px audio-lines icon in accent, 8px gap. This is the shipping baseline wordmark, not a custom trademark asset.

## 2. Tokens and typography

Import `tokens.css` once at application root; use semantic variables, not hardcoded colors or ad hoc sizes. Apply resolved `data-theme=light|dark` to root before first paint. System mode follows OS changes; default is light on fresh install, with System available in Settings. Persist theme and reduced-motion preferences. Bundle Instrument Serif regular/italic, Geist 400/500/600, IBM Plex Mono 400/500 locally with license notices; use fallbacks in tokens during font load. Body 14px/1.5 Geist; controls 13px/1.4 medium; annotation 11px/1.5 only supplementary; section heading 24px/1.25 Geist medium; subheading 18px/1.25 medium; page title 40px/1.08 Instrument Serif regular; welcome headline 56px/1.08. Data uses 14px tabular mono; large values 24px mono. Uppercase only short section identifiers, 12px medium, tracking .06em. No all-caps body. Wrap titles, do not truncate except in constrained rows with accessible full text. Links underlined on hover and keyboard focus; inline links always underlined.

Shared tokens: base 4px; spacing 0/4/8/12/16/20/24/32/40/48/64; radii 0/4/6/8/999 (round only dots and sliders); borders 1px; control minimum 32px hit area, default height 36px; focus 2px outline + 2px offset; shadow only menus/dialogs. Durations 120/180/220/320ms with cubic-bezier(.2,0,0,1). No perpetual ornamental motion. Reduced motion sets all transitions to zero and disables smooth scrolling/viewport animation. Skeletons are static. Playback and analysis progress remain functional. Decorative divider token is not a sufficient control boundary: use control-border for inputs and meaningful outlines. Color never sole status cue.

## 3. App shell

Use native Windows title bar, OS minimize/maximize/close and snap; do not recreate window controls. All viewport sizes below refer to webview content, excluding native title bar, CSS logical pixels. At 1440×900: top command bar 48px across entire width; middle height 780px with 216px left rail and 1224px workspace; bottom player 72px across entire width. Top bar and player fixed in grid rows, not position overlays. Main workspace and rail scroll independently as needed. Root uses grid rows 48px minmax(0,1fr) 72px; middle uses columns sidebar minmax(0,1fr). Use min-width/min-height 0 throughout. One main scroll container per page; tables may own their own virtual scrolling region; Atlas canvas is not a page scroll surface. Default content padding 32px and max width 1440px centered; 24px below 1200, 16px below 1100. At 1024×640 minimum: rail 56px icon-only, tooltips + accessible names; main width 968px; inspector becomes collapsible overlay below 1200; drawers overlay at every size; no horizontal page scrolling. Native minimum window size set after OS scaling validation; if smaller effective viewport due to zoom, allow vertical scrolling and collapse secondary columns. No fixed-height text containers.

Top bar: left brand (aligned x=16), breadcrumb after rail divider; right search button “Find tracks” with Ctrl+K, analysis button (icon, active count and accessible label), 16px edge. At compact width brand icon only and breadcrumb single current view; search icon with tooltip. Rail: Overview, Library, Atlas; bottom Settings. Library expanded subnav Tracks, Albums, Artists, Collections; active child accent text, selected background, 3px left rule. Each navigation row 40px, 8px horizontal padding; icons 18px, gap 12px. Current route aria-current=page. Observatory and Comparison contextual routes, not primary nav. Bottom of rail displays “Local library” status with icon, no cloud indicator. No unused navigation entries.

Routes: /welcome, /overview, /library/tracks, /library/albums, /library/albums/:id, /library/artists, /library/artists/:id, /library/collections, /library/collections/:id, /tracks/:id, /atlas, /compare?left=&right=, /settings/:section. Retain list filters, scroll offsets and Atlas viewport on in-session navigation back; no playback interruption. Browser-style Back/Forward operate on app route history. Use stable IDs, not file paths in route strings. Page title updates accessible window/document title. Focus main heading on route change unless returning from a dialog or selection, in which case restore previous control. Welcome uses standalone shell (no rail/player until exit); returning through Settings opens Welcome as a route with back action.

### Layout reference

Drawers and modal dialogs must not change main page geometry; inline Atlas inspector at wide width reserves its column. Layer order: sticky 10, drawer 20, modal backdrop 30, modal 40, toast 50, tooltip 60. Analysis drawer is nonmodal, no focus trap; menus/dialogs close on Escape; modal restores trigger focus.

## 4. Shared component contract

Use Radix primitives where appropriate. Default states: resting, hover, pressed, focus-visible, disabled, busy; pointer hover never required for action access. Disabled controls use muted text, inset fill, no activation; retain contrast and provide adjacent explanation when reason matters. Busy uses 16px spinner or static progress icon under reduced motion, preserves button width, disables duplicate submission, accessible busy label. Every destructive operation explicitly names affected application data and confirms original media is untouched.

| Component | Anatomy and behavior |
|---|---|
| Primary button | 36px high, 12px horizontal padding, 6px radius, accent fill/accent-ink, 13px medium, optional 16px leading icon, 8px gap. Hover accent-hover; pressed same fill plus inset outline. |
| Secondary button | Same geometry, canvas fill, control-border, ink text; hover hover-fill. |
| Quiet/icon button | Transparent, 36×36 for icon-only, 18px icon, 4px radius; hover hover-fill; accessible name and tooltip after 500ms. |
| Destructive button | Danger-colored text and border; confirm in dialog; no ambiguous red-only icons. |
| Text input/search | 36px, canvas, 1px control-border, 6px radius, 12px padding; label above 8px gap; search icon 16px; clear button 32px; error message below, aria-invalid and describedby. |
| Select/filter | Same input geometry, chevron 16px; menu min 180px, rows 36px, keyboard typeahead; selected check icon. Numeric ranges include explicit units and editable fields. |
| Tabs | Horizontal 40px, 16px gap, active 2px accent underline, ink; inactive muted; arrow keys move focus and activate on Enter/Space. |
| Checkbox/radio | 16px visual inside ≥32px target, control-border, checked accent with visible check/dot; native semantics. |
| Toggle | 36×20 track, 14px thumb; label, explicit on/off text for critical settings; role=switch. |
| Status | 12px text + 12px icon; queued clock, running progress, complete check, partial warning triangle, failed cross, stale refresh, missing file-slash; no filled badges by default. |
| Tooltip | Raised surface, ink, border, 6px radius, 8px padding, max 260px; not sole source of essential information; dismiss Escape. |
| Menu/popover | Raised surface, control-border, 6px radius, float shadow, 4px padding, 36px items, viewport collision handling, Escape and outside click. |
| Modal | 480px width max calc(100% - 32px), 24px padding, 8px radius, raised surface, overlay; title 24px, body, footer right-aligned Cancel then action; trap focus; destructive default focus Cancel. |
| Toast | Bottom-right above player, 320px max width, raised, border, 12px padding; success/info dismiss after 5s unless focused/hovered; errors persistent; close 32px; no critical info toast-only. |
| Inline notice | 1px border, 3px semantic leading rule, icon and text, action if recoverable; no full-screen takeover for recoverable errors. |
| Empty state | Centered within available region, max 360px, 32px line icon, 24px heading, 14px copy, one primary action; no fake stats. |
| Skeleton | Inset blocks matching final geometry; no random chart placeholders; aria-busy on region and polite status once. |
| Progress | 4px track, accent fill, explicit completed/total counts; indeterminate state labeled, no fabricated percentage. |
| Artwork | Square 40px table / 56px grid list / 120px Observatory / 160px detail; fallback as §1. |
| Metric | Label 12px muted, value 24px mono + unit 12px, explanation affordance, optional status; unavailable “Not available” plus reason; never zero substitution. |
| Table | Header 36px sticky, rows 48px, 12px horizontal padding, 1px bottom dividers, no zebra; hover fill, selected fill plus check/left rule; sortable header arrow + aria-sort; virtualize long lists. |
| Slider | 4px track, 12px thumb, 32px target height, accessible value text; arrows step, Home/End bounds. |

Errors must show plain-language cause if known, recovery action and optional expandable diagnostic code. Never show raw stack traces or paths in toasts. Loading over already displayed data keeps prior content with local updating label; initial loading may use skeleton. Stale results are never presented as current: retain last successful snapshot only if provenance clearly shown, with refresh action. Missing source is not same as corrupt or unanalysed.

## 5. Welcome / onboarding (ONB)

Standalone canvas, centered max-width 1040px, 48px padding (24 compact); top brand and right “Skip to library”. Main two columns 5:4 at ≥1200px, stacked otherwise: left 56px heading “A personal observatory for sound.”, 16px description max 420px, privacy line with lock icon. Right three bordered option rows, each 88px min-height, icon 24, title 18, description 13, chevron; first accent primary action “Import music folder”, second “Explore demo collection”, third “Start empty”. No illustrative graph unless derived from bundled demo and labeled. Footer “Your files stay on this device.”

Import invokes native folder picker; cancellation returns unchanged. Once authorized, route Overview immediately with scan progress. Demo opens precomputed, explicitly labeled demo library; separate source, never mix silently with personal collection. Empty goes Library Tracks. During demo initialization disable repeated demo request and show inline progress; failure offers Retry and Start empty. Partial import reports accessible/imported/skipped counts and continues. Unavailable demo or stale demo schema: show reason and Rebuild demo (local) or Import music. Returning user bypasses welcome unless reset/revisited. No onboarding wizard steps.

## 6. Overview

Page header: eyebrow “YOUR COLLECTION”, H1 “Overview”, right Import music button. Below 24px, four metrics separated by vertical rules (Tracks, Artists, Albums, Analyzed tracks with total); counts from catalog, not estimates; 2×2 at compact width. 32px below: two columns 2:1, Atlas preview and Analysis summary. Preview 260px high minimum, header “Sonic Atlas”, Open Atlas action, actual cached projection static preview with legend and snapshot time, no chart if absent. Analysis summary lists indexed/analyzed/queued/failed counts and Open analysis action. Below 32px: “Recent analysis” table, up to 8 newest completed tracks, title/artist/status, open Observatory; no fabricated discoveries. If no rows hide table and explain next step.

Empty: import/demo actions and zero counts, no fake map. Initial loading: heading remains, skeleton metric blocks and preview rectangle. Partial: counts and analyzed fraction, preview only if snapshot exists; failed count clickable to drawer. Error: section-specific retry, retain successful sections. Stale: map preview banner “New analysis available” with Open Atlas/refresh action; counts use current catalog and preview uses labeled snapshot. Missing sources notice above metrics.

## 7. Library

Shared header H1 “Library”, Import button, 40px tabs Tracks / Albums / Artists / Collections. Toolbar below 16px: search (min 220px, flex), filter button, sort, result count. Tabs mirror rail children. Search local, 200ms debounce, clear with Escape only when input focused; query reflected in route state or persisted per view. Selection toolbar replaces result count with “N selected”, Add to collection, Clear selection; no destructive source deletion in table. Selection scoped to current query; when filters change clear selection with polite announcement. Select all applies to current filtered results only with count displayed.

### Tracks

Virtualized table with columns: selection 40px, play 40px, Title (flex min 180, artwork 40 and title), Artist 160, Album 160, Duration 76, Format 84, Analysis 116, menu 40. At narrower widths hide Format then Album, never title/status; artist may appear as secondary line under title if needed. Row click selects single; double-click title opens Observatory, explicit title link always available; play button plays without changing route; menu Open Observatory, Compare, Add to collection, Analyze/Reanalyze, Show in Atlas (when eligible). Ctrl+click toggles selection, Shift+click selects range in displayed sort order. Checkboxes support keyboard. Row focus separate from selection. Default sort title ascending, stable ID tie-break. Unknown metadata displayed “Unknown artist/album”, missing duration “—” with accessible unavailable label. Status links open relevant details/job. Table header sort uses arrow, not unlabeled icon.

Filters popover 320px: analysis status checkboxes, format, source, optional validated feature ranges (units explicit), Apply and Reset. No genre inference. Search title/artist/album/genre. For numeric filtering, missing values excluded and count explained. Sort by title, artist, album, duration, date added, analysis status; unknowns last.

### Albums / Artists

Grid auto-fill minmax(176px,1fr), 20px gap. Album card square art, title 14px medium, artist and track count 13px muted. Artist card square inset with initial or available locally derived artist image only (do not represent album art as artist portrait); name/count. Card is single link, play action separate. Drilldown header back link, 120px art/fallback, 40px title, metadata, track count; same track table filtered to entity. Unknown group is explicit. Album identity follows catalog, not UI heuristic. No artist biography/network.

### Collections

Header “Collections” with New collection secondary action, grid same dimensions with inset icon cover, name and count. Create dialog: required nonblank name max 100 Unicode characters, inline validation, Create/Cancel. Collection detail header name, Rename, Delete collection via overflow, Add tracks (opens track picker dialog, search/multi-select). Removing items confirms only collection membership removed if bulk; deletion confirms collection only, source untouched. Default ordering title; user-created ordering not required. Saved Atlas selection opens new collection dialog with count. Empty collection offers Add tracks.

### Shared states

| State | Display / action |
|---|---|
| Empty catalog | “No music in your library” Import music / Explore demo |
| No search matches | “No matching tracks” Clear filters/search; retain toolbar |
| Loading | Header/toolbar stable; 8 row skeletons or 6 grid skeletons |
| Partial scan | Inline “Scanning files” counts, rows available, no blocking overlay |
| Partial analysis | Per-row status, filters distinguish unavailable measurements |
| Error | Notice with Retry; retain last catalog page if available, mark cached |
| Stale analysis | Row refresh icon + “Needs reanalysis”; menu Reanalyze |
| Missing media | Row “File unavailable”, metadata still visible, play disabled, Rescan source |
| Unsupported/corrupt | Structured reason, retry if eligible, no fabricated metrics |

## 8. Track Observatory (OBS)

Main page padded 32px. Breadcrumb Library / track. Header 120px art, 24px gap, title 40px serif, artist/album 16px, format/sample rate/channel/duration line 12px mono; right Play primary, Compare secondary, overflow Export JSON / Reanalyze / Show in Atlas. Below 24px, analysis provenance strip: status, analyzed timestamp, engine version, coverage; stale banner if appropriate. Layout stacked full width at all sizes: Waveform section, Spectrogram section, Acoustic measurements, Acoustic neighbors. Section separation 32px and 1px rule. Waveform plot 144px, spectrogram 260px, each with 24px header toolbar; axes reserve 52px left and 28px bottom as needed. Measurements grid 3 columns ≥1200, 2 below, flat cells with rules; groups Levels, Spectrum, Rhythm, Technical; include all production features from PRD, MFCC summary in expandable technical details table, not a meaningless single score. Feature explanations on info buttons open popover and persistent methodology text link. Neighbors list up to 10 with measured distance, Play, Open, Compare; no percent similarity. Show snapshot/context and eligible coverage.

Header actions wrap at compact width. Missing artwork fallback; missing source preserves cached analysis but disables playback. Empty/unanalysed: metadata visible, waveform/spectrogram replaced with “Analyze this track” and action. Queued/running: progress status, available independent artifacts appear as they complete. Partial: each unavailable metric gets reason, retry missing features. Error: inline retry, retain valid features. Stale: label previous engine/config and reanalyze action, never silently show as fresh; if source changed, suppress seeking using mismatched waveform and exclude from current similarity. Cache evicted: regenerate artifact action without implying feature failure.

## 9. Sonic Atlas (ATL)

Full-bleed workspace with no page scroll; header 76px padded 24px: H1 “Sonic Atlas” (40px), subtitle analyzed eligible/total, snapshot date; right Refresh map and overflow Export coordinates. Second toolbar 48px: Color by select (Uniform default, centroid Hz, RMS dBFS, estimated BPM if available, flatness), Filters, Select region toggle, Reset view, zoom −/+; controls wrap to second line below 1100. Main flex canvas (min 240px height), 320px inspector at ≥1200 when selection exists; at compact width inspector is right overlay with Close, width min(320px,90%); canvas resizes without losing center. Bottom legend strip 44px with color scale, counts and “Map proximity is approximate” explanation button. If short height, legend can wrap and canvas minimum retained through scroll fallback.

Canvas background canvas token, thin border, no decorative geography, contours or synthetic clusters. Default neutral points, radius 3 CSS px, fill point token opacity .8; selected point 5px with 2px ring and 2px gap, hover/focus 4px with outline. Selected points drawn last. Hit radius at least 10px; overlapping hits nearest screen distance then stable ID; list offers all tracks. Use DPR backing store capped at 2 for performance, CSS-pixel interaction coordinates. Projection coordinates are unitless PC1/PC2. Preserve aspect ratio; fit all eligible points with 32px padding, 1× base zoom, range 0.5–20×. Wheel zoom anchored at pointer (factor 1.1 per notch normalized), drag pan, double-click background no action, Reset restores fit. No automatic refit on filter or new analysis. Pointer tooltip shows title, artist and currently encoded measurement; inspector displays art 80px, title, artist, Play, Open Observatory, Compare, current descriptor, top 5 original-space neighbors, distance explanation. Single selection by click, Ctrl+click toggles; Select region mode drag rectangle with dashed accent border and translucent selected fill; Escape cancels region mode; multi-selection inspector shows count, accessible list, Save as collection, Clear. Filter changes clear hidden selections with notice. Legend labels actual domain endpoints and midpoint where meaningful, units, missing count. No unsupported genre/cluster color modes in P0.

Accessible alternate view: toggle “Track list” in toolbar; virtualized table with title, artist, color metric, selected status and Open/Play; sorting by current descriptor or title. Keyboard users can explore map through list and neighbor results without pointer. Canvas labeled region with concise instructions, no thousands of tab stops. Focus canvas supports arrows pan by 40px, +/− zoom, Home reset; screen reader live status only on discrete actions, not each frame.

| State | Display / action |
|---|---|
| Empty library | Center “Import music to build your Atlas” / Import |
| Fewer than 3 eligible tracks | “Not enough analyzed tracks” coverage, Analyze pending |
| Degenerate projection | Explain insufficient feature variance; list alternative |
| Initial generating | Skeleton canvas with status; allow cancellation if backend supports |
| Partial data | Plot eligible tracks, persistent coverage and excluded count, link to filtered Library |
| Error | Retry generation; prior successful map retained only with stale label |
| Stale | Banner “New or changed analysis available” Refresh map; old coordinates frozen, changed/missing tracks marked or omitted from interactions; do not mix feature spaces |
| No filter matches | Keep viewport and legend, Clear filters action |

## 10. Comparison (CMP)

Header breadcrumb back, H1 “Compare tracks”, two equal columns with 80px artwork, title/artist, Replace track button, Play A/B. Track picker dialog search local analyzed tracks, single select; prevent identical ID comparison with explanation. Below header 24px: table columns Measurement, A, B, Difference (B−A); raw units, aligned mono, rows grouped by feature domain. Optional paired bars only for documented common scale, direct A/B labels and values, A accent solid, B blue dashed outline; no radar chart or arbitrary percentages. For vector features show expandable component table or contribution summary, no direct scalar substitution. Feature group contribution section uses original-space distance contributions with snapshot and normalization version. If no compatible reference space, hide contribution chart with explanation. Playback switch uses existing global player and starts selected recording at beginning unless same current track. At compact width keep four columns with wrapped labels, stack headers if necessary; no horizontal page scrolling. Empty side shows Select track action, loading skeleton for only affected side, partial rows mark unavailable, error Retry affected track, stale notice and suppress mixed-version distance. Missing files disable relevant playback but retain valid measurements. Swap A/B action reverses difference sign. Export not required beyond Observatory JSON.

## 11. Analysis drawer (JOB)

Right overlay 400px, width min(400px,100%); top at command bar bottom, bottom above player; raised surface, left border + float shadow, nonmodal. Header “Analysis” 24px, close icon, summary progress and counts. Action row Pause all / Resume all (mutually exclusive), Cancel queued or active batch via confirm. Tabs All / Active / Failed (counts). Scrollable virtualized rows 64px minimum: status icon, title/artist, status and phase, progress if known, per-job overflow Prioritize / Cancel / Retry as allowed. Pending, running, paused, interrupted, partial, complete, failed, stale, cancelled are distinct labels. No estimated time unless backend supplies documented estimate. Empty “No analysis jobs” with Analyze pending if eligible. Loading summary skeleton, partial counts with unknown total indeterminate, error Retry status, stale results link to reanalyze. On close restore focus to analysis button; app navigation and playback continue. Announce batch state changes politely, throttle progress announcements to milestones (10% or phase changes), no per-file flood.

## 12. Playback strip (PLB)

Persistent 72px bottom row, raised/canvas fill, top border, 16px horizontal padding, three columns minmax(180px,1fr) minmax(300px,2fr) minmax(120px,1fr). Left: 40px artwork, title/artist, title link opens Observatory. Center: Previous, Play/Pause 36px accent circle, Next, then time slider on second row (elapsed / duration mono 11px). Right: mute button, volume slider 96px, optional queue count text only. At compact width reduce volume slider to 64px, title truncation with tooltip, keep all transport controls. Active track and playback state owned by native service, not separate screen timers; interpolate cursor locally between authoritative updates; sync waveform and spectrogram. Seek drag previews time; commit once on release, keyboard seeks commit per discrete action. Default volume 70%, no autoplay after restart, persist volume; mute restores prior nonzero level. No waveform click starts playback if currently paused. Empty: “No track selected”, controls disabled except volume, duration —. Loading: selected title and “Loading audio”, play disabled, cancel via Stop if supported. Buffer/partial: display native state, no fictitious buffering. Error: inline “Cannot play track” with retry or Open details, keep selection. Stale/missing source: stop if source unavailable, explain; old analysis never controls mismatched file seek. Stop in playback overflow or context menu, not hidden keyboard-only action.

## 13. Settings (SET)

Page H1 “Settings”; left in-page section list 176px, right form max 800px; at <1200 use horizontal tabs. Sections Library sources, Analysis engine, Appearance, Data & privacy, About. Forms divided by 1px rules, rows 56px min, title/description left, control right; wrap at compact. Save behavior immediate for safe preferences, pending indicator and rollback on error. No generic Save all.

- Library sources: rows with name/path (wrap), availability, track count, Rescan, Remove source. Add folder opens native picker. Remove confirmation states catalog association removed, never media. Overlapping sources handled by backend, explain shared tracks retained.
- Analysis engine: worker count select within backend bounds, default backend-provided; engine/schema/config versions read-only; Analyze stale action; link drawer. No raw FFT tuning in core.
- Appearance: Light/Dark/System segmented radio, reduced motion checkbox with OS preference explanation (OS reduce always respected), font/system scaling respected. No custom palettes.
- Data & privacy: catalog and cache usage, Clear cache confirmation (regenerable), Export catalog CSV via native save dialog, Reset library confirmation requiring typed RESET; explicit irreversible app-data deletion scope, source files unchanged. Disable conflicting operations during active reset; playback/analysis stopped by coordinated backend operation. Privacy text: no automatic upload, no account, no telemetry by default.
- About: app version, engine/schema versions, license notices, offline methodology links, supported formats, copy diagnostic summary excluding paths/track names by default.

Empty sources offers Add folder; loading skeleton only affected section; partial storage figures labeled unavailable; errors inline with retry/rollback; stale usage shows last measured timestamp and Refresh. Missing sources status retained. Destructive operation progress cannot be dismissed if backend cannot safely cancel; no false success before confirmation.

## 14. Visualization encoding contract

### Waveform

Input actual decoded-sample min/max envelopes per time bucket with version and duration. Horizontal time linear 0–duration, vertical normalized sample amplitude −1..+1, zero baseline; do not normalize each track independently or clip peaks silently. For multichannel use backend-defined combined extrema with visible label; no fabricated stereo separation. Render one vertical min/max stroke per available bucket/pixel, accent unplayed and ink played, 1px cursor focus color + top triangle. At zoom request appropriately resolved artifact, no interpolated invented detail. Plot background canvas; grid at nice time ticks (1,2,5× powers of ten), aim 5–8 ticks, format mm:ss or h:mm:ss. Hover/focus time readout; click seeks if matching file available; drag pan only in explicit zoomed view via Shift+drag or scrollbar; zoom buttons 1×/2×/4×/8×/16× centered on cursor or playhead; Reset 1×. Keyboard accessible time slider mirrors playhead. Accessible summary duration/peak/RMS and textual data alternative; chart itself not sole control.

### Spectrogram

Input versioned calibrated magnitude/power artifact with explicit dB reference; backend must provide reference and frequency limits. Default color domain −80 to 0 dB relative to documented full-scale reference, fixed for comparable artifacts; if backend reference differs, label correctly and do not imply dBFS. Linear interpolation of five heat stops in order at 0/.25/.5/.75/1; low dark to high pale, identical in both themes. Values outside domain clamp, legend includes ≤ and ≥ endpoints. Invalid/missing cells transparent with hatch overlay and legend. Horizontal time aligned with waveform; vertical linear frequency 0 to actual Nyquist (default 11,025 Hz for 22,050 sample rate). Label Hz/kHz, show 4–6 ticks; do not imply ultrasonics beyond analysis range. Color legend right or below at compact width with dB reference. Cursor same playback timestamp; tooltip time/frequency/intensity, no unsupported precision. Zoom time synchronized with waveform; frequency zoom deferred. Use Canvas/ImageBitmap or bounded tiles, no huge DOM. Text alternative describes range, reference, duration and available spectral summary; no claim a screen reader can infer image data.

### Atlas

PC axes unitless, label PC1 and PC2 only if axes shown; no geographic labels, no cluster regions in baseline. Legend sequential metric domain based on eligible snapshot min/max, fixed while filtering; 5 equal normalized stops from seq tokens, linearly interpolated sRGB; equal domain uses midpoint and “constant value”. Missing optional metric points use hollow outline and explicit Unknown legend, not zero. Uniform mode uses point token. No diverging palette unless a meaningful declared midpoint is introduced; categorical palette reserved for validated categories, not P0 cluster claims. Selection ring and shape distinguish selection independent of color. Neighbor distances calculated in original normalized space, never from canvas positions. Show numeric distance to 3 significant digits with explanation, no percentage or ranking by map proximity. No contour decoration that implies density unless calculated and documented (deferred). Persist snapshot identity, coordinate version, viewport locally; refresh replaces snapshot atomically and announces change. Avoid recomputing on render.

### Formatting

Duration mm:ss, h:mm:ss over hour; sample rate kHz up to 2 decimals; frequency Hz below 1000, kHz otherwise up to 2 decimals; dB/dBFS/LUFS one decimal; BPM nearest integer and “estimated”; ratios 2–3 decimals; unknown “—” in compact table with accessible explanation. Display uses locale-aware separators, export raw numeric values + units. Infinity/silence handled by backend status and explicit text. Never display NaN. No UI-derived scientific measurement from pixel data.

## 15. Keyboard contract (Windows)

Use native platform shortcuts first. Never intercept Alt+F4, Windows keys, Ctrl+Tab system/webview behavior, or standard text editing. Global shortcuts ignored when focus is in input, textarea, contenteditable, menu/dialog, or during IME composition unless explicitly applicable. Do not override Ctrl+A/C/V/X/Z in editors. All commands have visible alternatives.

| Shortcut | Scope / action |
|---|---|
| Ctrl+K | Global: open track finder dialog, focus search; Escape closes and restores trigger |
| Ctrl+O | Global: native folder import picker |
| Ctrl+1 / 2 / 3 / 4 | Global: Overview / Library Tracks / Atlas / Settings |
| Ctrl+Shift+A | Global: toggle Analysis drawer |
| Alt+Left / Alt+Right | App history back/forward outside editing |
| Space | Play/pause only when focus is noninteractive workspace/body; native button/checkbox Space wins |
| Ctrl+Shift+Space | Play/pause global outside editors/dialogs |
| Escape | Innermost menu/dialog, then selection mode, then drawer; never exit app |
| Tab / Shift+Tab | Logical focus order; modal traps only |
| Enter / Space | Activate focused native control; Enter on focused track link opens Observatory |
| Arrows / Home / End | Table navigation if using managed grid; otherwise native controls; Atlas canvas pan/reset |
| Shift+Arrow | Extend selection in managed table only |
| Ctrl+A | Select all filtered tracks only when table has managed focus; announce count |
| + / − | Atlas focused canvas zoom |
| Left / Right | Focused seek slider ±5s; volume slider ±5 percentage points |
| Home / End | Focused slider min/max |

Track finder dialog: 560px, search field, up to 10 matching rows title/artist/availability; arrow keys navigate, Enter opens Observatory, Escape closes. No network search. Empty and no-results text. If keyboard shortcut conflicts with WebView2 behavior in native tests, update this map and visible shortcut labels together rather than silently changing semantics.

## 16. Accessibility and native behavior

Target WCAG 2.2 AA applicable to desktop webview. Minimum normal text contrast 4.5:1, large text 3:1, meaningful control boundaries/focus/data marks 3:1 against adjacent background; use control-border rather than decorative border for inputs. Verify exact rendered pairs including hover/selection/error and dark theme. Do not rely on opacity to encode disabled status alone. Focus outline never clipped by overflow/sticky player; scroll focused item into view. Hit area ≥32×32, prefer 36; WCAG minimum 24 where applicable. Use semantic landmarks (header/nav/main/footer), one H1 per route, heading order, aria-current, aria-sort, native inputs, descriptive icon labels. For virtualized tables use correct row counts/indices or accessible paginated fallback; keyboard focus must survive virtualization. Provide skip to main and skip to playback links visible on focus. Modal dialog labeled/described, focus initial safe target, trap and restore; nonmodal drawer no trap. Announce status changes via polite live region; urgent actionable failure role=alert; no duplicate announcements. Do not announce every playback tick. Tooltips accessible by focus. Accessible names include visible label text. No hover-only essential functions, no color-only meaning, no flashing. Respect Windows high contrast/forced-colors: use system colors for text/borders/focus, keep native controls and chart list alternatives. Test Windows Narrator, keyboard-only, 125/150/200% display scaling, text zoom, reduced motion and light/dark. At 200% effective small viewport, scroll/reflow controls rather than clip; canvas has list alternative. Do not force font-size via zoom disable. Native file dialogs use OS defaults.

## 17. Implementation and acceptance gates

Build order: (1) tokens/font loading/theme and shell, (2) primitive components and fixtures, (3) Welcome/Library/Overview, (4) Observatory/player, (5) Atlas/Comparison, (6) analysis drawer/settings and state coverage. Use typed IPC adapters and deterministic mock fixtures for frontend stories/tests; production must never silently fall back to mock data. Query cache for catalog/analysis; UI store only transient selection, filters, viewport and shell state. Native service authoritative for playback/job state. Cancel stale requests or ignore outdated response IDs. Preserve previous view during background refresh. Throttle playback visual updates to animation frame and IPC events per backend contract; no polling loops that block UI.

Acceptance matrix: screenshot each screen at 1440×900 and 1024×640 in light/dark; test each state specified per screen; include long Unicode titles, no artwork, 10k track fixture, zero results, corrupt/missing files, partial features, stale snapshots, long paths, duplicate names, and native dialog cancellation. Verify keyboard shortcut precedence, focus restoration, contrast, screen reader labels, reduced motion, forced colors, playback continuity, source read-only semantics, snapshot stability and chart units. Browser visual regression with fixture IPC plus Windows packaged smoke tests. No screenshot of synthetic data may be represented as production measurement. Release requires PRD gates and design sign-off against these specs.

## 18. Decision register / remaining verification

Confirmed by owner: core scope, editorial/scientific/generative direction, desktop, optional AI later, Windows 11 first. Design decisions made in this specification: native title bar, light default, exact semantic palette, shipping text/icon wordmark, compact rail breakpoint, nonmodal analysis drawer, PCA uniform default map, fixed spectrogram scale conditional on backend reference, and keyboard assignments. These are normative defaults for implementation, not externally user-tested designs. No Figma screens or custom logo assets are included; this document is the layout contract. Font licenses, real WebView2 rendering, native shortcut conflicts, contrast in all rendered states, actual spectrogram calibration, accessibility and performance require verification during implementation. If backend cannot supply a measurement/reference or operation, show explicit unavailable state and raise a contract issue, never invent UI data. Any deviation from this document must be recorded with reason and approved rather than silently improvised.
