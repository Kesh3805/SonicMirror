<p align="center">
  <img src="assets/brand/icon.png" width="96" alt="" />
</p>

<h1 align="center">SonicMirror</h1>

<p align="center"><em>A personal observatory for sound.</em></p>

<p align="center">
  A local-first desktop app that explores the hidden structure of your music collection
  through audio science, interactive acoustic maps and honest measurement.
</p>

---

> **Status: early development (Phase 00 — Foundation).** The product and design specifications
> are complete; the engine and interface are being built in the open. Nothing here is a
> released product yet.

## What it is

Most music apps organize songs by artist, album and genre — context, not sound. SonicMirror
listens to the files themselves. It decodes your local audio, measures it, and lets you explore
the collection as an acoustic landscape:

- **Library** — import local folders, search and organize, without ever modifying your files.
- **Track Observatory** — the waveform, spectrogram and validated measurements of a single
  recording: loudness (ITU-R BS.1770), spectral centroid, rolloff, flatness, flux, MFCCs and an
  explicitly *estimated* tempo.
- **Sonic Atlas** — every analyzed track placed on a 2D map by its acoustic features, with
  nearest neighbors computed in the original feature space rather than read off the picture.
- **Comparison** — two recordings side by side, measurement by measurement.

## Principles

- **Your music, your machine.** Everything runs offline. No accounts, no uploads, no telemetry.
- **Science beneath the surface.** Every number has a definition, a unit and a version. A
  measurement that can't be made is reported as unavailable — never as a fabricated zero.
- **Art without deception.** Visualizations are expressive, but a decorative graphic never
  poses as an analytical result.
- **No AI dependency.** The analysis is deterministic and reproducible.

## Architecture

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2 |
| Engine | Rust — Symphonia (decode), RustFFT, SQLite |
| Interface | React 19, TypeScript, Vite |
| Design | Instrument Serif · Geist · IBM Plex Mono, light and dark themes |

```
apps/desktop/        React interface + Tauri adapter (src-tauri)
crates/sonic-core    domain model, media decoding, DSP, similarity
crates/sonic-catalog SQLite catalog, migrations, artifact cache
crates/sonic-runtime services, background jobs, playback
docs/                product, design, architecture and methodology
```

## Development

Requirements: Rust (stable), Node.js 22+, pnpm 10, and the
[Tauri prerequisites](https://tauri.app/start/prerequisites/) for your platform.

```sh
pnpm install
pnpm tauri dev      # run the desktop app
cargo test          # engine tests
pnpm test           # interface tests
```

## Documentation

- [Product Requirements](docs/product/PRD.md)
- [Product Design Specification](docs/design/PRODUCT_DESIGN_SPECIFICATION.md)
- [Roadmap](docs/product/ROADMAP.md)
- [Architecture decisions](docs/adr/)

## License

[Apache-2.0](LICENSE)
