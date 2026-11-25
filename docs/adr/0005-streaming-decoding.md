# ADR-005: Streaming audio decoding and processing

**Status:** Accepted · **Date:** 2026-11-25

## Context

Recordings can be arbitrarily long. Decoding a full track into memory before analysis makes
memory use proportional to duration and multiplies with worker concurrency.

## Decision

Decode with Symphonia packet by packet and feed analyzers incrementally. Loudness and level
measurements consume channel-aware PCM at the native rate; spectral analysis consumes a
downmixed, resampled 22,050 Hz stream framed into 2,048-sample Hann windows with a 512 hop.
Cancellation is checked at packet boundaries.

## Alternatives

- **Decode whole file, then analyze** — simpler, but unbounded memory.
- **Shell out to FFmpeg** — external dependency, licensing and packaging burden, harder sandboxing.

## Consequences

- Analyzers are written as streaming accumulators.
- An analyzer failure can be isolated, producing a partial result.

## Revisit when

An analyzer genuinely requires random access to the whole signal (for example structural
segmentation), in which case it gets a bounded, documented buffering strategy.
