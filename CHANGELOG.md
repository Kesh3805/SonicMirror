# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Sonic Atlas: a deterministic PCA map of 19 measured dimensions (MFCC 1–12, spectral
  balance, texture and dynamics) with robust median/IQR normalization and equal group
  weights. Nearest neighbours are exact and measured in the original space, shown with
  three-significant-digit distances and the group that drives each difference. Tracks that
  cannot be placed are listed with the missing measurement. Colour by centroid, loudness,
  tempo or flatness with measured endpoints and unknown counts, plus a track-list view.
- Atlas filters and region selection: filter by title or artist and by unit-labelled
  ranges of centroid, loudness, tempo and flatness. Filters only hide points, never refit
  the map, and say how many tracks a missing measurement hides. Drag a rectangle in
  Select region mode or Ctrl+click to build a multi-track selection; selections hidden by
  a filter are dropped with a notice.
- Saved Atlas snapshots: the map is stored on first use with each point tied to the
  analysis it came from, and coordinates only change on Refresh map. Imports, deletions,
  reanalysis or an engine change mark the map stale with a banner that says what changed;
  reanalyzed and new tracks are left off the old map instead of being placed from other
  measurements. Catalog schema version 2.
- Track comparison: choose two recordings and see every measurement side by side with
  B − A in its own unit (loudness differences in LU), unavailable values with their
  reason, MFCC coefficients in full, and the original-space distance with each feature
  group's share. No difference is shown across algorithm versions, and no distance across
  feature schemas. Open it from the Observatory, the Atlas inspector, or a two-track
  Atlas selection.
- Codec fixtures generated from a synthetic signal (WAV, AIFF, FLAC, ALAC, MP3, Vorbis,
  AAC) with integration tests; lossless codecs are verified bit-exact.
- Spectrograms: 256 linear bands with bounded memory for any track length, stored as a
  versioned artifact in dB re a full-scale sine, shown as an Observatory lane on the shared
  time axis with a fixed −80…0 dB colour ruler and a cell readout.
- MFCC timbre summaries (13 coefficients, 40 mel bands; mean and spread per track), shown as
  coefficient tables in the Observatory's technical details. Feature schema `features/0.3.0`.
- Interface redesign from a 652-site research survey (`docs/design/REDESIGN_BRIEF.md`):
  neutral surface and rule tokens, an oxide accent reserved for playhead, selection and
  primary action, lightness-ordered data ramps, square geometry, a serif/sans/mono role
  system with tabular numerals and thin-space units, and WCAG contrast tests for both themes.
- Track Observatory as an instrument: mono file-fact kicker, display title, a headline
  sentence built only from valid measurements, a provenance chain, the waveform as a
  labelled lane with a crosshair readout, hero measurements per group with a neutral
  loudness reference scale, and inline method disclosure.
- Dense Library table, an Overview of collection counts and recent additions, typographic
  empty states, a Settings page with appearance and reduce-motion preferences, and an honest
  playback strip with no dead controls.
- Product requirements document and product design specification.
- Cargo workspace with `sonic-core`, `sonic-catalog` and `sonic-runtime` crates.
- Versioned acoustic feature result contract with explicit unavailable and failed states.
- Deterministic synthetic signal generators for tests and benchmarks.
- RMS level, sample peak and crest factor measurements.
- Streaming spectral analyzer: centroid, bandwidth, rolloff, flatness and flux with a periodic Hann window.
- Architecture decision records for the core architecture.
- Design tokens, locally bundled fonts and light/dark themes.
- Desktop application shell with Overview, Library, Atlas and Settings routes.
- Tauri 2 desktop shell with minimal capabilities and a strict content security policy.
- Continuous integration for Rust and the frontend.
- Streaming Symphonia decoder with structured, path-free media errors.
- Sanitized tag metadata via Lofty.
- Mono downmix and streaming FFT resampling to the 22,050 Hz analysis rate.
- Multiresolution waveform envelope with a versioned little-endian format.
- Single-pass analysis pipeline with cancellation.
- BLAKE3 content digests and length-prefixed analysis cache keys.
- SQLite catalog with migrations, tracks, analysis runs, features and artifacts;
  the schema itself rejects stored values on unavailable features.
- Library service and Tauri commands: import through the native file dialog,
  list tracks, read features and waveform data.
- BS.1770-4 K-weighting with rate-independent coefficients matching the
  published 48 kHz values.
- Integrated loudness (LUFS) with absolute and relative gating, and EBU Tech
  3342 loudness range (LU); 5.0/5.1 surround weighting with LFE excluded.
- Onset strength envelope and autocorrelation tempo estimation with
  confidence; tempo is withheld with a reason when the pulse is unclear.
- Library tracks table with import flow and the Track Observatory screen with a
  real-sample waveform and explained measurements.
