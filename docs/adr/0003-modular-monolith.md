# ADR-003: Modular application instead of services

**Status:** Accepted · **Date:** 2026-11-25

## Context

The system has distinct concerns — media, DSP, persistence, jobs, playback, UI — but runs on a
single machine for a single user.

## Decision

Ship one desktop process with clear module boundaries expressed as Rust crates:
`sonic-core` (domain, media, DSP, similarity), `sonic-catalog` (SQLite, migrations, artifact
cache) and `sonic-runtime` (services, jobs, playback). Split further only when an interface has
stabilized and a real need appears.

## Alternatives

- **Microservices or a local HTTP backend** — adds serialization, process management and failure
  modes with no benefit for a single-user desktop app.
- **Seven or more fine-grained crates up front** — premature boundaries that would churn while
  the design is still settling.

## Consequences

- Dependency direction is enforced by Cargo: core depends on nothing above it.
- Fewer packages to version and build.

## Revisit when

A crate grows a second consumer (for example a CLI) whose needs conflict with the current split.
