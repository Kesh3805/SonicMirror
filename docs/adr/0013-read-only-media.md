# ADR-013: Read-only original media policy

**Status:** Accepted · **Date:** 2026-11-25

## Context

Users trust SonicMirror with their music collections. Any write to an original file — tags,
artwork, normalization — risks irreversible damage.

## Decision

SonicMirror never opens user audio files for writing. All derived data lives in the catalog and
the application cache. Removing a source, collection or catalog entry never deletes media.

## Alternatives

- **Optional tag editing** — a common feature request, but outside the product's purpose and
  a source of data-loss risk.

## Consequences

- Destructive actions in the UI always state that original files are untouched.
- Tests assert that analysis leaves source file bytes and timestamps unchanged.

## Revisit when

Never for the core product; any future editing feature requires a new ADR and explicit opt-in.
