# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

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
- Library tracks table with import flow and the Track Observatory screen with a
  real-sample waveform and explained measurements.
