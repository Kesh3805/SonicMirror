# ADR-001: Local-first native desktop architecture

**Status:** Accepted · **Date:** 2026-11-25

## Context

SonicMirror analyzes the audio signal of a personal music collection. That means decoding
thousands of potentially large files, which is slow and privacy-sensitive to do remotely. The
original SonicMirror depended on Spotify, whose developer policy now forbids deriving listening
profiles from its content.

## Decision

SonicMirror is a native desktop application. All core functionality works offline on files the
user already has. There is no server component, account system or mandatory network call.

## Alternatives

- **Web app with cloud analysis** — requires uploading audio; bandwidth, cost and privacy make it
  a poor fit.
- **Web app with in-browser analysis** — limited filesystem access and memory for large libraries.
- **Streaming-provider integration** — blocked by platform policy and couples the product to a
  third party.

## Consequences

- Users need local audio files; a bundled demo collection mitigates the onboarding barrier.
- Distribution requires installers, signing and per-platform testing.
- Privacy is a property of the architecture rather than a policy promise.

## Revisit when

A legitimate, permitted data source would add substantial value; the ingestion boundary stays
provider-independent to allow this.
