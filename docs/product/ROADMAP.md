# Roadmap

SonicMirror is built as a sequence of complete, verifiable slices. No calendar dates are
committed; each phase ends on its exit criteria, not on a deadline.

| Phase | Name | Exit criteria | Status |
|---|---|---|---|
| 00 | Foundation | Workspace, CI, design tokens, app shell, synthetic fixtures, compatibility spikes | Mostly done |
| 01 | Audio vertical slice | One recording imported, decoded, analyzed, stored and displayed with validated numbers | In progress |
| 02 | Library and runtime | 10,000-track library indexed and analyzed incrementally without blocking the UI | Planned |
| 03 | Observatory | Waveform, spectrogram, explained measurements and integrated playback | Planned |
| 04 | Sonic Atlas | Feature vectors, exact neighbors, PCA map, filters, comparison, collections | Planned |
| 05 | Hardening | Demo collection, all interface states, accessibility, recovery, benchmarks, packaging | Planned |
| 06 | Core release | A new user installs SonicMirror and completes the primary workflow unaided | Planned |

## Phase 00 checklist

- [x] Product requirements and design specification
- [x] Cargo workspace (`sonic-core`, `sonic-catalog`, `sonic-runtime`)
- [x] Versioned feature result contract
- [x] Synthetic signal fixtures
- [x] Level measurements (RMS, sample peak, crest factor)
- [x] Streaming spectral features (centroid, bandwidth, rolloff, flatness, flux)
- [x] Design tokens, local fonts, light/dark themes
- [x] Application shell and routes
- [x] Interface redesign from the research survey (see `docs/design/REDESIGN_BRIEF.md`)
- [x] Tauri 2 desktop shell with minimal capabilities
- [x] CI quality gates
- [ ] Remaining architecture decision records (007, 008, 011, 012, 014, 015)
- [x] Software Architecture Document
- [ ] Audio Analysis Technical Specification
- [x] Decoder spike (Symphonia, WAV verified; other formats pending fixtures)
- [ ] Playback spike (Rodio/CPAL on Windows)
- [ ] IPC type generation spike

## Phase 01 checklist

- [x] Streaming decode, downmix and resampling
- [x] Level and spectral features end to end
- [x] Waveform envelope artifact
- [x] SQLite catalog and artifact cache
- [x] Import through the native dialog, tracks table, Observatory screen
- [x] BS.1770 integrated loudness and loudness range
- [x] Onset and tempo estimation with confidence
- [x] MFCC summary
- [x] Spectrogram artifact and view
- [ ] Reconcile features with the Audio Analysis Technical Specification
- [ ] Fixtures for MP3, FLAC, Ogg and M4A

## After the core release

Identity (collection portraits), Studio (generative artwork from audio features), Discovery
(sonic journeys, collection bridges), then Journal, Lab, a CLI and optional AI — each only after
the core is validated. See [PRD §48](PRD.md#48-post-core-roadmap).
