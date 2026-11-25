# ADR-010: Exact similarity and PCA baseline

**Status:** Accepted · **Date:** 2026-11-25

## Context

The Sonic Atlas needs nearest neighbors and a 2D layout for up to 10,000 tracks. UMAP, HDBSCAN
and approximate vector indexes are tempting but add complexity and non-determinism.

## Decision

Normalize features robustly (`z = (x − median) / IQR`), weight feature groups so no group
dominates by coefficient count, compute weighted Euclidean distance, retrieve neighbors by exact
search in the original space, and project with PCA. Distances are never shown as percentages.

## Alternatives

- **UMAP / t-SNE** — better local structure, but stochastic and harder to explain.
- **Approximate nearest neighbors** — unnecessary below roughly 100k vectors.

## Consequences

- Deterministic, explainable, cheap baseline.
- The interface must state that map proximity is approximate.

## Revisit when

A documented evaluation shows another method yields more meaningful discoveries for users.
