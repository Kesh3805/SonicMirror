# Contributing to SonicMirror

Thanks for your interest. SonicMirror is in early development, so the best contributions right
now are bug reports, DSP validation and careful review.

## Ground rules

- Read the [PRD](docs/product/PRD.md) and [design specification](docs/design/PRODUCT_DESIGN_SPECIFICATION.md)
  before proposing features. Scope beyond the core release is intentionally deferred.
- Measurements must be honest: no fabricated values, no silent zeros, explicit units and versions.
- Original audio files are read-only. Code that could modify them will not be merged.

## Setup

```sh
pnpm install
cargo test
pnpm test
pnpm tauri dev
```

## Before opening a pull request

```sh
cargo fmt --all
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat(dsp): ...`,
`fix(catalog): ...`, `docs: ...`. Keep commits focused; one logical change each.

## DSP changes

Any change that can alter a measurement must bump that analyzer's `ALGORITHM_VERSION` and include
a test against a synthetic fixture with a documented tolerance.
