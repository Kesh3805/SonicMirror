# ADR-002: Tauri and a Rust computational core

**Status:** Accepted · **Date:** 2026-11-25

## Context

The application needs efficient decoding and DSP with bounded memory, safe parsing of untrusted
media, and a rich interactive interface for visualizations.

## Decision

The engine is written in Rust and the interface in React + TypeScript, packaged with Tauri 2.
The engine crates do not depend on Tauri, so they remain usable from tests, benchmarks and a
future CLI.

## Alternatives

- **Electron + Node native modules** — larger footprint, weaker default isolation between UI and
  native capabilities.
- **Native UI toolkit (egui, Qt)** — less mature for the editorial typography and data
  visualization the design requires.
- **Python engine** — strong MIR ecosystem but a heavy runtime to ship and weaker resource control.

## Consequences

- Memory safety and explicit resource control for media parsing.
- UI renders in the OS webview (WebView2 on Windows), which must be validated per platform.
- Rust ↔ TypeScript contracts need generated types to avoid drift (ADR-008).

## Revisit when

The webview cannot meet the Atlas rendering budget, or a required DSP capability has no viable
Rust implementation.
