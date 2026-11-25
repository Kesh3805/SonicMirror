# ADR-006: Content-addressed analysis caching

**Status:** Accepted · **Date:** 2026-11-25

## Context

Files are renamed, moved, duplicated and re-encoded. Analysis is expensive, so it must be reused
when valid and invalidated when anything relevant changes.

## Decision

Cache identity is `K = H(D_audio ‖ V_engine ‖ V_schema ‖ C)`, where `D_audio` is a BLAKE3 digest
of the file content, `V_engine` and `V_schema` are analyzer and feature-schema versions, and `C`
is the canonical analysis configuration, all encoded unambiguously. File size and modification
time are only rescan hints.

## Alternatives

- **Path-based caching** — breaks on rename and serves stale results after edits.
- **mtime-only invalidation** — unreliable across copies and filesystems.

## Consequences

- Byte-identical copies share analysis automatically.
- Changing any analyzer version invalidates exactly the affected results.

## Revisit when

Hashing cost dominates import time at the target library size.
