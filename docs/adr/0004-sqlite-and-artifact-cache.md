# ADR-004: SQLite catalog and external artifact cache

**Status:** Accepted · **Date:** 2026-11-25

## Context

The catalog holds metadata, analysis results, jobs, collections and projection snapshots for at
least 10,000 tracks. Waveform envelopes and spectrograms are large binary artifacts.

## Decision

Use an embedded SQLite database (via rusqlite) with foreign keys, ordered migrations and
parameterized queries. Store large regenerable artifacts as files in an application-managed
cache directory, referenced from the database.

## Alternatives

- **Artifacts as BLOBs in SQLite** — bloats the database, slows backups and vacuuming.
- **An external database server** — inappropriate for a desktop app.
- **Plain JSON files** — no transactions, indexing or integrity constraints.

## Consequences

- Transactional catalog updates; partial analysis is never committed as complete.
- The cache can be cleared and regenerated without touching user data.

## Revisit when

Query performance at the target library size fails the PRD budgets.
