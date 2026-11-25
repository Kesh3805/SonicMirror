# ADR-009: Versioned acoustic feature schema

**Status:** Accepted · **Date:** 2026-11-25

## Context

Measurements will improve over time. Results computed by different algorithm versions must not
be mixed silently, and the interface must never show NaN or a fabricated zero.

## Decision

Every feature is an `AudioFeature { key, value, unit, status, algorithmVersion, confidence?,
diagnosticCode? }` where `status` is `valid`, `unavailable` or `failed`. Each analyzer exposes an
`ALGORITHM_VERSION` constant that is bumped whenever results can change. Non-finite values are
demoted to `failed` at construction.

## Alternatives

- **Bare numeric columns** — cannot express "not measurable" without sentinel values.
- **One global engine version** — invalidates everything for any change.

## Consequences

- The frontend renders unavailable states explicitly with a reason.
- Similarity and projections only combine features from matching schema versions.

## Revisit when

Per-feature versioning becomes too granular to manage; group versions can then be introduced.
