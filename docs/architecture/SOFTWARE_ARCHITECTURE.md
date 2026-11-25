# SonicMirror | Software Architecture Document

| Document metadata | Value |
|---|---|
| Version | 1.0 |
| Date | November 25, 2026 |
| Status | Implementation baseline |
| Scope | Core release |
| Product specification | PRD v1.0 |
| Design specification | PDS v1.0 |
| Primary development platform | Windows 11, x86-64 |
| Architecture | Local-first modular application |
| Primary languages | Rust and TypeScript |
| Intended repository path | `docs/architecture/SOFTWARE_ARCHITECTURE.md` |

## 1. Purpose and authority

This document defines the software architecture of SonicMirror's core desktop application.

It translates the approved product and design specifications into concrete application boundaries, module responsibilities, persistence contracts, native interaction interfaces, concurrency policies, security controls and implementation constraints.

The following documents establish the project specification hierarchy:

| Document | Authority |
|---|---|
| PRD | Product behavior, scope and acceptance criteria |
| PDS | Visual appearance, interaction behavior and accessibility |
| SAD | Architecture, responsibilities and integration contracts |
| Audio Analysis Technical Specification | Mathematical definitions and numerical correctness |
| Architecture Decision Records | Documented architectural decisions and approved deviations |
| Implementation Plan | Development sequencing and task-level verification |

The SAD is normative for architectural implementation. A coding agent must not introduce additional infrastructure, change persistence semantics, bypass application services or modify public contracts without recording the proposed deviation.

The mathematical implementations of individual audio features will be finalized in the Audio Analysis Technical Specification. This document establishes their execution and integration boundaries without prematurely freezing unvalidated algorithms.

# Part I — Architectural foundations

## 2. Architecture overview

SonicMirror is a single-user, local-first modular desktop application.

The application consists of a React presentation layer running inside a Tauri-managed native webview, a Rust application runtime, an independent computational core and embedded local persistence.

There is no separately deployed backend.

### 2.1 Architectural style

The architecture combines:

| Pattern | Application |
|---|---|
| Modular monolith | One deployable application with explicit internal boundaries |
| Ports and adapters | Independent domain logic and replaceable infrastructure boundaries |
| Command/query separation | Separate state-changing operations from read operations |
| Actor-style concurrency | Serialized ownership of playback and scheduling state |
| Content-addressed caching | Reuse analysis based on deterministic input identity |
| Event-driven presentation | Notify frontend of native state changes |
| Local-first persistence | Durable application state without remote infrastructure |

SonicMirror does not implement full event sourcing or distributed CQRS. Ordinary relational persistence remains the source of truth.

Events are notifications, not the authoritative historical record.

## 3. Architectural invariants

These invariants must remain true across all core-release implementations.

| ID | Invariant |
|---|---|
| ARCH-001 | Original audio files are never modified by SonicMirror. |
| ARCH-002 | Core workflows require no external network connection. |
| ARCH-003 | The Rust runtime is authoritative for catalog, job and playback state. |
| ARCH-004 | Computational code does not depend on Tauri or React. |
| ARCH-005 | Audio processing uses bounded memory rather than full-file PCM loading. |
| ARCH-006 | Analysis results are versioned and reproducible within documented tolerances. |
| ARCH-007 | Invalid measurements are never represented as fabricated valid values. |
| ARCH-008 | Catalog writes and job completion are transactional. |
| ARCH-009 | IPC commands cannot expose unrestricted filesystem or SQL access. |
| ARCH-010 | Cache invalidation is based on explicit content and configuration identity. |
| ARCH-011 | Background processing must not monopolize the UI or playback execution paths. |
| ARCH-012 | Unreleased product modules must not introduce dormant production infrastructure. |

Violating an architectural invariant requires an approved ADR, not merely a code comment.

## 4. Architecture constraints and exclusions

The core release explicitly excludes:

- HTTP application servers and REST endpoints.
- Remote authentication and user accounts.
- Cloud databases and object storage.
- Distributed workers, message brokers and container orchestration.
- Mandatory Python, Node.js or external FFmpeg executables at application runtime.
- Generative AI providers and external music-service integrations.
- Dynamic third-party plugin execution.
- Persistent listening history and psychological profiling.

Node.js remains a development and frontend build dependency. It is not an independently running production service.

# Part II — Technology and repository organization

## 5. Technology baseline

| Concern | Implementation |
|---|---|
| Desktop shell | Tauri 2 |
| Windows webview | Microsoft Edge WebView2 |
| Native language | Rust, stable toolchain |
| Frontend | React and TypeScript, strict mode |
| Frontend build | Vite |
| JavaScript package manager | pnpm |
| Rust package manager | Cargo |
| Routing | React Router |
| Async query state | TanStack Query |
| Interface state | Zustand |
| UI primitives | Radix UI |
| Styling | CSS variables, CSS modules or token-backed Tailwind utilities |
| Media decoding | Symphonia |
| Metadata extraction | Lofty |
| FFT | RustFFT |
| Resampling | Rubato |
| Playback | Rodio with CPAL backend |
| Relational persistence | SQLite through rusqlite |
| Search indexing | SQLite FTS5 |
| Content hashing | BLAKE3 |
| Serialization | Serde |
| Async coordination | Tokio |
| CPU-bound computation | Dedicated Rayon thread pool |
| Linear algebra | nalgebra |
| Rust-to-TypeScript bindings | Specta or equivalent validated generator |
| Error modeling | thiserror |
| Structured diagnostics | tracing and tracing-subscriber |
| Identifier generation | UUID |
| Benchmarking | Criterion |
| Rust property testing | proptest |
| Frontend testing | Vitest and Testing Library |
| Frontend E2E testing | Playwright |
| CI/CD | GitHub Actions |

This is the selected technology direction, not a claim that every dependency combination has already been compiled and validated.

Exact versions will be pinned after the compatibility spike. Both `Cargo.lock` and `pnpm-lock.yaml` must be committed.

Use a pinned Rust toolchain in `rust-toolchain.toml`. The project should use stable Rust rather than introduce nightly-only features without a documented requirement.

### 5.1 Windows development constraints

The first validated native toolchain will target:

```text
x86_64-pc-windows-msvc
```

The development environment requires the Rust MSVC toolchain, compatible Visual Studio C++ build tools, Windows SDK, WebView2 runtime, Node.js and pnpm.

The exact installation procedure and supported dependency versions belong in `CONTRIBUTING.md` after verification on the actual Windows development environment.

## 6. Repository structure

```text
sonicmirror/
├── apps/
│   └── desktop/
│       ├── src/
│       │   ├── app/
│       │   │   ├── App.tsx
│       │   │   ├── providers.tsx
│       │   │   └── router.tsx
│       │   ├── shell/
│       │   ├── routes/
│       │   ├── features/
│       │   │   ├── onboarding/
│       │   │   ├── overview/
│       │   │   ├── library/
│       │   │   ├── observatory/
│       │   │   ├── atlas/
│       │   │   ├── comparison/
│       │   │   ├── analysis/
│       │   │   ├── playback/
│       │   │   └── settings/
│       │   ├── design-system/
│       │   │   ├── tokens.css
│       │   │   ├── global.css
│       │   │   └── primitives/
│       │   ├── visualizations/
│       │   │   ├── waveform/
│       │   │   ├── spectrogram/
│       │   │   └── atlas/
│       │   ├── ipc/
│       │   │   ├── generated/
│       │   │   ├── client.ts
│       │   │   ├── events.ts
│       │   │   └── errors.ts
│       │   ├── stores/
│       │   ├── hooks/
│       │   ├── lib/
│       │   └── test/
│       ├── public/
│       ├── src-tauri/
│       │   ├── src/
│       │   │   ├── main.rs
│       │   │   ├── lib.rs
│       │   │   ├── bootstrap.rs
│       │   │   ├── state.rs
│       │   │   ├── commands/
│       │   │   ├── dto/
│       │   │   ├── events/
│       │   │   └── platform/
│       │   ├── capabilities/
│       │   ├── icons/
│       │   ├── Cargo.toml
│       │   ├── build.rs
│       │   └── tauri.conf.json
│       ├── package.json
│       ├── vite.config.ts
│       └── tsconfig.json
│
├── crates/
│   ├── sonic-core/
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── domain/
│   │   │   ├── media/
│   │   │   ├── dsp/
│   │   │   ├── features/
│   │   │   └── similarity/
│   │   ├── tests/
│   │   ├── benches/
│   │   └── Cargo.toml
│   │
│   ├── sonic-catalog/
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── database/
│   │   │   ├── repositories/
│   │   │   ├── artifacts/
│   │   │   └── error.rs
│   │   ├── migrations/
│   │   ├── tests/
│   │   └── Cargo.toml
│   │
│   └── sonic-runtime/
│       ├── src/
│       │   ├── lib.rs
│       │   ├── services/
│       │   ├── jobs/
│       │   ├── playback/
│       │   ├── events/
│       │   ├── settings/
│       │   └── error.rs
│       ├── tests/
│       └── Cargo.toml
│
├── assets/
│   ├── brand/
│   ├── demo/
│   └── licenses/
├── tests/
│   ├── fixtures/
│   └── e2e/
├── experiments/
├── scripts/
├── docs/
│   ├── product/
│   ├── design/
│   ├── architecture/
│   ├── methodology/
│   ├── security/
│   ├── adr/
│   └── BENCHMARKS.md
├── .github/
│   ├── workflows/
│   └── ISSUE_TEMPLATE/
├── Cargo.toml
├── Cargo.lock
├── rust-toolchain.toml
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── package.json
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
├── CHANGELOG.md
└── LICENSE
```

Directories may be created incrementally. Do not create dozens of empty modules, placeholder traits or speculative implementations merely to match the eventual tree.

## 7. Dependency graph

Allowed Rust dependencies:

| Crate | Internal dependencies |
|---|---|
| `sonic-core` | None |
| `sonic-catalog` | `sonic-core` |
| `sonic-runtime` | `sonic-core`, `sonic-catalog` |
| Desktop adapter | `sonic-runtime`, `sonic-core` |

Reverse dependencies are prohibited.

The catalog crate must not call application services. The computational core must not perform Tauri invocation, database queries or playback orchestration.

Where isolated testing requires substitution, define small interfaces at the consuming boundary. Do not introduce a universal dependency-injection framework.

# Part III — Domain model and module responsibilities

## 8. `sonic-core`

**Responsibility:** Own the application-independent domain vocabulary, media processing, acoustic analysis and similarity algorithms.

### Module boundaries

| Module | Responsibility |
|---|---|
| `domain::ids` | Strongly typed identifiers |
| `domain::media` | Media metadata and technical properties |
| `domain::analysis` | Analysis configuration and results |
| `domain::features` | Feature identifiers, values and statuses |
| `domain::projection` | Feature vectors, projection snapshots and distances |
| `media::decoder` | Streaming media decoding |
| `media::metadata` | Tag and artwork extraction |
| `media::fingerprint` | Content digest computation |
| `dsp::pipeline` | Analysis execution coordination |
| `dsp::levels` | Signal amplitude and dynamics |
| `dsp::spectral` | FFT-based descriptors |
| `dsp::loudness` | Validated loudness implementation |
| `dsp::rhythm` | Tempo and rhythmic estimation |
| `dsp::waveform` | Waveform envelope generation |
| `dsp::spectrogram` | Time-frequency artifact generation |
| `features::registry` | Versioned feature definitions |
| `similarity::normalize` | Feature normalization |
| `similarity::distance` | Weighted feature-space distance |
| `similarity::neighbors` | Exact nearest-neighbor retrieval |
| `similarity::pca` | Deterministic baseline projection |

The core crate should contain the greatest concentration of numerical tests and benchmarks.

### 8.1 Strongly typed identifiers

```rust
use serde::{Deserialize, Serialize};
use uuid::Uuid;

macro_rules! define_id {
    ($name:ident) => {
        #[derive(
            Debug,
            Clone,
            Copy,
            PartialEq,
            Eq,
            Hash,
            Serialize,
            Deserialize,
        )]
        #[serde(transparent)]
        pub struct $name(pub Uuid);
    };
}

define_id!(SourceId);
define_id!(TrackId);
define_id!(AlbumId);
define_id!(ArtistId);
define_id!(CollectionId);
define_id!(AnalysisId);
define_id!(JobId);
define_id!(ArtifactId);
define_id!(AtlasSnapshotId);
```

`TrackId` identifies an imported physical audio-file entry during the core release.

Different recordings must not automatically share track identity simply because they have matching titles and artists.

Content identity is separate from catalog identity.

```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ContentDigest(pub [u8; 32]);
```

Use lowercase hexadecimal representation at persistence and IPC boundaries.

### 8.2 Domain status types

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FileAvailability {
    Available,
    Missing,
    Inaccessible,
    Unsupported,
    Corrupt,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FeatureStatus {
    Valid,
    Unavailable,
    Failed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AnalysisStatus {
    Complete,
    Partial,
    Failed,
}
```

Job status is a separate runtime concept. A successful analysis record and a currently running reanalysis job can coexist.

Do not overload one enum to represent file availability, feature validity, job execution and cache freshness.

### 8.3 Measurement values

```rust
#[derive(Debug, Clone)]
pub enum FeatureValue {
    Scalar(f64),
    Vector(Vec<f64>),
}

#[derive(Debug, Clone)]
pub struct AudioFeature {
    pub key: String,
    pub value: Option<FeatureValue>,
    pub unit: Option<String>,
    pub status: FeatureStatus,
    pub algorithm_version: String,
    pub confidence: Option<f64>,
    pub diagnostic_code: Option<String>,
}
```

Rules:

- A valid feature must have a finite value.
- An unavailable or failed feature must not contain a fabricated numerical value.
- Confidence is optional and must be meaningful for the specific estimator.
- Arbitrary confidence values must not be generated simply to populate the UI.
- Feature keys are controlled by the feature registry.
- Vector length must match the versioned feature definition.

Constructors should enforce these invariants rather than allow unconstrained public construction throughout the application.

## 9. `sonic-catalog`

**Responsibility:** Own all durable application persistence.

| Module | Responsibility |
|---|---|
| `database::connection` | SQLite connection configuration |
| `database::writer` | Serialized write execution |
| `database::reader` | Bounded read execution |
| `database::migration` | Ordered schema upgrades |
| `repositories::sources` | Library-source persistence |
| `repositories::tracks` | Catalog entries and metadata |
| `repositories::collections` | Logical user collections |
| `repositories::analysis` | Analysis records and feature values |
| `repositories::jobs` | Durable work-queue state |
| `repositories::atlas` | Projection snapshots |
| `repositories::settings` | Persistent application configuration |
| `artifacts::store` | Managed cache artifacts |
| `artifacts::cleanup` | Orphan detection and cache reclamation |

All SQL statements belong in this crate.

Application services must not construct SQL strings. React must never invoke a generic SQL command.

Repository methods should represent domain operations rather than expose a generic CRUD abstraction.

Example interfaces:

```rust
pub trait TrackRepository {
    fn get(
        &self,
        id: TrackId,
    ) -> Result<Option<TrackRecord>, CatalogError>;

    fn list(
        &self,
        query: &TrackQuery,
    ) -> Result<TrackPage, CatalogError>;
}

pub trait AnalysisRepository {
    fn find_by_key(
        &self,
        key: &AnalysisCacheKey,
    ) -> Result<Option<AnalysisRecord>, CatalogError>;
}
```

These interfaces describe architectural responsibilities. Concrete repositories may be used directly until alternative implementations or test substitutions justify traits.

## 10. `sonic-runtime`

**Responsibility:** Coordinate user-facing application operations.

| Module | Responsibility |
|---|---|
| `services::library` | Imports, scanning and source management |
| `services::analysis` | Analysis requests and result retrieval |
| `services::atlas` | Projection generation and neighbor retrieval |
| `services::comparison` | Two-track analytical comparison |
| `services::collections` | Collection membership operations |
| `services::export` | Scoped data export |
| `services::settings` | Configuration and reset workflows |
| `jobs::coordinator` | Durable scheduling and job dispatch |
| `jobs::worker` | Computational job execution |
| `jobs::cancellation` | Cooperative cancellation |
| `jobs::recovery` | Restart reconciliation |
| `playback::actor` | Serialized playback ownership |
| `playback::backend` | Native audio integration |
| `events::bus` | Runtime notifications |
| `settings::validation` | Typed settings validation |

Application services own orchestration across domain modules and persistence.

For example, `LibraryService` discovers an authorized file, requests metadata extraction, performs catalog reconciliation, enqueues analysis when appropriate and publishes relevant events.

The Tauri command adapter does not reproduce that workflow.

### 10.1 Application service interfaces

```rust
pub struct AppServices {
    pub library: LibraryService,
    pub analysis: AnalysisService,
    pub atlas: AtlasService,
    pub comparison: ComparisonService,
    pub collections: CollectionService,
    pub playback: PlaybackHandle,
    pub exports: ExportService,
    pub settings: SettingsService,
    pub jobs: JobCoordinatorHandle,
}
```

`AppServices` is initialized once during application bootstrap and managed by Tauri application state.

Mutable state must be owned by its relevant subsystem, not placed inside one application-wide mutex.

# Part IV — Application lifecycle and filesystem

## 11. Application bootstrap

Application initialization must be ordered, observable and recoverable.

### Bootstrap state

The frontend must distinguish between:

```ts
type BootstrapState =
  | { status: "initializing"; stage: string }
  | { status: "ready"; onboardingCompleted: boolean }
  | { status: "failed"; error: ApplicationError };
```

The application must not mount the normal library workspace and issue catalog requests before initialization has completed.

Startup failures must produce actionable states rather than a blank webview.

### Single-instance ownership

The core release supports one running SonicMirror instance per application-data directory.

A second invocation should focus the existing application instead of opening another process that competes for the same job queue, database and audio output.

Use a validated Tauri single-instance mechanism or platform-compatible locking strategy.

Development and production builds must use separate application-data roots.

## 12. Application directories

Use Tauri's platform path-resolution APIs.

Never construct installation or user-data paths by concatenating assumptions about drive letters, usernames or Windows system folders.

The proposed application identifier is:

```text
io.sonicmirror.desktop
```

The identifier must be approved before public distribution because changing it may affect installer behavior and application-data locations.

### Logical storage layout

```text
<app-local-data>/
├── catalog/
│   └── sonicmirror.sqlite3
├── artifacts/
│   ├── waveform/
│   ├── spectrogram/
│   └── artwork/
├── demo/
│   ├── manifest.json
│   └── audio/
├── logs/
├── backups/
└── runtime/
```

| Directory | Contents | Regenerable |
|---|---|---|
| `catalog` | Catalog, jobs, configuration, collections | No |
| `artifacts/waveform` | Waveform envelope files | Yes |
| `artifacts/spectrogram` | Spectrogram tiles | Yes |
| `artifacts/artwork` | Extracted and resized artwork | Yes |
| `demo` | Materialized licensed demonstration assets | Yes |
| `logs` | Bounded diagnostic history | Yes |
| `backups` | Migration and recovery backups | No |
| `runtime` | Lock files and temporary runtime state | Yes |

On Windows, this will typically resolve under an application-specific local AppData directory, but the resolved platform location is authoritative.

The application must remain functional when user paths contain Unicode, spaces, long filenames or non-ASCII characters.

### Path representation

Native paths must use Rust's `Path` and `PathBuf` internally.

Windows paths must not be normalized using generic web URL manipulation or JavaScript string replacements.

Because native paths are not guaranteed to round-trip through ordinary Unicode strings, persistence should separate:

- A lossless platform-specific path representation.
- A human-readable display path.
- A normalized path-identity key.

For Windows, the lossless representation may encode native UTF-16 code units into a database BLOB. Unix implementations can encode native path bytes.

The display string is never used as the authoritative filesystem-access path.

## 13. Shutdown behavior

Normal shutdown proceeds as follows:

Shutdown must have a bounded waiting period. A blocked decoder or native dependency must not hold the entire application open indefinitely.

If graceful shutdown cannot complete within the configured timeout, the application may terminate. Startup recovery must identify remaining `running` jobs and reconcile them.

Do not rely on destructors or frontend unload events as the only persistence mechanism.

# Part V — Persistence architecture

## 14. SQLite configuration

Use one embedded SQLite database for authoritative application state.

### Connection policy

| Setting | Baseline |
|---|---|
| Journal mode | WAL |
| Foreign keys | Enabled on every connection |
| Busy timeout | 5,000 ms |
| Synchronous mode | FULL initially |
| Writer count | One dedicated writer connection |
| Reader count | Bounded pool, initially two |
| Reader mode | Query-only connections |
| Migrations | Versioned, transactional where supported |
| SQL parameters | Bound parameters only |

Representative connection initialization:

```sql
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = FULL;
```

Connection-specific settings must be applied to each relevant connection rather than assume they propagate automatically.

Do not execute write-affecting initialization pragmas indiscriminately on query-only connections.

The `FULL` durability baseline is selected because persisted collections and job state should survive ordinary application failures reliably. Any later change to `NORMAL` requires a documented durability and performance trade-off.

### Database concurrency model

All production writes are serialized through a dedicated catalog writer.

Reads execute through separate bounded read connections.

Avoid `Arc<Mutex<Connection>>` as the global database architecture.

SQLite transactions must remain short. Audio decoding, file hashing, spectrogram construction and long filesystem operations must not occur inside write transactions.

## 15. Persistence model

### Key correction to the conceptual PRD schema

A track can belong to multiple imported source directories when source roots overlap.

Therefore, source membership is modeled through `source_tracks` instead of assigning each track exactly one source.

This prevents duplicate catalog entries when a user imports both a parent music directory and one of its subdirectories.

Removing a source removes its membership relationship. It must not remove a track still associated with another source.

## 16. Initial database migration

The following SQL establishes the initial schema contract.

The catalog implementation must embed ordered migrations and test them against the selected bundled SQLite build. This SQL has not yet been executed against the project's actual Rust workspace.

```sql
-- 0001_initial_schema.sql

CREATE TABLE library_sources (
    id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL
        CHECK (kind IN ('directory', 'file', 'demo')),
    path_native BLOB NOT NULL,
    path_display TEXT NOT NULL,
    path_key BLOB NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'available'
        CHECK (status IN (
            'available',
            'missing',
            'inaccessible'
        )),
    scan_generation INTEGER NOT NULL DEFAULT 0
        CHECK (scan_generation >= 0),
    created_at_ms INTEGER NOT NULL,
    last_scan_at_ms INTEGER
);

CREATE TABLE albums (
    id TEXT PRIMARY KEY NOT NULL,
    grouping_key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    album_artist TEXT,
    release_year INTEGER
);

CREATE TABLE artists (
    id TEXT PRIMARY KEY NOT NULL,
    grouping_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
);

CREATE TABLE tracks (
    id TEXT PRIMARY KEY NOT NULL,

    path_native BLOB NOT NULL,
    path_display TEXT NOT NULL,
    path_key BLOB NOT NULL UNIQUE,

    content_hash TEXT
        CHECK (
            content_hash IS NULL
            OR length(content_hash) = 64
        ),

    size_bytes INTEGER NOT NULL
        CHECK (size_bytes >= 0),

    modified_at_ms INTEGER,
    filesystem_identity BLOB,

    content_revision INTEGER NOT NULL DEFAULT 0
        CHECK (content_revision >= 0),

    title TEXT NOT NULL,
    artist_display TEXT,
    album_display TEXT,
    genre TEXT,
    release_year INTEGER,

    album_id TEXT
        REFERENCES albums(id)
        ON DELETE SET NULL,

    track_number INTEGER
        CHECK (
            track_number IS NULL
            OR track_number > 0
        ),

    disc_number INTEGER
        CHECK (
            disc_number IS NULL
            OR disc_number > 0
        ),

    duration_ms INTEGER
        CHECK (
            duration_ms IS NULL
            OR duration_ms >= 0
        ),

    sample_rate_hz INTEGER
        CHECK (
            sample_rate_hz IS NULL
            OR sample_rate_hz > 0
        ),

    channel_count INTEGER
        CHECK (
            channel_count IS NULL
            OR channel_count > 0
        ),

    bit_depth INTEGER
        CHECK (
            bit_depth IS NULL
            OR bit_depth > 0
        ),

    codec TEXT,
    container TEXT,

    availability TEXT NOT NULL
        CHECK (availability IN (
            'available',
            'missing',
            'inaccessible',
            'unsupported',
            'corrupt'
        )),

    diagnostic_code TEXT,

    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
);

CREATE INDEX idx_tracks_content_hash
    ON tracks(content_hash);

CREATE INDEX idx_tracks_album
    ON tracks(album_id);

CREATE INDEX idx_tracks_title
    ON tracks(title COLLATE NOCASE, id);

CREATE INDEX idx_tracks_availability
    ON tracks(availability);

CREATE INDEX idx_tracks_updated
    ON tracks(updated_at_ms DESC, id);

CREATE TABLE source_tracks (
    source_id TEXT NOT NULL
        REFERENCES library_sources(id)
        ON DELETE CASCADE,

    track_id TEXT NOT NULL
        REFERENCES tracks(id)
        ON DELETE CASCADE,

    last_seen_generation INTEGER NOT NULL
        CHECK (last_seen_generation >= 0),

    PRIMARY KEY (source_id, track_id)
);

CREATE INDEX idx_source_tracks_track
    ON source_tracks(track_id);

CREATE TABLE track_artists (
    track_id TEXT NOT NULL
        REFERENCES tracks(id)
        ON DELETE CASCADE,

    artist_id TEXT NOT NULL
        REFERENCES artists(id)
        ON DELETE CASCADE,

    credit_position INTEGER NOT NULL
        CHECK (credit_position >= 0),

    PRIMARY KEY (track_id, artist_id)
);

CREATE INDEX idx_track_artists_artist
    ON track_artists(artist_id);

CREATE TABLE analysis_runs (
    id TEXT PRIMARY KEY NOT NULL,

    cache_key TEXT NOT NULL UNIQUE
        CHECK (length(cache_key) = 64),

    content_hash TEXT NOT NULL
        CHECK (length(content_hash) = 64),

    engine_version TEXT NOT NULL,
    feature_schema_version TEXT NOT NULL,
    configuration_hash TEXT NOT NULL,
    configuration_json TEXT NOT NULL,

    status TEXT NOT NULL
        CHECK (status IN (
            'complete',
            'partial',
            'failed'
        )),

    diagnostic_code TEXT,
    completed_at_ms INTEGER NOT NULL
);

CREATE INDEX idx_analysis_runs_content
    ON analysis_runs(content_hash);

CREATE TABLE track_analysis (
    track_id TEXT PRIMARY KEY NOT NULL
        REFERENCES tracks(id)
        ON DELETE CASCADE,

    analysis_id TEXT NOT NULL
        REFERENCES analysis_runs(id)
        ON DELETE RESTRICT,

    content_revision INTEGER NOT NULL
        CHECK (content_revision >= 0),

    attached_at_ms INTEGER NOT NULL
);

CREATE INDEX idx_track_analysis_result
    ON track_analysis(analysis_id);

CREATE TABLE audio_features (
    analysis_id TEXT NOT NULL
        REFERENCES analysis_runs(id)
        ON DELETE CASCADE,

    feature_key TEXT NOT NULL,

    value_kind TEXT NOT NULL
        CHECK (value_kind IN (
            'scalar',
            'vector',
            'none'
        )),

    scalar_value REAL,
    vector_json TEXT,
    unit TEXT,

    status TEXT NOT NULL
        CHECK (status IN (
            'valid',
            'unavailable',
            'failed'
        )),

    algorithm_version TEXT NOT NULL,

    confidence REAL
        CHECK (
            confidence IS NULL
            OR (
                confidence >= 0
                AND confidence <= 1
            )
        ),

    diagnostic_code TEXT,

    PRIMARY KEY (analysis_id, feature_key),

    CHECK (
        (
            status = 'valid'
            AND (
                (
                    value_kind = 'scalar'
                    AND scalar_value IS NOT NULL
                    AND vector_json IS NULL
                )
                OR (
                    value_kind = 'vector'
                    AND scalar_value IS NULL
                    AND vector_json IS NOT NULL
                )
            )
        )
        OR (
            status IN ('unavailable', 'failed')
            AND value_kind = 'none'
            AND scalar_value IS NULL
            AND vector_json IS NULL
        )
    )
);

CREATE INDEX idx_features_scalar
    ON audio_features(feature_key, scalar_value)
    WHERE status = 'valid';

CREATE TABLE artifacts (
    id TEXT PRIMARY KEY NOT NULL,

    analysis_id TEXT NOT NULL
        REFERENCES analysis_runs(id)
        ON DELETE CASCADE,

    kind TEXT NOT NULL
        CHECK (kind IN ('waveform', 'spectrogram')),

    variant_key TEXT NOT NULL,
    relative_path TEXT NOT NULL UNIQUE,

    byte_size INTEGER NOT NULL
        CHECK (byte_size >= 0),

    checksum TEXT NOT NULL
        CHECK (length(checksum) = 64),

    format_version INTEGER NOT NULL
        CHECK (format_version > 0),

    metadata_json TEXT NOT NULL,

    created_at_ms INTEGER NOT NULL,
    last_accessed_at_ms INTEGER NOT NULL,

    UNIQUE (
        analysis_id,
        kind,
        variant_key
    )
);

CREATE TABLE artwork_assets (
    id TEXT PRIMARY KEY NOT NULL,

    content_hash TEXT NOT NULL
        CHECK (length(content_hash) = 64),

    variant_key TEXT NOT NULL,
    relative_path TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,

    width INTEGER NOT NULL
        CHECK (width > 0),

    height INTEGER NOT NULL
        CHECK (height > 0),

    byte_size INTEGER NOT NULL
        CHECK (byte_size >= 0),

    created_at_ms INTEGER NOT NULL,

    UNIQUE (content_hash, variant_key)
);

CREATE TABLE track_artwork (
    track_id TEXT NOT NULL
        REFERENCES tracks(id)
        ON DELETE CASCADE,

    artwork_id TEXT NOT NULL
        REFERENCES artwork_assets(id)
        ON DELETE CASCADE,

    PRIMARY KEY (track_id, artwork_id)
);

CREATE TABLE analysis_jobs (
    id TEXT PRIMARY KEY NOT NULL,

    track_id TEXT NOT NULL
        REFERENCES tracks(id)
        ON DELETE CASCADE,

    analysis_id TEXT
        REFERENCES analysis_runs(id)
        ON DELETE SET NULL,

    request_key TEXT NOT NULL,

    expected_content_revision INTEGER NOT NULL
        CHECK (expected_content_revision >= 0),

    configuration_hash TEXT NOT NULL,

    status TEXT NOT NULL
        CHECK (status IN (
            'queued',
            'running',
            'paused',
            'interrupted',
            'completed',
            'partial',
            'failed',
            'cancelled',
            'stale'
        )),

    priority INTEGER NOT NULL DEFAULT 0,

    attempt_count INTEGER NOT NULL DEFAULT 0
        CHECK (attempt_count >= 0),

    max_attempts INTEGER NOT NULL DEFAULT 3
        CHECK (max_attempts >= 1),

    progress REAL
        CHECK (
            progress IS NULL
            OR (
                progress >= 0
                AND progress <= 1
            )
        ),

    diagnostic_code TEXT,
    error_message TEXT,

    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL,
    started_at_ms INTEGER,
    finished_at_ms INTEGER,
    next_eligible_at_ms INTEGER
);

CREATE UNIQUE INDEX idx_active_analysis_request
    ON analysis_jobs(request_key)
    WHERE status IN (
        'queued',
        'running',
        'paused',
        'interrupted'
    );

CREATE INDEX idx_jobs_dispatch
    ON analysis_jobs(
        status,
        priority DESC,
        created_at_ms,
        id
    );

CREATE TABLE collections (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
);

CREATE TABLE collection_items (
    collection_id TEXT NOT NULL
        REFERENCES collections(id)
        ON DELETE CASCADE,

    track_id TEXT NOT NULL
        REFERENCES tracks(id)
        ON DELETE CASCADE,

    position INTEGER NOT NULL
        CHECK (position >= 0),

    added_at_ms INTEGER NOT NULL,

    PRIMARY KEY (collection_id, track_id),

    UNIQUE (collection_id, position)
);

CREATE TABLE atlas_snapshots (
    id TEXT PRIMARY KEY NOT NULL,

    feature_schema_version TEXT NOT NULL,
    algorithm_version TEXT NOT NULL,
    configuration_hash TEXT NOT NULL,
    input_digest TEXT NOT NULL,

    catalog_revision INTEGER NOT NULL,

    normalization_json TEXT NOT NULL,
    model_json TEXT NOT NULL,

    eligible_count INTEGER NOT NULL
        CHECK (eligible_count >= 0),

    excluded_count INTEGER NOT NULL
        CHECK (excluded_count >= 0),

    explained_variance_json TEXT,

    created_at_ms INTEGER NOT NULL
);

CREATE TABLE atlas_points (
    snapshot_id TEXT NOT NULL
        REFERENCES atlas_snapshots(id)
        ON DELETE CASCADE,

    track_id TEXT NOT NULL
        REFERENCES tracks(id)
        ON DELETE CASCADE,

    analysis_id TEXT NOT NULL
        REFERENCES analysis_runs(id)
        ON DELETE RESTRICT,

    x REAL NOT NULL,
    y REAL NOT NULL,

    PRIMARY KEY (snapshot_id, track_id)
);

CREATE INDEX idx_atlas_points_track
    ON atlas_points(track_id);

CREATE TABLE app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value_json TEXT NOT NULL,
    updated_at_ms INTEGER NOT NULL
);

CREATE TABLE catalog_state (
    singleton INTEGER PRIMARY KEY
        CHECK (singleton = 1),

    catalog_revision INTEGER NOT NULL DEFAULT 0,
    analysis_revision INTEGER NOT NULL DEFAULT 0
);

INSERT INTO catalog_state (
    singleton,
    catalog_revision,
    analysis_revision
)
VALUES (1, 0, 0);

CREATE VIRTUAL TABLE tracks_fts USING fts5(
    track_id UNINDEXED,
    title,
    artist,
    album,
    genre,
    tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TRIGGER tracks_fts_insert
AFTER INSERT ON tracks
BEGIN
    INSERT INTO tracks_fts (
        track_id,
        title,
        artist,
        album,
        genre
    )
    VALUES (
        NEW.id,
        NEW.title,
        COALESCE(NEW.artist_display, ''),
        COALESCE(NEW.album_display, ''),
        COALESCE(NEW.genre, '')
    );
END;

CREATE TRIGGER tracks_fts_delete
AFTER DELETE ON tracks
BEGIN
    DELETE FROM tracks_fts
    WHERE track_id = OLD.id;
END;

CREATE TRIGGER tracks_fts_update
AFTER UPDATE OF
    title,
    artist_display,
    album_display,
    genre
ON tracks
BEGIN
    DELETE FROM tracks_fts
    WHERE track_id = OLD.id;

    INSERT INTO tracks_fts (
        track_id,
        title,
        artist,
        album,
        genre
    )
    VALUES (
        NEW.id,
        NEW.title,
        COALESCE(NEW.artist_display, ''),
        COALESCE(NEW.album_display, ''),
        COALESCE(NEW.genre, '')
    );
END;
```

### 16.1 Schema implementation notes

Several invariants require application-level validation in addition to SQL constraints:

- JSON payloads must conform to their versioned schemas.
- All numerical feature values and projection coordinates must be finite.
- UUID and digest representations must be canonical.
- Collection names must pass length and content validation.
- A current track-analysis association must match the track's content revision before being considered fresh.
- Artifact paths must be generated internally and remain within the managed artifact root.
- The active Atlas must reference a compatible snapshot with surviving members.
- The catalog and analysis revisions must be incremented transactionally by repository operations.
- Job transitions must be validated by the runtime state machine.

The initial migration intentionally does not include journal entries, listening history, AI interpretations or future Studio data.

## 17. Migration strategy

Migrations use monotonically increasing versions:

```text
crates/sonic-catalog/migrations/
├── 0001_initial_schema.sql
├── 0002_example_future_change.sql
└── ...
```

Only the initial migration is needed at project initialization. The second filename illustrates future ordering.

Migration requirements:

| ID | Requirement |
|---|---|
| DB-001 | Applied migrations are recorded with version and checksum. |
| DB-002 | Historical migrations are never silently edited after release. |
| DB-003 | Schema upgrades run before normal application services start. |
| DB-004 | Failed migrations prevent normal writes. |
| DB-005 | A newer unsupported database schema must not be downgraded automatically. |
| DB-006 | Destructive migrations require a verified backup. |
| DB-007 | Migration tests cover supported previous schema versions. |

Use SQLite's supported backup facilities for consistent database backups. Copying only the main database file while WAL activity is present is not a valid general-purpose backup strategy.

## 18. Catalog search

The initial search implementation uses FTS5 over title, artist, album and genre.

### Search behavior

- Search is case-insensitive according to the configured tokenizer.
- Diacritics are normalized through the selected FTS tokenizer.
- User input is converted into a controlled query representation.
- Raw user input is not exposed directly as unrestricted FTS query syntax.
- Prefix matching is supported for nonempty search tokens.
- An empty query returns ordinary filtered catalog results.
- Sorting uses an explicit whitelist of supported fields.
- Sorting includes a stable track identifier as a deterministic tie-breaker.

### Query limitations

| Parameter | Limit |
|---|---|
| Search string | 256 Unicode scalar values |
| Default page size | 100 tracks |
| Maximum page size | 250 tracks |
| Collection mutation batch | 1,000 track identifiers |
| Neighbor result limit | 50 tracks |

Offset pagination is acceptable for the initial 10,000-track capacity target.

If measured performance deteriorates with larger libraries, keyset pagination can be introduced without changing the product behavior.

# Part VI — Media ingestion and source reconciliation

## 19. Ingestion architecture

The scanner should publish metadata incrementally rather than block initial Library access until every file has been hashed and decoded.

### Source authorization

The frontend requests a native picker operation.

The runtime registers only the files or directories selected through that operation.

The frontend must not supply arbitrary paths to a generic `read_file`, `open_path` or `scan_path` IPC command.

Existing registered sources may be accessed through their `SourceId`.

### Scan policy

For the core release:

- Directory traversal is recursive.
- Symbolic links and junction directories are not followed by default.
- Hidden files and directories are not excluded merely because they are hidden.
- Unsupported candidates are skipped or represented with appropriate diagnostics.
- Traversal is bounded and cancellable.
- Scan results are committed in small batches.
- Temporary access failures are distinguishable from confirmed deletion.

### Initial scan limits

| Resource | Baseline |
|---|---|
| Concurrent directory scans | 1 |
| Metadata processing concurrency | Up to 2 |
| Catalog write batch | 100 entries |
| Scan progress publication | At most 4 updates per second |
| Maximum directory nesting | 128 levels |
| Scan diagnostic display | Bounded summary plus paginated details |

These limits are provisional engineering defaults. The reference workload must validate them.

## 20. File identity and duplicate handling

Three distinct identities exist.

| Identity | Meaning |
|---|---|
| Track ID | Stable application catalog entry |
| Path identity | A normalized platform-specific filesystem location |
| Content digest | Hash of the complete source file contents |

### 20.1 Content identity

Use BLAKE3 over the complete source-file byte sequence.

Do not hash only the filename, file size, modification timestamp or first portion of a file and represent the result as full content identity.

A fast metadata check may classify a file as probably unchanged. The digest is the definitive identity whenever analysis is newly produced, explicitly verified or invalidated.

Because the initial digest includes tags and container bytes, modifying metadata may invalidate cached analysis even if the decoded audio is unchanged.

That conservative behavior is intentional for P0. Audio-stream-only fingerprinting is a possible later optimization.

### 20.2 Duplicate files

If two different paths contain byte-identical files:

- Each path retains its own track identity.
- Both tracks may share one analysis record.
- Each track remains independently selectable in the Library.
- No source file is deleted.
- Duplicate artwork assets may be shared.

Atlas points may overlap for identical feature vectors. The interface must handle coincident points through selection lists or equivalent inspection behavior rather than artificially jittering data coordinates.

### 20.3 Renamed or moved files

A catalog track may preserve its identity when a rename or move can be reconciled unambiguously using a reliable platform filesystem identifier or verified content identity.

If several candidates match, do not guess. Preserve the missing entry and register the newly discovered file independently.

Windows filesystem identity handling requires a native compatibility test, particularly across volumes, removable media and network-mounted directories.

### 20.4 Source overlap

Importing a directory already covered by an existing source may establish an additional source relationship.

The canonical path identity prevents a second physical-file catalog entry from being created merely because the same file was discovered through two source roots.

## 21. Scan generation reconciliation

Each source scan receives a monotonically increasing generation.

When a track is discovered, its corresponding `source_tracks.last_seen_generation` is updated.

A successful complete scan allows the runtime to reconcile entries not seen in that generation.

An interrupted, partial or failed scan must not automatically mark every unseen file as missing.

A missing external drive must be treated as an unavailable source, not as an instruction to remove thousands of catalog entries.

## 22. Metadata normalization

Metadata extraction and presentation normalization are separate operations.

| Field | Missing-value behavior |
|---|---|
| Title | Use filename stem |
| Artist | Display `Unknown artist` |
| Album | Display `Unknown album` |
| Genre | Preserve unavailable state |
| Release year | Preserve unavailable state |
| Artwork | Render PDS-defined fallback |
| Duration | Preserve unavailable state until reliable detection |
| Bit depth | Show only when meaningful and available |

Fallback display labels should not become fabricated factual metadata.

Album and artist grouping keys are normalized internal identifiers. Case folding and whitespace normalization may be used, but spelling similarity alone must not merge distinct entities.

All textual metadata is treated as untrusted content.

# Part VII — Audio analysis architecture

## 23. Analysis engine boundary

The computational engine consumes an authorized, readable media input and produces typed analysis output.

It does not know:

- Which screen requested analysis.
- Which database stores the result.
- Whether the application is displaying a progress drawer.
- How a result will be visualized.
- Which operating-system-specific window initiated the request.

### Engine input contract

```rust
use std::io::{Read, Seek};
use std::sync::atomic::AtomicBool;

pub trait ReadSeek: Read + Seek + Send {}

impl<T> ReadSeek for T
where
    T: Read + Seek + Send,
{}

pub struct AnalysisInput {
    pub media: Box<dyn ReadSeek>,
    pub content_digest: ContentDigest,
    pub configuration: AnalysisConfig,
}

pub struct AnalysisContext<'a> {
    pub cancelled: &'a AtomicBool,
    pub progress: &'a dyn ProgressSink,
    pub artifacts: &'a mut dyn ArtifactSink,
}
```

The engine receives an already-authorized native input.

Media decoders must not be given an unrestricted application filesystem abstraction.

### Engine interface

```rust
pub trait AudioAnalysisEngine: Send + Sync {
    fn analyze(
        &self,
        input: AnalysisInput,
        context: AnalysisContext<'_>,
    ) -> Result<AnalysisOutput, AnalysisError>;
}
```

### Engine output

```rust
pub struct AnalysisOutput {
    pub content_digest: ContentDigest,
    pub engine_version: String,
    pub feature_schema_version: String,
    pub configuration_hash: String,
    pub technical_properties: TechnicalProperties,
    pub features: Vec<AudioFeature>,
    pub artifacts: Vec<GeneratedArtifact>,
    pub status: AnalysisStatus,
}
```

The runtime handles durable persistence, cancellation outcome, cache association and current-track reconciliation.

## 24. Analysis configuration

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisConfig {
    pub spectral_sample_rate_hz: u32,
    pub fft_size: u32,
    pub hop_size: u32,
    pub rolloff_fraction: f64,
    pub mfcc_count: u32,
    pub enable_tempo: bool,
    pub enable_loudness: bool,
    pub waveform_base_bucket_ms: u32,
}
```

Proposed initial configuration:

```json
{
  "spectralSampleRateHz": 22050,
  "fftSize": 2048,
  "hopSize": 512,
  "rolloffFraction": 0.85,
  "mfccCount": 13,
  "enableTempo": true,
  "enableLoudness": true,
  "waveformBaseBucketMs": 10
}
```

This configuration is internal during the core release.

The Settings screen may expose analysis workload preferences, but users do not need arbitrary FFT-window configuration controls in P0.

The Audio Analysis Technical Specification will finalize analyzer-specific parameters, valid ranges, aggregation rules and numerical tolerances.

## 25. Streaming analysis pipeline

### Execution requirements

1. Decode sequential blocks of PCM.
2. Reuse scratch buffers and FFT plans.
3. Share intermediate spectral computations between compatible analyzers.
4. Keep standards-based loudness processing separate from inappropriate downmixed spectral processing.
5. Aggregate scalar statistics incrementally.
6. Write large visualization data to bounded artifact builders.
7. Check cancellation at documented processing boundaries.
8. Release native and filesystem resources deterministically.

Do not decode an entire track into a `Vec<f32>` solely for implementation convenience.

### Analyzer lifecycle

```rust
pub trait StreamingAnalyzer {
    fn begin(
        &mut self,
        properties: &TechnicalProperties,
    ) -> Result<(), AnalysisError>;

    fn process(
        &mut self,
        block: &AudioBlock<'_>,
    ) -> Result<(), AnalysisError>;

    fn finish(
        self: Box<Self>,
    ) -> Result<Vec<AudioFeature>, AnalysisError>;
}
```

Not every analyzer needs dynamic dispatch. The pipeline may use concrete composition where that is simpler and more efficient.

The lifecycle exists to establish bounded streaming behavior, not to force every DSP operation behind a trait object.

## 26. Numerical validity

The engine must reject or explicitly represent:

- NaN.
- Unbounded positive or negative infinity.
- Division by zero.
- Invalid sample rates or channel configurations.
- Insufficient duration for a particular estimator.
- Empty analysis windows.
- Invalid feature-vector dimensions.
- Failed analyzer outputs.

Some mathematical measurements, such as logarithmic silence levels, naturally produce negative infinity in an idealized formulation.

The technical specification must define their correct semantic representation. The frontend must not receive non-finite JSON numbers or substitute misleading arbitrary values.

### Partial analysis semantics

| Condition | Analysis outcome |
|---|---|
| All required analyzers succeed | Complete |
| Independent analyzers fail but useful results survive | Partial |
| Source cannot be decoded sufficiently | Failed |
| Optional estimator is legitimately unavailable | Complete or partial according to feature registry policy |
| User cancellation | Cancelled job, no successful final result commit |
| Source changes during execution | Stale job, output rejected as current |

A valid unavailable tempo estimate is not automatically an application error.

## 27. Cache identity

A valid analysis cache key incorporates:

```text
cache-key-format-version
content-digest
analysis-engine-version
feature-schema-version
canonical-analysis-configuration
```

The serialization must use unambiguous field boundaries.

Do not build cache keys using naïve concatenation of variable-length strings.

Illustrative Rust implementation:

```rust
pub fn compute_cache_key(
    content_digest: &[u8; 32],
    engine_version: &str,
    schema_version: &str,
    canonical_config: &[u8],
) -> [u8; 32] {
    let mut hasher = blake3::Hasher::new();

    hasher.update(b"sonicmirror.analysis.cache.v1");

    hash_field(&mut hasher, content_digest);
    hash_field(&mut hasher, engine_version.as_bytes());
    hash_field(&mut hasher, schema_version.as_bytes());
    hash_field(&mut hasher, canonical_config);

    *hasher.finalize().as_bytes()
}

fn hash_field(
    hasher: &mut blake3::Hasher,
    value: &[u8],
) {
    hasher.update(&(value.len() as u64).to_le_bytes());
    hasher.update(value);
}
```

Canonical configuration encoding must have fixed field ordering and stable numerical representation.

Use a typed, versioned canonical representation rather than hashing arbitrary user-generated JSON objects.

### Version separation

| Version | Responsibility |
|---|---|
| Application version | Overall release |
| Database schema version | Catalog structure |
| Analysis engine version | Computational behavior |
| Feature schema version | Feature keys, units and shapes |
| Analyzer version | Individual measurement implementation |
| Artifact format version | Binary visualization format |
| Projection algorithm version | Similarity and Atlas computation |
| IPC protocol version | Native/frontend contract |

An application UI bug fix should not invalidate every audio-analysis result.

An algorithm change that affects feature values must invalidate affected analysis identities.

## 28. Concurrent source modification

An analysis must not attach results for an obsolete file version.

The required process is:

Capture native identity and metadata before processing and validate them after processing.

For strong content verification, the implementation must ensure the digest corresponds to the bytes actually analyzed. The compatibility spike must select a strategy using a stable file handle, controlled spooling or equivalent verification.

On ordinary supported filesystems, a before-and-after digest check is a practical conservative approach, but it is not a guarantee against every concurrent mutation scenario. The application should use appropriate Windows file-sharing semantics where feasible and report a stale-input result when stability cannot be established.

Immediately before attaching a result, the database transaction verifies the expected content revision.

An old result may remain stored for historical snapshot consistency, but it must not be labeled as current.

# Part VIII — Background execution and concurrency

## 29. Execution domains

SonicMirror separates asynchronous orchestration, CPU-bound computation, database operations and real-time audio work.

| Execution domain | Permitted operations |
|---|---|
| Frontend main thread | Rendering, interaction and lightweight presentation transformations |
| Tokio runtime | Command coordination, timers, channels and async waits |
| Scan executor | Filesystem traversal and blocking metadata access |
| Rayon pool | Hashing, decoding, DSP, similarity and projection computations |
| Catalog writer | Serialized SQLite mutations |
| Catalog readers | Bounded SQLite queries |
| Playback actor/backend | Native stream ownership and audio control |

Avoid performing CPU-intensive FFT calculations or synchronous SQLite operations directly within an async Tauri command handler.

### 29.1 Default execution budgets

Let NNN be the logical processor count reported by the operating system.

Proposed defaults:

W=min⁡(4,max⁡(1,N−2))W=\min(4,\max(1,N-2))W=min(4,max(1,N−2))Where WWW is the maximum number of active analysis workers.

| Budget | Default |
|---|---|
| Active analysis workers | 1–4 |
| Configurable analysis-worker maximum | 8, subject to available hardware |
| Concurrent source scans | 1 |
| Concurrent projection generations | 1 |
| SQLite writer threads | 1 |
| SQLite reader connections | 2 |
| Pending write requests | 128 |
| Pending runtime event messages | 512 |
| Job dispatch batch | 32 |

These are implementation defaults, not performance measurements.

The coordinator must apply a shared compute budget to analysis and projection generation. A projection should not silently introduce an additional unbounded CPU pool.

## 30. Job state machine

### State semantics

| State | Meaning |
|---|---|
| `queued` | Durable request awaiting execution |
| `running` | Worker currently owns the request |
| `paused` | Dispatch suspended or active work stopped cooperatively |
| `interrupted` | Previous execution ended without a terminal commit |
| `completed` | Valid complete analysis committed |
| `partial` | Useful but incomplete analysis committed |
| `failed` | Execution ended without sufficient valid output |
| `cancelled` | User or runtime explicitly cancelled execution |
| `stale` | Request references an obsolete source revision or configuration |

Transition validation belongs in `jobs::coordinator` and must be tested independently.

Terminal transitions must be persisted before their corresponding completion events are published.

## 31. Job dispatch

### Scheduling priorities

| Priority class | Value | Purpose |
|---|---|---|
| Interactive | 100 | User explicitly requests an analysis |
| Standard | 0 | Ordinary imported-track analysis |
| Maintenance | −100 | Background regeneration and stale-cache work |

Dispatch ordering uses priority, creation time and stable job ID.

Interactive requests may jump ahead of queued work. They must not forcibly terminate an unrelated running track merely to improve perceived priority.

An anti-starvation policy should ensure that continued interactive requests do not indefinitely prevent ordinary work.

### Deduplication

Two levels of deduplication are required.

**Request-level deduplication:** prevent multiple active jobs for the same track revision and analysis configuration.

**Content-level deduplication:** once content identity is known, avoid concurrently analyzing byte-identical content with an equivalent configuration.

Content-level in-flight coordination may use a runtime map:

```rust
HashMap<AnalysisCacheKey, InFlightAnalysis>
```

An equivalent request can attach as a dependent consumer of an existing computation.

Cancelling one dependent request must not cancel shared computation while other active requests still require it.

If that consumer-management mechanism is too complex for the first vertical slice, the runtime may serialize equivalent cache-key work through a keyed lock and recheck the cache after obtaining ownership.

The first approach is more capable. The second is an acceptable simpler P0 baseline.

## 32. Job execution sequence

## 33. Cancellation and pause

Use cooperative cancellation rather than forcibly terminating Rust worker threads.

A cancellation token must be checked:

- Between decoded audio blocks.
- During sufficiently long hashing operations.
- Between artifact-writing batches.
- Between similarity or projection computation stages where practical.

### Pause policy

For P0, pause means:

1. Stop dispatching new jobs.
2. Request active workers to stop at safe processing boundaries.
3. Persist their jobs as paused.
4. Retain completed tracks.
5. Restart paused individual tracks from their beginning when resumed.

Persisting every intermediate FFT window is unnecessary.

### Cancellation acknowledgment

The UI distinguishes between:

```text
Running
Cancelling…
Cancelled
```

`Cancelling…` is a transient presentation state while the durable job may still be `running`.

The application must not show a terminal cancellation state before the runtime confirms that execution or result attachment has been stopped.

## 34. Retry policy

| Failure class | Automatic retry |
|---|---|
| Unsupported media format | No |
| Corrupt media | No |
| Temporarily inaccessible file | Limited, with backoff |
| Transient database contention | Limited |
| Unavailable source volume | Wait for reconciliation or user action |
| Insufficient disk space | No immediate retry loop |
| Unavailable optional feature | No whole-track retry |
| Source revision changed | Reconcile and schedule current revision |
| Runtime interruption | Recover on application restart |

Use bounded exponential backoff for genuinely transient failures.

Proposed maximum automatic attempts: three.

A user-initiated retry may establish a new attempt budget after resolving the underlying issue.

Do not retry a known unsupported codec indefinitely.

## 35. Recovery after abnormal termination

At startup:

1. Locate persisted `running` jobs.
2. Transition them to `interrupted`.
3. Reconcile their source revisions and configuration.
4. Requeue eligible interrupted work.
5. Mark obsolete requests stale.
6. Preserve valid completed results.
7. Remove abandoned temporary artifacts.
8. Refresh aggregate job counters.

Recovery must respect the user's previously persisted paused-queue preference.

An application restart must not silently resume a globally paused workload.

# Part IX — Artifact storage and visualization data

## 36. Artifact storage model

Large visualization payloads should not be stored as unrestricted database blobs or transported as enormous nested JSON arrays.

The catalog stores artifact references and metadata. The artifact store owns binary files.

### Artifact categories

| Artifact | Storage |
|---|---|
| Scalar acoustic measurements | SQLite |
| Small feature vectors | SQLite JSON |
| Waveform envelopes | Binary managed artifact |
| Spectrogram tiles | Binary managed artifact |
| Album artwork | Bounded encoded image |
| Atlas coordinates | SQLite |
| PCA model and normalization data | Versioned structured catalog data |

### Managed path construction

Artifacts are addressed by internally generated identifiers.

Example:

```text
artifacts/
├── waveform/
│   └── 7f/
│       └── <analysis-key>/
│           └── level-0.smw
├── spectrogram/
│   └── 7f/
│       └── <analysis-key>/
│           └── tile-000000.smg
└── artwork/
    └── c1/
        └── <content-key>-256.webp
```

The frontend must never construct native artifact paths.

## 37. Waveform artifact contract

The waveform is a multiresolution envelope of actual PCM sample extrema.

### Logical representation

```ts
interface WaveformMetadata {
  formatVersion: number;
  durationMs: number;
  channelPolicy: "combined" | "channel-specific";
  baseBucketDurationMs: number;
  levels: WaveformLevelMetadata[];
}

interface WaveformLevelMetadata {
  level: number;
  bucketDurationMs: number;
  bucketCount: number;
}
```

Each bucket stores minimum and maximum normalized sample amplitudes.

```rust
#[repr(C)]
pub struct WaveformBucket {
    pub minimum: f32,
    pub maximum: f32,
}
```

The serialized format must explicitly encode little-endian floating-point values. Do not write raw Rust structure memory directly to disk because that can introduce layout and compatibility assumptions.

### Multiresolution policy

The initial base bucket width is provisionally 10 ms.

Each higher level combines adjacent buckets:

mk=min⁡(m2k,m2k+1)m_k = \min(m_{2k},m_{2k+1})mk​=min(m2k​,m2k+1​)Mk=max⁡(M2k,M2k+1)M_k = \max(M_{2k},M_{2k+1})Mk​=max(M2k​,M2k+1​)Where mkm_kmk​ and MkM_kMk​ are minimum and maximum values at the next level.

The final partial bucket must be retained.

### Viewport retrieval

The frontend requests a time range and target display resolution.

```ts
interface WaveformRequest {
  trackId: TrackId;
  startMs: number;
  endMs: number;
  targetBuckets: number;
}
```

The runtime validates the range and selects an appropriate cached envelope level.

It returns at most the configured maximum bucket count.

The frontend must not invent interpolated peaks that were not present in the returned envelope.

## 38. Spectrogram artifact contract

The spectrogram represents a versioned time-frequency intensity matrix.

### Metadata

```ts
interface SpectrogramMetadata {
  formatVersion: number;
  durationMs: number;
  sampleRateHz: number;
  fftSize: number;
  hopSize: number;
  frequencyBinCount: number;
  frameCount: number;
  minFrequencyHz: number;
  maxFrequencyHz: number;
  intensityReference: string;
  displayFloorDb: number;
  displayCeilingDb: number;
  framesPerTile: number;
}
```

### Storage policy

Proposed representation:

- Divide time into bounded tiles.
- Store intensity values in a versioned binary representation.
- Quantize display artifacts to unsigned 8-bit values when sufficient.
- Preserve analytical feature computation at its required precision.
- Keep visualization color mapping separate from stored intensity values.
- Include enough metadata to reconstruct accurate time and frequency axes.

The intensity floor, ceiling and decibel reference must be established by the Audio Analysis Technical Specification.

Quantization is a visualization-storage decision. It must not silently change the numerical feature calculations.

### Tile retrieval

```ts
interface SpectrogramTileRequest {
  trackId: TrackId;
  level: number;
  firstTile: number;
  tileCount: number;
}
```

The runtime returns only authorized artifact tiles belonging to the relevant analysis.

### Data transport

For large binary data, use a narrowly scoped Tauri binary-response mechanism or another explicitly validated application-local transport.

Do not transmit complete spectrograms as unbounded JSON matrices or base64-encoded payloads by default.

Binary responses must contain a documented versioned header and validated payload length.

The frontend should decode them into typed arrays and render through Canvas.

The exact Tauri binary transport adapter requires an early WebView2 compatibility spike.

## 39. Artifact commit protocol

The filesystem and SQLite do not share one atomic transaction. The runtime must explicitly handle this boundary.

### Commit requirements

- Temporary files must reside on the same filesystem as their intended destination where atomic publication is required.
- Final artifact paths are immutable once published.
- A failed database transaction may leave an unreferenced artifact.
- Such orphaned artifacts are safe and recoverable.
- A database row must not reference an artifact that has not been successfully published.
- Existing valid artifacts must not be destroyed before a replacement is available.
- Windows file replacement and sharing semantics must be tested explicitly.

Startup maintenance can reconcile orphaned files and missing references.

## 40. Cache management

| Policy | Baseline |
|---|---|
| Default visualization-cache budget | 2 GiB |
| User-configurable budget | 256 MiB–20 GiB |
| Eviction preference | Least recently accessed regenerable artifacts |
| Pinned artifacts | Currently accessed artifacts |
| Scalar feature data | Not subject to visualization-cache eviction |
| User collections | Never evicted |
| Temporary files | Clean up after interrupted work |

Cache budget enforcement must account for active writes and temporary files.

If the budget is exceeded:

1. Reclaim eligible unreferenced or unused artifacts.
2. Preserve currently active artifact readers.
3. Prevent unbounded new allocations.
4. Report unavailable visualization data if regeneration cannot fit.

An evicted spectrogram must not cause already validated scalar audio measurements to become invalid.

Visualization readiness and analysis validity remain separate states.

# Part X — Similarity and Atlas architecture

## 41. Feature registry and vector construction

The similarity engine uses explicitly versioned acoustic feature definitions.

```rust
pub struct FeatureDefinition {
    pub key: &'static str,
    pub unit: Option<&'static str>,
    pub value_shape: FeatureShape,
    pub algorithm_version: &'static str,
    pub similarity_group: Option<&'static str>,
    pub required_for_similarity: bool,
}

pub enum FeatureShape {
    Scalar,
    Vector { dimensions: usize },
}
```

The feature registry is the authoritative mapping between analysis output, persistence, similarity computation and presentation metadata.

The frontend must not independently decide that a particular measurement represents happiness, danceability, mood or another unsupported interpretation.

### Vector construction rules

- Include only approved acoustic descriptors.
- Exclude artist, album, genre and other descriptive metadata.
- Exclude invalid or incompatible feature values.
- Maintain deterministic dimension ordering.
- Persist the feature-schema version.
- Apply documented group weighting.
- Reject vectors with incompatible dimensions.

The exact feature set and weights will be established in the technical audio specification after validating candidate descriptors.

## 42. Normalization and distance model

```rust
pub struct NormalizationModel {
    pub feature_schema_version: String,
    pub feature_keys: Vec<String>,
    pub centers: Vec<f64>,
    pub scales: Vec<f64>,
    pub weights: Vec<f64>,
    pub active_dimensions: Vec<usize>,
}

pub struct NormalizedTrackVector {
    pub track_id: TrackId,
    pub analysis_id: AnalysisId,
    pub values: Vec<f64>,
}
```

Normalization operates on the eligible collection snapshot.

The baseline uses the median and interquartile range.

zj=xj−median⁡(xj)IQR⁡(xj)z_j=\frac{x_j-\operatorname{median}(x_j)}
{\operatorname{IQR}(x_j)}zj​=IQR(xj​)xj​−median(xj​)​Dimensions with insufficient dispersion must be handled through a documented deterministic policy.

The baseline distance is:

d(a,b)=∑j=1mwj(aj−bj)2d(a,b)=\sqrt{\sum_{j=1}^{m}w_j(a_j-b_j)^2}d(a,b)=j=1∑m​wj​(aj​−bj​)2​Feature weights must be finite, nonnegative and normalized according to the approved group-weighting policy.

### Contribution decomposition

For a comparison between two tracks, the squared distance contribution of feature jjj is:

cj=wj(aj−bj)2c_j=w_j(a_j-b_j)^2cj​=wj​(aj​−bj​)2Group contributions are sums of the constituent feature contributions.

The UI may explain which groups account for the largest portion of the computed distance. It must not represent that decomposition as causal proof of subjective musical similarity.

When total distance is zero, normalized contribution percentages are undefined and must not be fabricated.

## 43. Projection generation

The initial Atlas uses PCA.

### Weighted projection policy

If the weighted Euclidean metric is the chosen original-space representation, the PCA input should use the corresponding transformed coordinates:

yj=wjzjy_j=\sqrt{w_j}z_jyj​=wj​​zj​This keeps the projection aligned with the same feature weighting used by similarity search, while still acknowledging that a two-dimensional projection is lossy.

### Projection eligibility

A usable projection requires:

- At least three eligible track vectors.
- Compatible feature schemas.
- Finite normalized values.
- Sufficient variance for the retained dimensions.

A rank-one feature matrix may produce a documented one-dimensional arrangement with a fixed second coordinate.

A rank-zero collection must return an explanatory unavailable state rather than fabricate a visually interesting point cloud.

### Determinism

Canonicalize PCA component signs using a documented rule, such as making the loading with greatest absolute magnitude positive with deterministic tie-breaking.

This resolves ordinary sign ambiguity. Near-equal eigenvalues may still permit different valid component bases between numerical implementations.

The application therefore persists generated coordinates. It must not claim that independently recomputing PCA across all hardware and dependency versions will always produce bit-identical layouts.

## 44. Atlas snapshot model

An Atlas snapshot contains:

```rust
pub struct AtlasSnapshot {
    pub id: AtlasSnapshotId,
    pub catalog_revision: u64,
    pub input_digest: String,
    pub feature_schema_version: String,
    pub algorithm_version: String,
    pub normalization: NormalizationModel,
    pub model: ProjectionModel,
    pub points: Vec<ProjectionPoint>,
    pub excluded_count: u32,
    pub created_at_ms: i64,
}

pub struct ProjectionPoint {
    pub track_id: TrackId,
    pub analysis_id: AnalysisId,
    pub x: f64,
    pub y: f64,
}
```

The snapshot establishes both coordinates and the analysis inputs used to produce them.

### Snapshot consistency

A saved snapshot must not change coordinates when:

- A filter is applied.
- A user pans or zooms.
- A track is selected.
- New analysis results become available.

New results cause the snapshot to become stale relative to the current eligible library state.

The user explicitly regenerates the Atlas.

If a track is deleted from the catalog, its point may disappear, but surviving points retain their coordinates. The snapshot is marked stale.

### Projection concurrency

The runtime captures the input set and associated catalog revision before expensive PCA computation.

It computes the projection outside a database transaction.

Before committing, it verifies that the referenced analysis records remain valid for the captured snapshot.

If the current collection has changed, the projection may still be saved as a valid historical snapshot but must be identified as stale. It must not be represented as a projection of a newer library state.

## 45. Nearest-neighbor retrieval

The core release uses exact linear search.

For a target vector:

1. Resolve the relevant normalization model.
2. Construct or load the normalized feature representation.
3. Calculate weighted distances against eligible candidates.
4. Exclude the target track.
5. Sort by distance and stable track ID.
6. Return the requested bounded number of neighbors.

For the 10,000-track design target, approximate indexing is not required until benchmarks demonstrate a need.

### Retrieval contexts

Two explicit contexts are supported.

| Context | Behavior |
|---|---|
| Atlas snapshot | Use the normalization and analysis inputs associated with that snapshot |
| Current library | Use a current compatible feature-space model |

A neighbor list calculated from an older snapshot must not silently be labeled as current-library similarity.

The Observatory should default to the current compatible model when available and clearly identify snapshot-based results when used.

### Memory cache

A normalized feature matrix may be cached in the runtime by model identity.

The cache must have a bounded size and explicit invalidation based on relevant analysis and catalog revisions.

A similarity query must not repeatedly load every waveform or spectrogram artifact.

## 46. Track comparison service

The runtime comparison service returns:

```ts
interface TrackComparisonDto {
  left: TrackSummaryDto;
  right: TrackSummaryDto;
  measurements: ComparisonMeasurementDto[];
  distance: number | null;
  contributions: FeatureContributionDto[];
  modelContext: SimilarityContextDto | null;
  limitations: string[];
}
```

```ts
interface ComparisonMeasurementDto {
  featureKey: string;
  unit: string | null;
  leftValue: number | null;
  rightValue: number | null;
  difference: number | null;
  leftStatus: FeatureStatus;
  rightStatus: FeatureStatus;
}
```

A numerical difference is computed only when both values are valid, scalar and semantically compatible.

Different feature-schema versions may expose individual raw measurements for inspection, but the application must not automatically calculate a shared acoustic distance from incompatible representations.

# Part XI — Native audio playback

## 47. Playback ownership

Playback is managed by a dedicated native actor.

The actor owns the audio output stream, current media decoder or playback source, transport state and active queue.

React does not own the playback clock.

### Playback states

```ts
type PlaybackStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "stopped"
  | "ended"
  | "error";
```

## 48. Playback command model

Use explicit typed commands rather than loosely defined strings.

```rust
pub enum PlaybackCommand {
    Load {
        track_id: TrackId,
        autoplay: bool,
    },
    Play,
    Pause,
    Toggle,
    Stop,
    Seek {
        position_ms: u64,
    },
    SetVolume {
        volume: f32,
    },
    Next,
    Previous,
    ReplaceQueue {
        tracks: Vec<TrackId>,
        start_index: usize,
        autoplay: bool,
    },
}
```

The runtime resolves the track identifier into an authorized source path.

The frontend cannot pass arbitrary playback URLs or native filesystem paths.

## 49. Playback state contract

```ts
interface PlaybackStateDto {
  sessionId: string;
  revision: number;
  status: PlaybackStatus;
  track: TrackSummaryDto | null;
  positionMs: number;
  durationMs: number | null;
  volume: number;
  queueLength: number;
  queueIndex: number | null;
  canSeek: boolean;
  canPrevious: boolean;
  canNext: boolean;
  error: ApplicationError | null;
}
```

### Position synchronization

The native playback actor publishes authoritative position updates at a bounded frequency, initially four updates per second.

The frontend may interpolate the displayed position between updates using a monotonic presentation clock.

Interpolation is permitted only when playback is actively progressing.

On pause, seek, track replacement, device failure or a new session revision, the frontend must immediately reconcile to the native state.

Waveform and playback-strip cursors derive from the same presentation playback state.

### Seeking

When supported by the selected backend:

- Clamp requested positions to the valid duration.
- Serialize seek operations through the playback actor.
- Coalesce rapidly repeated seek requests where appropriate.
- Report the actual accepted position.
- Indicate unsupported seeking through `canSeek`.

Do not assume every codec and container supports equivalent seeking behavior.

### Queue behavior

The queue is runtime state for the current application session.

It is distinct from persistent user collections.

The core release does not require persisting listening history or automatically resuming audio after application restart.

### Audio-device failures

If the Windows audio output device becomes unavailable, the actor transitions into an actionable error state.

Catalog access and analysis remain usable.

The core release must validate:

- Default output-device playback.
- Headphone disconnection.
- Output-device changes.
- Unsupported media.
- Seeking behavior.
- Analysis and playback occurring simultaneously.

Device selection and advanced audio-device configuration are not part of the initial product scope.

# Part XII — IPC architecture and contracts

## 50. IPC design principles

The native interface is a product-level API, not a direct mirror of internal Rust structures.

### Rules

- Rust DTO definitions are the contract source of truth.
- TypeScript bindings are generated from approved DTOs.
- All command names use `snake_case`.
- JSON field names use `camelCase`.
- Identifiers are serialized as UUID strings.
- Time durations and timestamps use explicit unit suffixes.
- Unknown or unavailable scalar measurements use `null`.
- Every state-changing command validates its input.
- Bulk operations impose explicit limits.
- Error codes remain stable across patch releases where feasible.

Do not return raw `rusqlite` records, native paths, decoder objects or internal Rust error chains directly to the frontend.

## 51. IPC contract version

```ts
interface ApplicationInfoDto {
  applicationVersion: string;
  ipcProtocolVersion: number;
  databaseSchemaVersion: number;
  analysisEngineVersion: string;
  featureSchemaVersion: string;
  platform: "windows" | "macos" | "linux";
}
```

The initial protocol version is `1`.

Although the frontend and native backend ship together, protocol versioning protects development builds, diagnostics and future migrations.

A frontend/native protocol mismatch produces a recoverable application error rather than undefined behavior.

## 52. Shared DTOs

The following TypeScript declarations define the intended generated contract.

Do not maintain a second handwritten production copy if the Rust binding generator can emit the authoritative type.

```ts
export type TrackId = string;
export type SourceId = string;
export type AlbumId = string;
export type ArtistId = string;
export type CollectionId = string;
export type JobId = string;
export type AnalysisId = string;
export type AtlasSnapshotId = string;

export type FileAvailability =
  | "available"
  | "missing"
  | "inaccessible"
  | "unsupported"
  | "corrupt";

export type FeatureStatus =
  | "valid"
  | "unavailable"
  | "failed";

export type AnalysisAvailability =
  | "notAnalyzed"
  | "complete"
  | "partial"
  | "failed"
  | "stale";

export type JobStatus =
  | "queued"
  | "running"
  | "paused"
  | "interrupted"
  | "completed"
  | "partial"
  | "failed"
  | "cancelled"
  | "stale";

export interface ApplicationError {
  code: string;
  message: string;
  recoverable: boolean;
  correlationId: string | null;
  details: Record<string, unknown> | null;
}

export interface ArtworkReferenceDto {
  assetId: string;
  width: number;
  height: number;
  mimeType: string;
}

export interface TrackSummaryDto {
  id: TrackId;
  title: string;
  artist: string | null;
  album: string | null;
  genre: string | null;
  releaseYear: number | null;
  durationMs: number | null;
  artwork: ArtworkReferenceDto | null;
  availability: FileAvailability;
  analysisAvailability: AnalysisAvailability;
}

export interface TrackDetailDto extends TrackSummaryDto {
  codec: string | null;
  container: string | null;
  sampleRateHz: number | null;
  channelCount: number | null;
  bitDepth: number | null;
  trackNumber: number | null;
  discNumber: number | null;
  sizeBytes: number;
  sourceIds: SourceId[];
  displayPath: string | null;
  currentAnalysisId: AnalysisId | null;
  activeJobId: JobId | null;
}

export interface AudioFeatureDto {
  key: string;
  value: number | number[] | null;
  unit: string | null;
  status: FeatureStatus;
  algorithmVersion: string;
  confidence: number | null;
  diagnosticCode: string | null;
}

export interface AnalysisSummaryDto {
  id: AnalysisId;
  availability: AnalysisAvailability;
  engineVersion: string;
  featureSchemaVersion: string;
  completedAtMs: number;
  features: AudioFeatureDto[];
  waveformAvailable: boolean;
  spectrogramAvailable: boolean;
}

export interface SourceDto {
  id: SourceId;
  kind: "directory" | "file" | "demo";
  displayPath: string;
  status: "available" | "missing" | "inaccessible";
  trackCount: number;
  lastScanAtMs: number | null;
}

export interface PageDto<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  revision: number;
}

export interface CommandAcceptedDto {
  operationId: string;
  acceptedAtMs: number;
}
```

### Integer serialization

JavaScript numbers cannot exactly represent every Rust `u64`.

For IPC, timestamps, byte counts, revisions and duration values must remain within JavaScript's safe integer range. The Rust adapter validates this before serialization.

Native 64-bit filesystem identities and other unrestricted integer fields remain native or are represented as strings.

Generated TypeScript bindings must not silently map arbitrary 64-bit identifiers into unsafe JavaScript numerical values.

## 53. Library queries

```ts
type TrackSortField =
  | "title"
  | "artist"
  | "album"
  | "duration"
  | "releaseYear"
  | "addedAt"
  | "analysisStatus"
  | "tempo"
  | "loudness"
  | "spectralCentroid"
  | "spectralFlatness";

interface TrackQueryDto {
  search: string;
  offset: number;
  limit: number;
  sortBy: TrackSortField;
  sortDirection: "asc" | "desc";

  albumId: AlbumId | null;
  artistId: ArtistId | null;
  collectionId: CollectionId | null;
  sourceId: SourceId | null;

  availability: FileAvailability[];
  analysisAvailability: AnalysisAvailability[];

  featureFilters: FeatureFilterDto[];
}

interface FeatureFilterDto {
  featureKey: string;
  minimum: number | null;
  maximum: number | null;
}
```

Only registered scalar feature keys may be used as numerical filters.

Missing values are excluded from numerical-range matches unless an explicit unavailable filter is active.

### Aggregate views

```ts
interface AlbumSummaryDto {
  id: AlbumId;
  title: string;
  albumArtist: string | null;
  releaseYear: number | null;
  trackCount: number;
  artwork: ArtworkReferenceDto | null;
}

interface ArtistSummaryDto {
  id: ArtistId;
  name: string;
  albumCount: number;
  trackCount: number;
  artwork: ArtworkReferenceDto | null;
}

interface CollectionSummaryDto {
  id: CollectionId;
  name: string;
  trackCount: number;
  createdAtMs: number;
  updatedAtMs: number;
}
```

## 54. Job DTOs

```ts
interface AnalysisJobDto {
  id: JobId;
  trackId: TrackId;
  trackTitle: string;
  status: JobStatus;
  priority: number;
  progress: number | null;
  attemptCount: number;
  maxAttempts: number;
  diagnosticCode: string | null;
  errorMessage: string | null;
  createdAtMs: number;
  updatedAtMs: number;
}

interface JobSummaryDto {
  revision: number;
  queuePaused: boolean;
  queued: number;
  running: number;
  paused: number;
  interrupted: number;
  completed: number;
  partial: number;
  failed: number;
  cancelled: number;
  stale: number;
}

interface JobQueryDto {
  statuses: JobStatus[];
  offset: number;
  limit: number;
}
```

Aggregate counts are computed from authoritative runtime or catalog state.

The frontend must not derive global completion counts from whichever paginated jobs happen to be visible in the Analysis drawer.

## 55. Atlas DTOs

```ts
interface AtlasSnapshotSummaryDto {
  id: AtlasSnapshotId;
  createdAtMs: number;
  featureSchemaVersion: string;
  algorithmVersion: string;
  eligibleCount: number;
  excludedCount: number;
  stale: boolean;
  explainedVarianceRatio: [number, number] | null;
}

interface AtlasPointDto {
  trackId: TrackId;
  x: number;
  y: number;
  colorValue: number | null;
  availability: FileAvailability;
}

interface AtlasSnapshotDto {
  summary: AtlasSnapshotSummaryDto;
  points: AtlasPointDto[];
  colorFeatureKey: string | null;
  colorDomain: [number, number] | null;
}

type SimilarityContextDto =
  | {
      kind: "snapshot";
      snapshotId: AtlasSnapshotId;
    }
  | {
      kind: "currentLibrary";
      modelId: string;
      analysisRevision: number;
    };

interface NeighborDto {
  track: TrackSummaryDto;
  distance: number;
}
```

The runtime returns raw feature values and their relevant scale domain. The frontend applies the visualization palette defined in the PDS.

Atlas coordinates must not be transformed into arbitrary normalized screen coordinates by the backend.

Viewport fitting, zooming, panning and pixel mapping belong to the frontend visualization layer.

## 56. Complete command inventory

This inventory extends the preliminary PRD command list to cover all core application operations.

### Application and onboarding

| Command | Input | Result |
|---|---|---|
| `app_get_bootstrap_state` | None | Bootstrap state |
| `app_get_info` | None | Application information |
| `onboarding_complete` | None | Updated onboarding state |
| `onboarding_load_demo` | None | Accepted operation |
| `onboarding_reset` | None | Updated onboarding state |

### Native selection and library

| Command | Input | Result |
|---|---|---|
| `library_pick_directory` | None | Registered source or cancelled result |
| `library_pick_files` | None | Registered sources or cancelled result |
| `library_list_sources` | None | Source summaries |
| `library_rescan_source` | Source ID | Accepted operation |
| `library_remove_source` | Source ID, confirmation token where needed | Removal result |
| `library_get_scan_status` | Operation ID | Scan status |
| `library_cancel_scan` | Operation ID | Cancellation acknowledgment |
| `library_list_tracks` | Track query | Paginated track summaries |
| `library_get_track` | Track ID | Track detail |
| `library_list_albums` | Page query | Paginated albums |
| `library_list_artists` | Page query | Paginated artists |
| `library_get_album` | Album ID | Album detail |
| `library_get_artist` | Artist ID | Artist detail |
| `library_get_overview` | None | Overview counts and analysis summary |

### Collections

| Command | Input | Result |
|---|---|---|
| `collections_list` | Page query | Paginated collections |
| `collections_create` | Name, optional track IDs | Collection summary |
| `collections_rename` | Collection ID, name | Updated summary |
| `collections_delete` | Collection ID | Deletion acknowledgment |
| `collections_add_tracks` | Collection ID, track IDs | Membership result |
| `collections_remove_tracks` | Collection ID, track IDs | Membership result |
| `collections_get_tracks` | Collection ID, track query | Paginated tracks |

### Analysis and artifacts

| Command | Input | Result |
|---|---|---|
| `analysis_enqueue` | Track IDs, priority | Accepted job identifiers |
| `analysis_get_result` | Track ID | Analysis summary or unavailable result |
| `analysis_get_waveform_metadata` | Track ID | Waveform metadata |
| `analysis_get_waveform` | Bounded waveform request | Binary waveform response |
| `analysis_get_spectrogram_metadata` | Track ID | Spectrogram metadata |
| `analysis_get_spectrogram_tiles` | Bounded tile request | Binary tile response |
| `analysis_regenerate_artifacts` | Track ID, artifact kinds | Accepted operation |
| `artwork_get` | Authorized asset ID | Bounded binary image |

### Jobs

| Command | Input | Result |
|---|---|---|
| `jobs_get_summary` | None | Authoritative summary |
| `jobs_list` | Job query | Paginated jobs |
| `jobs_pause_all` | None | Updated queue state |
| `jobs_resume_all` | None | Updated queue state |
| `jobs_cancel` | Job ID | Cancellation acknowledgment |
| `jobs_retry` | Job ID | Accepted job |
| `jobs_prioritize` | Job ID | Updated job summary |

### Atlas and comparison

| Command | Input | Result |
|---|---|---|
| `atlas_generate` | Approved configuration | Accepted operation |
| `atlas_cancel_generation` | Operation ID | Cancellation acknowledgment |
| `atlas_get_active_snapshot` | Optional color feature | Snapshot or unavailable result |
| `atlas_get_snapshot` | Snapshot ID, optional color feature | Snapshot |
| `atlas_get_neighbors` | Track ID, context, limit | Neighbor results |
| `comparison_get` | Left and right track IDs, context | Comparison result |

### Playback

| Command | Input | Result |
|---|---|---|
| `playback_get_state` | None | Authoritative playback state |
| `playback_load` | Track ID, autoplay | Updated playback state |
| `playback_control` | Typed transport action | Acknowledgment |
| `playback_seek` | Position in milliseconds | Accepted position |
| `playback_set_volume` | Normalized volume | Updated volume |
| `playback_replace_queue` | Track IDs, start index, autoplay | Updated playback state |

### Settings and exports

| Command | Input | Result |
|---|---|---|
| `settings_get` | None | Typed application settings |
| `settings_update` | Validated patch | Updated settings |
| `settings_get_storage_usage` | None | Categorized storage usage |
| `settings_clear_cache` | Cache category | Reclamation result |
| `settings_prepare_reset` | Reset scope | Confirmation description and token |
| `settings_confirm_reset` | Confirmation token | Reset result |
| `export_analysis` | Track ID | Native save outcome |
| `export_collection` | Collection ID | Native save outcome |
| `export_atlas` | Snapshot ID | Native save outcome |

### Native dialog outcomes

Cancellation of a file picker or save dialog is a normal user action.

```ts
type NativeDialogResult<T> =
  | { status: "completed"; value: T }
  | { status: "cancelled" };
```

Do not present ordinary dialog cancellation as an application error.

## 57. Event contract

Events carry revision information and session identity.

```ts
interface RuntimeEvent<T> {
  protocolVersion: number;
  runtimeSessionId: string;
  sequence: number;
  emittedAtMs: number;
  payload: T;
}
```

| Event name | Purpose |
|---|---|
| `app.bootstrap.updated` | Initialization state |
| `library.scan.progress` | Scan progress |
| `library.scan.completed` | Final scan summary |
| `library.catalog.changed` | Catalog mutation notification |
| `collections.changed` | Collection mutation notification |
| `analysis.job.updated` | Job-specific state change |
| `analysis.batch.progress` | Aggregate queue progress |
| `analysis.track.completed` | Committed analysis availability |
| `analysis.artifact.changed` | Artifact availability changes |
| `atlas.generation.updated` | Projection computation progress |
| `atlas.snapshot.ready` | Committed snapshot availability |
| `atlas.snapshot.stale` | Active snapshot is outdated |
| `playback.state.changed` | Authoritative transport-state change |
| `playback.position.updated` | Throttled playback position |
| `settings.changed` | Committed application settings |
| `application.error` | Relevant recoverable runtime error |

### Event delivery policy

Events may be coalesced or missed by the webview during startup, reload or temporary scheduling delays.

The frontend must not depend on receiving every progress event.

Persisted or actor-owned state remains authoritative.

If the frontend detects a new runtime session, out-of-order state revision or a significant event sequence discontinuity, it must refetch relevant authoritative queries.

### Subscription initialization

Register listeners before requesting initial snapshots. Reconcile concurrent events using revisions so that an older response cannot overwrite newer state.

The frontend must not assume exactly-once event delivery.

## 58. Error model

Native error variants are converted into stable application errors at the adapter boundary.

```rust
#[derive(Debug, thiserror::Error)]
pub enum RuntimeError {
    #[error("The requested track was not found")]
    TrackNotFound,

    #[error("The source file is unavailable")]
    SourceUnavailable,

    #[error("The requested operation is not permitted")]
    UnauthorizedPath,

    #[error("The input is invalid")]
    InvalidInput,

    #[error("The source changed during processing")]
    StaleInput,

    #[error("The application is currently busy")]
    Busy,

    #[error("Insufficient storage space")]
    StorageFull,

    #[error("The audio output device is unavailable")]
    AudioDeviceUnavailable,

    #[error("The operation was cancelled")]
    Cancelled,

    #[error("An internal application error occurred")]
    Internal,
}
```

The actual implementation may wrap domain-specific errors while preserving diagnostic chains internally.

### Stable error codes

| Code | Meaning |
|---|---|
| `APP_NOT_READY` | Initialization incomplete |
| `IPC_VERSION_MISMATCH` | Incompatible frontend/native contract |
| `INVALID_INPUT` | Request failed validation |
| `TRACK_NOT_FOUND` | Track identifier no longer exists |
| `SOURCE_UNAVAILABLE` | Source path or volume unavailable |
| `SOURCE_UNAUTHORIZED` | Requested source is outside authorized access |
| `MEDIA_UNSUPPORTED` | Unsupported codec or container |
| `MEDIA_CORRUPT` | Media cannot be decoded reliably |
| `ANALYSIS_UNAVAILABLE` | No suitable current analysis |
| `ANALYSIS_INCOMPATIBLE` | Feature schemas are incompatible |
| `ANALYSIS_STALE_INPUT` | Source changed during execution |
| `ARTIFACT_UNAVAILABLE` | Cached visualization is unavailable |
| `ATLAS_INSUFFICIENT_DATA` | Not enough eligible variation or tracks |
| `ATLAS_GENERATION_BUSY` | Projection generation already running |
| `PLAYBACK_DEVICE_UNAVAILABLE` | Audio output unavailable |
| `PLAYBACK_SEEK_UNSUPPORTED` | Current source cannot be seeked reliably |
| `STORAGE_FULL` | Insufficient available storage |
| `DATABASE_BUSY` | Temporary database contention |
| `DATABASE_MIGRATION_FAILED` | Database upgrade failed |
| `OPERATION_CANCELLED` | User or runtime cancelled work |
| `INTERNAL_ERROR` | Unexpected failure |

### Error presentation

The native runtime supplies a safe user-facing message and stable code.

The frontend selects the PDS-defined recovery behavior based on that code.

Raw SQL statements, Rust backtraces, native filesystem internals and media-parser diagnostic dumps must not be displayed as ordinary user-facing errors.

# Part XIII — Frontend software architecture

## 59. Frontend layering

The frontend implements the approved PDS. This architecture governs state ownership, data retrieval, component boundaries and rendering behavior.

### Frontend module rules

| Module | Responsibility |
|---|---|
| `app` | Providers, lifecycle and router configuration |
| `shell` | Navigation, command bar, playback strip and drawer host |
| `routes` | Route-level composition and screen coordination |
| `features` | Product-specific components, queries and interactions |
| `design-system` | Canonical tokens and reusable interaction primitives |
| `visualizations` | Waveform, spectrogram and Atlas renderers |
| `ipc` | Generated contracts and native command adapters |
| `stores` | Cross-screen presentation state |
| `lib` | Small framework-independent utilities |
| `test` | Explicit fixtures and test adapters |

Feature modules may import shared primitives, visualization utilities and IPC contracts.

Feature modules should not directly import unrelated feature internals.

Cross-feature functionality belongs in a deliberately shared interface.

## 60. Routing

Use a desktop-compatible client-side router.

Hash-based routing is the proposed baseline because it avoids requiring server-side route rewrites in a packaged local application.

| Route | Screen |
|---|---|
| `/welcome` | Welcome and onboarding |
| `/overview` | Collection overview |
| `/library/tracks` | Track catalog |
| `/library/albums` | Album grid |
| `/library/albums/:albumId` | Album detail |
| `/library/artists` | Artist grid |
| `/library/artists/:artistId` | Artist detail |
| `/library/collections` | Collections |
| `/library/collections/:collectionId` | Collection detail |
| `/tracks/:trackId` | Track Observatory |
| `/atlas` | Sonic Atlas |
| `/comparison` | Comparison workspace |
| `/settings/sources` | Source management |
| `/settings/analysis` | Analysis engine settings |
| `/settings/appearance` | Appearance |
| `/settings/data` | Storage and data management |
| `/settings/privacy` | Privacy information |
| `/settings/about` | Application information |

The Analysis drawer and playback strip are persistent application-shell components, not independent pages.

### Navigation state

Track-selection state for comparison may use route query parameters containing track IDs.

Native file paths and analysis artifact locations must never be placed in route URLs.

Navigation history must support the Windows keyboard interactions specified in the PDS.

## 61. State ownership

State duplication is one of the primary frontend architectural risks.

Use the following ownership model.

| State | Authoritative owner | Frontend mechanism |
|---|---|---|
| Library tracks | Native catalog | TanStack Query |
| Album and artist groupings | Native catalog | TanStack Query |
| Collection membership | Native catalog | TanStack Query |
| Analysis values | Native catalog | TanStack Query |
| Job lifecycle | Native coordinator and catalog | Queries plus event updates |
| Atlas snapshots | Native catalog | TanStack Query |
| Acoustic neighbors | Native similarity service | TanStack Query |
| Playback transport | Native playback actor | Revision-aware presentation store |
| Persistent settings | Native catalog | TanStack Query |
| Current route | React Router | Router state |
| Search input before submission | Local component | React state |
| Table selection | Feature presentation state | Local state or Zustand |
| Atlas viewport | Frontend | Zustand or renderer-local state |
| Open drawer or dialog | Frontend | Local state or Zustand |
| Hovered canvas point | Renderer | Mutable rendering state |
| Theme application | Frontend, backed by native settings | Theme provider |

Do not copy the entire library, analysis cache or all background jobs into Zustand.

Do not represent native authoritative state as a collection of unrelated global React contexts.

## 62. Query-key conventions

Use stable query-key factories.

```ts
export const queryKeys = {
  appInfo: ["app", "info"] as const,

  bootstrap: ["app", "bootstrap"] as const,

  overview: ["overview"] as const,

  sources: ["library", "sources"] as const,

  tracks: (query: TrackQueryDto) =>
    ["library", "tracks", query] as const,

  track: (id: TrackId) =>
    ["library", "track", id] as const,

  albums: (query: unknown) =>
    ["library", "albums", query] as const,

  artists: (query: unknown) =>
    ["library", "artists", query] as const,

  collections: ["collections"] as const,

  collection: (id: CollectionId) =>
    ["collections", id] as const,

  analysis: (id: TrackId) =>
    ["analysis", "track", id] as const,

  jobSummary: ["jobs", "summary"] as const,

  jobs: (query: JobQueryDto) =>
    ["jobs", "list", query] as const,

  activeAtlas: (colorKey: string | null) =>
    ["atlas", "active", colorKey] as const,

  atlasSnapshot: (
    id: AtlasSnapshotId,
    colorKey: string | null
  ) =>
    ["atlas", "snapshot", id, colorKey] as const,

  settings: ["settings"] as const
};
```

The `unknown` query parameters in this illustrative factory should be replaced with generated page-query DTOs during implementation.

Query inputs must have canonical stable representations.

### Cache invalidation rules

| Runtime event | Affected query families |
|---|---|
| `library.catalog.changed` | Library, overview, relevant collections |
| `analysis.track.completed` | Specific track, analysis, overview, affected library results |
| `analysis.artifact.changed` | Specific artifact and analysis-availability queries |
| `collections.changed` | Collections and affected membership queries |
| `analysis.job.updated` | Relevant job pages and job summary |
| `atlas.snapshot.ready` | Active Atlas, snapshot and relevant overview |
| `atlas.snapshot.stale` | Active Atlas metadata and overview |
| `settings.changed` | Settings and affected services |

Do not invalidate the entire frontend cache every time a worker processes another audio block.

High-frequency progress updates should patch known state or trigger throttled refreshes.

## 63. Frontend IPC adapter

Production components must not call Tauri's `invoke` directly.

Use a typed centralized adapter.

```ts
import { invoke } from "@tauri-apps/api/core";

export interface SonicMirrorClient {
  listTracks(
    query: TrackQueryDto
  ): Promise<PageDto<TrackSummaryDto>>;

  getTrack(
    trackId: TrackId
  ): Promise<TrackDetailDto>;

  getAnalysis(
    trackId: TrackId
  ): Promise<AnalysisSummaryDto | null>;

  getJobSummary(): Promise<JobSummaryDto>;

  getPlaybackState(): Promise<PlaybackStateDto>;
}

export class TauriSonicMirrorClient
  implements SonicMirrorClient {
  listTracks(
    query: TrackQueryDto
  ): Promise<PageDto<TrackSummaryDto>> {
    return invoke("library_list_tracks", {
      query
    });
  }

  getTrack(
    trackId: TrackId
  ): Promise<TrackDetailDto> {
    return invoke("library_get_track", {
      trackId
    });
  }

  getAnalysis(
    trackId: TrackId
  ): Promise<AnalysisSummaryDto | null> {
    return invoke("analysis_get_result", {
      trackId
    });
  }

  getJobSummary(): Promise<JobSummaryDto> {
    return invoke("jobs_get_summary");
  }

  getPlaybackState(): Promise<PlaybackStateDto> {
    return invoke("playback_get_state");
  }
}
```

This is a representative subset. The production client must implement the full approved command inventory as it becomes available.

### Development and test adapters

Provide an explicit fixture-backed client for:

- Storybook or equivalent isolated component previews, if introduced.
- Browser-based component testing.
- Playwright interaction tests.
- Development without the complete native runtime.

The fixture adapter must never be selected automatically because production IPC failed.

A failed native command must produce the correct error or unavailable state.

## 64. Application shell composition

```ts
function AppShell() {
  return (
    <ApplicationFrame>
      <GlobalCommandBar />
      <NavigationRail />

      <MainWorkspace>
        <Outlet />
      </MainWorkspace>

      <AnalysisDrawerHost />
      <PersistentPlaybackStrip />
      <GlobalDialogHost />
      <NotificationHost />
    </ApplicationFrame>
  );
}
```

The PDS governs all dimensions, colors, typography and interaction states.

The architectural requirement is that navigation between route components must not remount the playback actor adapter or clear the global playback presentation state.

The Analysis drawer must remain connected to the same native job coordinator across route changes.

## 65. Design-system implementation

The canonical file is:

```text
apps/desktop/src/design-system/tokens.css
```

It is imported once at the application root.

Theme selection updates:

```html
<html data-theme="light">
```

or:

```html
<html data-theme="dark">
```

System appearance follows the operating-system preference when the configured theme setting is `"system"`.

Reduced-motion behavior uses the CSS media preference and the explicit application setting defined by the PDS.

### Styling constraints

- Product colors must reference the canonical `--sm-*` variables.
- Components must not introduce new unapproved visual palettes.
- Use semantic component variants rather than repeating arbitrary styling strings.
- Canvas renderers read the relevant resolved CSS variables.
- Theme changes invalidate visualization color caches without recomputing acoustic analysis.
- The product must remain usable without external fonts or assets.

Font loading should use locally bundled files with their required license notices. The final repository must contain only properly licensed assets.

## 66. Virtualization and rendering performance

### Library tables

Use a virtualized table or list implementation for large track collections.

TanStack Virtual is the proposed supporting library.

Virtualization must preserve the accessibility contract established by the PDS.

The implementation must not rely on inaccessible canvas-rendered table text.

### Visualization responsibilities

| Renderer | Technology |
|---|---|
| Waveform | Canvas 2D with DOM-accessible controls |
| Spectrogram | Canvas 2D using typed intensity buffers |
| Atlas | Canvas 2D with spatial interaction index |
| Axes and legends | DOM or SVG |
| Album artwork | Standard image rendering from authorized local assets |
| Comparison | DOM-based tables and accessible charts |

### Device pixel ratio

Canvas dimensions must distinguish CSS logical size from physical backing-store size.

```ts
function configureCanvas(
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
  devicePixelRatio: number
) {
  const dpr = Math.min(devicePixelRatio, 2);

  canvas.width = Math.round(logicalWidth * dpr);
  canvas.height = Math.round(logicalHeight * dpr);

  canvas.style.width = `${logicalWidth}px`;
  canvas.style.height = `${logicalHeight}px`;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas context unavailable");
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  return context;
}
```

The provisional DPR cap of two limits excessive backing-store allocation. Higher-DPI rendering must be evaluated against Windows scaling, visual quality and memory requirements.

### Atlas rendering

The Canvas renderer owns:

- Coordinate-to-screen transformation.
- Point drawing.
- Viewport clipping.
- Hit testing.
- Selection outlines.
- Hover state.
- Pan and zoom.
- Rendering invalidation.

The renderer must not own:

- PCA computation.
- Acoustic distance calculations.
- Feature normalization.
- Persistent collections.
- Analysis validity.

Use `requestAnimationFrame` for interactive rendering, not a React state update for every pointer-movement coordinate.

### Spatial interaction index

An in-memory quadtree, such as a D3-compatible quadtree, may support efficient point hit testing.

The quadtree indexes displayed coordinates for interaction. It is not the acoustic similarity index.

Coincident points must remain individually accessible through an appropriate selection list.

# Part XIV — Settings, exports and data lifecycle

## 67. Settings contract

Settings are typed, versioned and persisted through the native runtime.

```ts
interface ApplicationSettingsDto {
  version: number;

  appearance: {
    theme: "light" | "dark" | "system";
    reducedMotion: boolean;
  };

  analysis: {
    workerLimit: number;
    autoAnalyzeNewTracks: boolean;
    queuePaused: boolean;
  };

  library: {
    rescanOnLaunch: boolean;
  };

  storage: {
    cacheBudgetBytes: number;
  };

  playback: {
    volume: number;
  };

  onboarding: {
    completed: boolean;
  };
}
```

### Default values

```json
{
  "version": 1,
  "appearance": {
    "theme": "light",
    "reducedMotion": false
  },
  "analysis": {
    "workerLimit": 2,
    "autoAnalyzeNewTracks": true,
    "queuePaused": false
  },
  "library": {
    "rescanOnLaunch": true
  },
  "storage": {
    "cacheBudgetBytes": 2147483648
  },
  "playback": {
    "volume": 0.8
  },
  "onboarding": {
    "completed": false
  }
}
```

`workerLimit: 2` is the conservative serialized fallback. On first initialization, the runtime may replace it with the hardware-derived default from Section 29.

Reduced motion is active if either the operating-system preference or the application setting requests it.

### Update validation

The frontend submits a typed patch.

The native runtime must:

1. Validate permitted keys.
2. Validate each field's range.
3. Persist the new configuration transactionally.
4. Apply affected runtime changes.
5. Publish a settings-changed event.

An arbitrary JSON configuration editor is not exposed through production IPC.

## 68. Export architecture

The export service owns file serialization and native save-dialog interaction.

### Track analysis JSON

```json
{
  "format": "sonicmirror.analysis",
  "exportSchemaVersion": 1,
  "applicationVersion": "0.1.0",
  "analysisEngineVersion": "1",
  "featureSchemaVersion": "1",
  "track": {
    "title": "Example Track",
    "artist": "Example Artist",
    "album": null,
    "durationMs": 180000
  },
  "analysis": {
    "status": "complete",
    "configuration": {},
    "features": [
      {
        "key": "spectral_centroid_mean",
        "value": 2300,
        "unit": "Hz",
        "status": "valid",
        "algorithmVersion": "1"
      }
    ]
  }
}
```

The example values are illustrative, not measured output.

### Collection CSV

Initial columns:

```text
track_id,title,artist,album,genre,duration_ms,availability,analysis_status
```

Additional validated measurement columns can be provided through a fixed versioned export schema.

### Atlas CSV

Initial columns:

```text
snapshot_id,track_id,title,artist,analysis_id,pc1,pc2
```

The export should include sufficient version and model context through a companion metadata file or documented columns.

### Export security

CSV metadata is untrusted content.

Spreadsheet-formula injection must be mitigated for text fields beginning with formula-triggering characters. Quoting a CSV cell alone is not sufficient.

Use an explicitly documented spreadsheet-safe text escaping policy.

Exports must not include native filesystem paths or content digests by default unless the user has explicitly selected an export format that requires them.

## 69. Source removal and catalog deletion

Source removal is different from source-file deletion.

SonicMirror must never call a filesystem deletion operation on imported audio merely because a user removes a track, collection or source.

### Removing a source

The service:

1. Cancels or safely reconciles active work associated exclusively with that source.
2. Removes its source-membership relationships.
3. Preserves tracks associated with another source.
4. Preserves orphaned catalog entries referenced by user collections until explicitly resolved.
5. Marks retained orphaned entries as unavailable when no authorized source remains.
6. Schedules unused cache cleanup.

A retained catalog entry is not permission to continue reading an unauthorized source path.

### Deleting a collection

Remove collection membership and collection metadata only.

Do not delete tracks, analysis records or source files.

## 70. Data reset workflow

Destructive application-data operations require a native preparation and confirmation workflow.

```ts
type ResetScope =
  | "visualizationCache"
  | "analysisData"
  | "entireCatalog";
```

```ts
interface ResetPreviewDto {
  token: string;
  scope: ResetScope;
  description: string;
  affectedTrackCount: number;
  affectedCollectionCount: number;
  expiresAtMs: number;
  originalAudioAffected: false;
}
```

The confirmation token is short-lived and tied to the proposed scope.

It must not authorize arbitrary native deletion commands.

### Reset behavior

| Scope | Removes | Preserves |
|---|---|---|
| Visualization cache | Regenerable waveform, spectrogram and artwork artifacts | Metadata, collections, scalar analysis |
| Analysis data | Analysis records, jobs and Atlas snapshots | Sources, tracks and collections |
| Entire catalog | Application catalog and its managed derived data | Original music files |

An entire-catalog reset requires exclusive access to persistence resources. Active jobs, artifact readers and playback must be safely stopped or reconciled first.

Reset failure must not leave the runtime continuing normal operations against partially deleted persistence state.

# Part XV — Security architecture

## 71. Trust boundaries

Local media files are untrusted inputs.

The webview frontend is also not a trusted authority for native filesystem access, even though it is shipped with the application.

## 72. Tauri capabilities

The production application must use a minimal capability configuration.

Required capability categories may include:

- Native dialog selection.
- Approved application window operations.
- Narrow application commands.
- Required event subscription functionality.

Do not grant broad filesystem, shell, process execution, unrestricted URL opening or external HTTP permissions merely to simplify development.

### Explicitly prohibited production surfaces

```text
read_arbitrary_file
write_arbitrary_file
execute_shell_command
execute_sql
fetch_arbitrary_url
delete_filesystem_path
open_unvalidated_path
```

The actual Tauri permission identifiers depend on the selected dependency versions and plugin configuration.

The production `capabilities` file must be generated and audited against the installed Tauri version rather than copy unverified permission names into a release.

## 73. Content security policy

The production webview should load only packaged application resources and explicitly approved local transports.

The intended policy is restrictive:

| Directive | Intent |
|---|---|
| `default-src` | Deny by default or restrict to application origin |
| `script-src` | Packaged application scripts |
| `style-src` | Packaged styles and required runtime styles |
| `font-src` | Bundled local fonts |
| `img-src` | Application images and approved local artwork transport |
| `connect-src` | Required native IPC origins only |
| `object-src` | None |
| `frame-src` | None unless explicitly justified |
| `base-uri` | None |
| `form-action` | None unless required |

The final literal CSP must be validated against packaged Tauri/WebView2 behavior and any necessary generated nonces or local protocols.

Development hot-reload allowances must not leak into the production configuration.

Remote web pages must not be loaded into a privileged application webview.

## 74. Filesystem authorization

Before accessing media:

1. Resolve the track or source identifier.
2. Retrieve the registered native path.
3. Validate active source authorization.
4. Apply the platform-specific path policy.
5. Open the file with appropriate read-only access.
6. Verify the expected source identity when required.

Canonicalization alone is not a complete defense against symlink or reparse-point races.

The Windows implementation must account for directory junctions, reparse points, drive changes and file replacement between validation and access.

For sensitive operations, use stable opened handles and validate the resulting file identity wherever the platform permits.

### Managed artifact access

Artifact lookup begins with an internal artifact identifier.

The stored relative path is validated against the managed artifact root.

The frontend cannot request an arbitrary path from the application-data directory.

## 75. Resource limits

Malformed or unusually large media must not cause uncontrolled resource consumption.

Proposed initial limits:

| Resource | Baseline |
|---|---|
| Embedded compressed artwork | 16 MiB |
| Decoded artwork dimensions | Maximum 4096 × 4096 |
| Artwork preview dimensions | 256px and 512px variants |
| Waveform response | Maximum 8,192 buckets |
| Single spectrogram tile response | Maximum 8 MiB |
| Combined spectrogram request | Maximum 16 MiB |
| Search input | 256 Unicode scalar values |
| Collection name | 120 Unicode scalar values |
| Metadata field | Bounded display and processing length |
| Runtime logs | Five files of up to 5 MiB |
| Simultaneous projection operations | One |

The technical implementation must additionally bound audio frame allocations, decoder buffers, channel counts and artifact dimensions.

These values must be enforced before expensive allocation where possible.

Compressed-image validation must account for decompression amplification, not merely compressed byte size.

## 76. Privacy and network policy

The core application performs no mandatory network operations.

No telemetry, remote crash reports, external font requests, metadata enrichment or remote AI inference is enabled by default.

The packaged application must be tested with network access disabled.

WebView2 or operating-system components may perform their own platform-managed activity. SonicMirror should not make broad claims about every network operation performed by Windows itself.

The application-level privacy claim is that SonicMirror's core workflows do not transmit user music or catalog information to external services.

## 77. Dependency and release security

Required practices:

- Commit dependency lockfiles.
- Audit Rust and JavaScript dependencies.
- Review newly introduced native and build-script dependencies.
- Maintain applicable third-party license notices.
- Scan for accidentally committed secrets.
- Keep GitHub Actions permissions minimal.
- Pin third-party CI actions to reviewed immutable revisions where practical.
- Avoid exposing signing credentials to untrusted pull-request workflows.
- Produce checksums for published release artifacts.

Dependency-audit warnings require review. They must not be blindly suppressed to obtain a green CI status.

# Part XVI — Observability, diagnostics and performance

## 78. Local logging

Use structured Rust logging through `tracing`.

Logs exist to diagnose application failures, not to collect user behavior.

### Log targets

| Target | Responsibility |
|---|---|
| `sonicmirror::bootstrap` | Startup and initialization |
| `sonicmirror::catalog` | Database and repository operations |
| `sonicmirror::library` | Source scanning and reconciliation |
| `sonicmirror::analysis` | Analysis lifecycle and measurements |
| `sonicmirror::jobs` | Scheduling and recovery |
| `sonicmirror::artifacts` | Cache operations |
| `sonicmirror::atlas` | Projection and similarity |
| `sonicmirror::playback` | Native playback behavior |
| `sonicmirror::ipc` | Native command diagnostics |

### Log levels

| Level | Usage |
|---|---|
| ERROR | Failed operations requiring investigation |
| WARN | Recoverable failures and degraded behavior |
| INFO | Important application lifecycle events |
| DEBUG | Detailed development diagnostics |
| TRACE | Explicitly enabled low-level investigation |

Production logging defaults to INFO with bounded file rotation.

Verbose PCM samples, complete feature vectors and unredacted personal metadata must not be logged.

### Structured event example

```rust
tracing::info!(
    target: "sonicmirror::analysis",
    job_id = %job_id,
    elapsed_ms = elapsed.as_millis(),
    outcome = "completed",
    "Audio analysis committed"
);
```

Use internal identifiers rather than personal filenames wherever practical.

## 79. Performance instrumentation

Record local timing metrics around important subsystem boundaries.

| Operation | Metrics |
|---|---|
| Application bootstrap | Total duration and stage timings |
| Source scan | Files discovered per second |
| Metadata extraction | Per-file latency |
| Content hashing | Bytes processed per second |
| Audio analysis | Audio duration, wall time, real-time factor |
| Database query | Latency and returned row count |
| Database transaction | Duration and mutation count |
| Artifact generation | Duration and output size |
| Neighbor retrieval | Vector count, dimensions and latency |
| PCA generation | Input size and computation time |
| Playback | Initialization latency and observable underruns where available |
| Atlas rendering | Frame duration and interaction latency |

These diagnostics remain local.

Benchmarks must record hardware, operating system, dependency configuration, workload characteristics and execution conditions.

## 80. Performance budgets

The PRD's non-functional requirements remain authoritative.

| Operation | Target |
|---|---|
| Warm startup | P95 at or below 2 seconds |
| Cold startup | P95 at or below 4 seconds |
| Library search | P95 at or below 100 ms |
| Metadata page retrieval | P95 at or below 100 ms |
| Cached Observatory opening | P95 at or below 500 ms |
| Neighbor retrieval for 10,000 vectors | P95 at or below 150 ms |
| Atlas generation for 10,000 eligible tracks | Target at or below 10 seconds |
| Atlas interaction | 60 FPS target, 30 FPS minimum sustained reference workload |
| Idle application memory | Target at or below 250 MiB |
| Analysis throughput | Target at least 5× real-time per worker |
| Cancellation acknowledgment | At or below 1 second under normal conditions |

No numerical performance claim should appear in the repository README until it has supporting benchmark evidence.

### Optimization policy

Optimize only after identifying a measured bottleneck.

For example:

| Observed bottleneck | Possible response |
|---|---|
| Slow repeated database queries | Improve indexes or query composition |
| FFT allocation overhead | Reuse plans and scratch buffers |
| Excessive IPC payload size | Introduce bounded binary transport |
| Frontend table rendering | Virtualize visible rows |
| Atlas interaction latency | Optimize Canvas rendering and hit testing |
| Exact retrieval becomes expensive | Evaluate approximate vector indexing |
| PCA quality proves inadequate | Evaluate alternative projection algorithms |

Do not introduce WebGL, vector databases, distributed processing or approximate indexing without evidence that the simpler architecture is insufficient.

# Part XVII — Testing and verification architecture

## 81. Testing boundaries

### Test ownership

| Layer | Tooling |
|---|---|
| Rust units | `cargo test` |
| Property-based testing | `proptest` |
| Reference numerical validation | Synthetic and externally validated fixtures |
| Media fuzzing | `cargo-fuzz`, through a supported toolchain/environment |
| Rust benchmarks | Criterion |
| Frontend unit and component tests | Vitest and Testing Library |
| Browser E2E | Playwright |
| Native Windows automation | Validated Tauri/WebDriver or Windows UI automation |
| Accessibility | Automated checks and manual keyboard/screen-reader validation |

Browser E2E tests using fixture adapters are not a substitute for native integration tests.

## 82. Mandatory computational tests

| Test ID | Requirement |
|---|---|
| CORE-001 | Equivalent analysis configuration produces the same cache identity. |
| CORE-002 | Changing relevant configuration changes cache identity. |
| CORE-003 | A known-amplitude signal produces validated level measurements. |
| CORE-004 | A sine-wave fixture produces the expected dominant spectral region. |
| CORE-005 | Silence produces explicit valid or unavailable semantics. |
| CORE-006 | Invalid numerical output cannot be committed as valid. |
| CORE-007 | Waveform buckets preserve observed sample extrema. |
| CORE-008 | Spectrogram dimensions match the analysis parameters. |
| CORE-009 | Identical compatible vectors have zero distance. |
| CORE-010 | Distances are nonnegative and symmetric within tolerance. |
| CORE-011 | Feature contributions reconstruct squared distance. |
| CORE-012 | Degenerate PCA input produces an explicit fallback. |
| CORE-013 | Normalization handles insufficient-variance dimensions. |
| CORE-014 | Cancellation is observed within bounded processing intervals. |

The next technical specification will define exact expected values and tolerances for these tests.

## 83. Mandatory catalog tests

| Test ID | Requirement |
|---|---|
| CAT-001 | Fresh database initializes successfully. |
| CAT-002 | Applying recorded migrations again does not corrupt the schema. |
| CAT-003 | Foreign-key constraints reject invalid relationships. |
| CAT-004 | Failed transactions do not leave partial successful state. |
| CAT-005 | Overlapping sources share one physical-file catalog entry. |
| CAT-006 | Removing one source preserves membership through another. |
| CAT-007 | FTS search reflects inserted, changed and deleted metadata. |
| CAT-008 | Analysis cache keys enforce uniqueness. |
| CAT-009 | Active duplicate analysis requests are rejected or reused. |
| CAT-010 | Stale content revisions cannot attach current results. |
| CAT-011 | Removing a collection does not remove tracks. |
| CAT-012 | Clearing visualization artifacts preserves scalar analysis. |
| CAT-013 | A stored Atlas snapshot preserves surviving coordinates. |
| CAT-014 | An interrupted migration triggers safe recovery behavior. |
| CAT-015 | Lossless native path representation survives round-trip. |

Use temporary test directories and isolated databases.

SQLite in-memory databases are useful for repository tests, but file-backed WAL tests are required for concurrency, recovery and migration verification.

## 84. Mandatory runtime tests

| Test ID | Requirement |
|---|---|
| RUN-001 | Importing the same source twice is idempotent. |
| RUN-002 | Failed or cancelled scans do not mark unseen files missing. |
| RUN-003 | Duplicate file contents can share analysis results. |
| RUN-004 | Independent analyzer failures produce valid partial results. |
| RUN-005 | Cancelling active work does not commit successful final state. |
| RUN-006 | Paused queue state survives application restart. |
| RUN-007 | Interrupted jobs recover correctly. |
| RUN-008 | Automatic retry limits are enforced. |
| RUN-009 | Permanently unsupported files are not retried indefinitely. |
| RUN-010 | Source changes invalidate obsolete analysis requests. |
| RUN-011 | Global job counts remain correct across paginated queries. |
| RUN-012 | Artifact publication failure cannot create a valid missing-file reference. |
| RUN-013 | Orphan artifacts are recoverable. |
| RUN-014 | Native event delivery follows durable state transitions. |
| RUN-015 | Reset operations preserve original audio files. |
| RUN-016 | Unauthorized path access is rejected. |

## 85. Mandatory frontend tests

| Test ID | Requirement |
|---|---|
| FE-001 | Application bootstrap handles ready and failed states. |
| FE-002 | Welcome permits import, demo and skipped onboarding. |
| FE-003 | Production IPC failures never activate synthetic fixtures. |
| FE-004 | Library filtering and sorting use typed native queries. |
| FE-005 | Playback state survives route changes. |
| FE-006 | Outdated playback events do not overwrite newer state. |
| FE-007 | Waveform and playback strip use the same position state. |
| FE-008 | Missing features render unavailable states rather than zero values. |
| FE-009 | Atlas filtering does not regenerate coordinates. |
| FE-010 | A stale Atlas exposes the required refresh affordance. |
| FE-011 | Comparison handles unavailable and incompatible measurements. |
| FE-012 | Analysis drawer reflects authoritative aggregate counts. |
| FE-013 | Theme and reduced-motion preferences apply consistently. |
| FE-014 | Empty, loading, partial, error and stale states match the PDS. |
| FE-015 | Canvas experiences have keyboard-accessible alternatives. |
| FE-016 | Navigation restores focus according to the PDS. |

## 86. Windows-native validation matrix

Since Windows 11 is the confirmed development environment, it is the first platform on which architectural assumptions must be validated.

| Scenario | Verification |
|---|---|
| Fresh installation | Application launches with clean data directory |
| Upgrade installation | Existing catalog migrates safely |
| WebView2 availability | Installer/runtime handles required webview |
| Local music directory | Native picker and recursive import |
| Unicode filenames | Import, persistence, playback and export |
| Long Windows paths | Explicitly supported or recoverably rejected |
| Overlapping directories | Correct source membership |
| NTFS junctions | No unintended recursive traversal |
| External drive removal | Missing-source recovery |
| Locked media file | Recoverable import or analysis failure |
| Concurrent source modification | Stale analysis rejection |
| Corrupt SQLite or artifacts | Recovery or actionable startup error |
| Application termination | Durable job recovery |
| Audio-device disconnect | Controlled playback error |
| Analysis during playback | Acceptable playback continuity |
| 125% and 150% display scaling | Correct layout and interaction |
| 200% display scaling | Accessible behavior within supported viewport constraints |
| Windows high-contrast mode | Visible and operable controls |
| Network disabled | Complete core workflow |
| Unsigned development installer | Accurate trust messaging |
| Application uninstall | Original music remains untouched |

macOS and Linux must pass equivalent platform-specific validation before being advertised as fully supported release targets.

A successful cross-platform compilation is not sufficient evidence of platform support.

## 87. Test fixtures and asset provenance

Fixtures are divided into:

```text
tests/fixtures/
├── generated/
├── reference/
├── malformed/
└── manifests/
```

### Generated fixtures

Generate controlled audio signals programmatically:

- Sine waves.
- Multi-frequency signals.
- Silence.
- Impulses.
- Chirps.
- White and pink noise.
- Known-amplitude signals.
- Stereo phase examples.
- Controlled tempo sequences.
- Clipped signals.

Generated fixtures should include reproducible generator parameters and expected measurement definitions.

### Real music fixtures

Real recordings must have documented permission for the intended repository, test and distribution usage.

The demonstration collection is subject to separate licensing and provenance verification.

Do not commit copyrighted music simply because it is available in the developer's local collection.

# Part XVIII — Build, packaging and release architecture

## 88. Development workflow

The project should provide root-level commands that coordinate the frontend and Rust workspace.

Proposed command interface:

| Command | Responsibility |
|---|---|
| `pnpm install --frozen-lockfile` | Install pinned frontend dependencies |
| `pnpm dev` | Launch native development application |
| `pnpm typecheck` | TypeScript validation |
| `pnpm lint` | Frontend static checks |
| `pnpm test` | Frontend unit and component tests |
| `pnpm test:e2e` | Browser interaction tests |
| `pnpm build` | Frontend production build |
| `pnpm build:desktop` | Packaged native build |
| `cargo fmt --all --check` | Rust formatting verification |
| `cargo clippy --workspace --all-targets -- -D warnings` | Rust lint verification |
| `cargo test --workspace --locked` | Workspace Rust tests |
| `cargo bench -p sonic-core` | Computational benchmarks |

These pnpm scripts are the intended developer-facing interface. They must be implemented in the repository's package manifests before being documented as operational commands.

Feature-specific Cargo configurations require their own verified CI matrix.

Blindly enabling every optional crate feature may activate incompatible combinations.

## 89. Cargo workspace baseline

The root Cargo workspace should coordinate the three internal crates and the Tauri application.

```toml
[workspace]
members = [
    "apps/desktop/src-tauri",
    "crates/sonic-core",
    "crates/sonic-catalog",
    "crates/sonic-runtime"
]
resolver = "2"

[workspace.package]
version = "0.1.0"
edition = "2024"

[workspace.lints.rust]
unsafe_code = "forbid"

[workspace.lints.clippy]
dbg_macro = "warn"
todo = "warn"
unimplemented = "warn"

[profile.dev]
debug = true

[profile.release]
lto = "thin"
codegen-units = 1
strip = "symbols"
```

Each member crate must explicitly inherit workspace lint configuration where applicable.

The chosen Rust toolchain must support the declared edition and all selected dependencies.

The first release should preserve unwinding behavior unless an ADR justifies changing the panic strategy. Do not select `panic = "abort"` purely to reduce binary size without assessing runtime recovery consequences.

### Unsafe code policy

Owned Rust code should remain safe Rust by default.

If native Windows integration eventually requires unsafe FFI, isolate it behind a narrow, reviewed platform adapter and document its safety invariants.

That would require an explicit revision to the applicable `unsafe_code` lint policy rather than an unnoticed architectural exception.

## 90. JavaScript workspace

```yaml
packages:
  - "apps/*"
```

The root package should be private.

There is no need to publish internal frontend packages or create a component-library monorepo until actual sharing requirements arise.

The `pnpm-lock.yaml` file is authoritative for frontend dependency resolution.

## 91. Continuous integration

Proposed workflow layout:

```text
.github/workflows/
├── rust-ci.yml
├── frontend-ci.yml
├── native-build.yml
├── security.yml
└── release.yml
```

### Pull-request checks

### Required CI behavior

- Verify lockfiles.
- Cache dependencies without compromising correctness.
- Run Rust and frontend tests independently where appropriate.
- Regenerate IPC bindings and fail if committed contracts drift unexpectedly.
- Compile the production Windows application.
- Upload relevant test reports on failure.
- Restrict workflow permissions.
- Keep release signing isolated from ordinary pull-request execution.

CI duration and runner usage should be monitored so that routine contributions remain practical.

## 92. Release packaging

### Windows-first artifacts

Proposed initial distribution:

```text
SonicMirror_<version>_x64-setup.exe
SHA256SUMS.txt
THIRD_PARTY_NOTICES.txt
```

NSIS is the proposed initial Windows installer format through the supported Tauri bundler configuration.

MSI packaging can be added when its distribution or deployment benefits justify it.

### WebView2 dependency policy

The installer must document whether it:

- Uses an already-installed WebView2 runtime.
- Installs or downloads a required runtime.
- Bundles an appropriate offline runtime installer.

An offline-capable installed application is distinct from an installer that can bootstrap every dependency without internet access.

Both properties must be documented accurately.

### Code signing

Development installers may remain unsigned.

A public stable release should use appropriate Windows code signing when available. If signing is unavailable, the repository must clearly disclose the trust limitation.

Do not instruct users to disable Microsoft Defender, SmartScreen or Windows security protections globally.

### Updates

Automatic application updates are deferred.

The first release can distribute versioned installers through GitHub Releases.

A future updater requires signed artifacts, explicit trust configuration, secure update metadata and a dedicated ADR.

# Part XIX — Failure handling and architectural resilience

## 93. Failure-mode register

| Failure | Containment | Recovery |
|---|---|---|
| Unsupported codec | One track | Mark unsupported |
| Malformed metadata | One metadata operation | Preserve safe fallback |
| Corrupt media | One analysis job | Structured failure |
| Missing external drive | Affected source | Preserve catalog and rescan later |
| Failed content verification | One request | Mark stale and reconcile |
| Decoder cancellation | One worker | Persist recoverable state |
| Optional analyzer failure | One feature group | Commit valid partial analysis |
| SQLite contention | Affected operation | Bounded retry |
| SQLite migration failure | Application startup | Recovery screen and backup handling |
| Disk exhaustion | Affected writes | Stop growth and expose storage recovery |
| Missing artifact | One visualization | Regenerate if possible |
| Orphan artifact | Managed cache | Cleanup |
| PCA failure | Atlas generation | Preserve previous valid snapshot |
| Playback-device failure | Playback subsystem | Recoverable transport error |
| IPC event loss | Frontend synchronization | Refetch authoritative state |
| Webview reload | Presentation layer | Rehydrate native state |
| Unexpected termination | Active jobs | Startup recovery |

### Process isolation limitation

The core release runs the Rust computational engine inside the desktop application's native process.

This simplifies distribution and IPC, but it means a fatal decoder failure, abort or native dependency crash could terminate the application despite ordinary error handling.

Cooperative cancellation and Rust error propagation do not protect against every possible native crash.

A separate restricted media-processing subprocess may be evaluated later if fuzzing or reliability testing identifies a meaningful need. It is not part of P0.

## 94. Panic policy

Expected operational failures must return `Result`, not panic.

Prohibited production patterns include unchecked `unwrap()` or `expect()` on:

- User-provided files.
- Database operations.
- Metadata values.
- IPC payloads.
- Network-independent native resources.
- Audio-device initialization.
- User-configurable settings.

Assertions are acceptable for proven internal invariants, but their failure must be treated as a defect.

A worker panic should be contained at a suitable execution boundary where possible, recorded and reconciled. Do not assume panic containment makes an arbitrary native state safe to continue using.

## 95. Transaction and event invariants

The following ordering is mandatory:

Do not publish `analysis.track.completed` while a database commit is still pending.

Do not publish a successful collection mutation before membership changes have been persisted.

Playback events are the exception to database persistence because playback state is runtime-owned. They must still be emitted only after the playback actor updates its authoritative state.

# Part XX — Architecture decisions

## 96. Architecture Decision Record register

Each ADR should be a separate Markdown file under:

```text
docs/adr/
```

| ADR | Decision | Status |
|---|---|---|
| ADR-001 | Local-first desktop architecture | Accepted |
| ADR-002 | Tauri with Rust and React | Selected, compatibility verification pending |
| ADR-003 | Modular monolith rather than distributed services | Accepted |
| ADR-004 | Three initial Rust core crates | Accepted |
| ADR-005 | SQLite WAL with dedicated writer | Selected |
| ADR-006 | External artifact store for large visualization data | Selected |
| ADR-007 | Streaming audio processing | Accepted |
| ADR-008 | BLAKE3 content-addressed analysis caching | Selected |
| ADR-009 | Durable job scheduling and cooperative cancellation | Accepted |
| ADR-010 | Generated typed IPC bindings | Selected, compatibility verification pending |
| ADR-011 | Versioned acoustic feature registry | Accepted |
| ADR-012 | Exact weighted acoustic similarity | Selected, empirical validation pending |
| ADR-013 | PCA baseline for Atlas generation | Selected, empirical validation pending |
| ADR-014 | Canvas 2D visualization rendering | Selected, benchmark validation pending |
| ADR-015 | No mandatory telemetry or external APIs | Accepted |
| ADR-016 | Read-only original-media policy | Accepted |
| ADR-017 | Licensed demonstration collection | Accepted, asset selection pending |
| ADR-018 | Windows-first development and validation | Approved |
| ADR-019 | Actor-owned playback state | Selected |
| ADR-020 | Many-to-many library source membership | Selected |
| ADR-021 | Full-file content digest for initial cache identity | Selected |
| ADR-022 | Native source authorization through scoped operations | Accepted |
| ADR-023 | Manual release updates initially | Selected |
| ADR-024 | Apache-2.0 licensing | Proposed, owner approval pending |

### ADR template

```markdown
# ADR-XXX: Decision title

## Status

Proposed | Accepted | Superseded | Rejected

## Context

Describe the architectural problem, relevant
constraints and reasons a decision is required.

## Decision

Describe the selected architectural approach.

## Alternatives considered

Document credible alternatives and their trade-offs.

## Consequences

Describe benefits, costs, limitations and risks.

## Validation

Describe the tests, benchmarks or compatibility
checks needed to establish confidence.

## Reconsideration conditions

Describe concrete circumstances that would justify
replacing or revising this decision.
```

Do not create an ADR simply to document every ordinary code-level implementation choice.

Use ADRs for decisions with material architectural consequences.

# Part XXI — Technical feasibility spikes

## 97. Required spikes before broad implementation

The architecture is sufficiently defined to begin scaffolding, but several integration assumptions should be tested before building complete production subsystems.

Each spike must produce minimal working code, documented results and a decision.

| Spike | Question | Required evidence |
|---|---|---|
| SPK-001 | Can the complete Rust/Tauri/React workspace compile on Windows? | Native development window and production build |
| SPK-002 | Do selected media libraries decode all required codec variants? | Supported-format compatibility matrix |
| SPK-003 | Can native playback seek and recover reliably? | Playback prototype and documented limitations |
| SPK-004 | Can IPC transport bounded binary artifacts efficiently? | Measured waveform and spectrogram payload transfer |
| SPK-005 | Can Rust DTOs generate compatible TypeScript contracts? | Generated bindings and contract test |
| SPK-006 | Does bundled SQLite include the required FTS5 support? | Executed initial migration and search test |
| SPK-007 | Can source paths and file identities round-trip on Windows? | Unicode, long-path and reparse-point fixtures |
| SPK-008 | Does streaming DSP achieve a practical throughput baseline? | Measured processing benchmark |
| SPK-009 | Does Canvas handle 10,000 interactive Atlas points? | Frame-time and interaction measurements |
| SPK-010 | Does the proposed installer work in a clean Windows environment? | Installation and runtime dependency verification |
| SPK-011 | Can standards-based loudness be implemented accurately? | Reference fixture comparison |
| SPK-012 | Is reliable tempo estimation feasible within the chosen scope? | Curated rhythmic test results |

### Spike completion rule

A spike is not complete merely because a dependency compiles.

It is complete when the underlying architectural question has been answered with observable evidence.

Failed spikes may lead to dependency substitution, an architectural revision or a narrower product requirement.

# Part XXII — Architecture implementation sequence

## 98. Dependency-aware implementation plan

The detailed task breakdown will be developed in the separate Implementation Plan. The SAD establishes the required architectural ordering.

### Stage A — Foundation

Deliver the workspace, pinned toolchains, base Tauri application, canonical design tokens, CI checks and compatibility spikes.

**Architectural exit condition:** the application builds on Windows, and the principal dependency and native-runtime assumptions are documented.

### Stage B — Persistence and native contracts

Deliver initial schema migration, catalog repositories, application errors, generated IPC types and a basic native bootstrap.

**Architectural exit condition:** the frontend can query authoritative local database state through typed IPC.

### Stage C — Computational vertical slice

Deliver single-file media ingestion, content hashing, streaming decoding, a small validated measurement set, waveform artifacts and an Observatory screen.

**Architectural exit condition:** a real audio file travels through the complete system without synthetic production data.

### Stage D — Library and job execution

Deliver source reconciliation, search, background processing, durable scheduling, cancellation, cache reuse and recovery.

**Architectural exit condition:** repeated imports and application interruption do not corrupt catalog or job state.

### Stage E — Complete core analytical experience

Deliver production feature analyzers, spectrograms, playback, exact similarity, Atlas snapshots and comparison.

**Architectural exit condition:** the approved core exploration workflow operates using validated acoustic data.

### Stage F — Hardening and distribution

Deliver demonstration onboarding, settings, exports, security review, accessibility verification, benchmarks and Windows release packaging.

**Architectural exit condition:** all mandatory PRD and PDS release gates are satisfied.

## 99. The first vertical slice

This is the first implementation milestone that should produce a meaningful application rather than infrastructure alone.

### Required functionality

| Included | Deferred |
|---|---|
| Native application shell | Complete library management |
| Local file picker | Large-directory scheduling |
| Metadata extraction | Complete job recovery |
| Content digest | Advanced cache eviction |
| Streaming decoding | Complete feature registry |
| Validated RMS and peak measurements | Advanced rhythmic estimation |
| Actual waveform envelope | Full spectrogram tiling |
| SQLite persistence | Complete collection management |
| Typed IPC | Atlas and PCA |
| PDS-compliant Observatory | Comparison and discovery |

The vertical slice must cross every major architectural boundary.

Do not spend the first development milestone building all frontend screens with mock data while the actual audio engine remains unverified.

# Part XXIII — Architecture acceptance criteria

## 100. Architecture definition of done

The architecture is considered successfully implemented when the following conditions are verifiable.

- Rust crate dependencies follow the approved directed graph.
- Computational logic is independent of Tauri and React.
- SQLite migrations initialize and upgrade supported catalog versions.
- All production catalog mutations pass through authorized repository operations.
- Native source access is read-only and explicitly authorized.
- Media analysis operates using bounded streaming memory.
- Feature validity is enforced before persistence.
- Analysis caching uses versioned deterministic identity.
- Concurrent source modification cannot silently attach obsolete results.
- Durable jobs survive application interruption.
- Job cancellation, pause and retry semantics are tested.
- Artifact storage handles interrupted filesystem/database commits.
- Playback state has one authoritative native owner.
- Background analysis does not unnecessarily interrupt playback.
- Atlas snapshots preserve coordinates and expose staleness.
- Similarity retrieval uses original normalized feature space.
- Frontend IPC types are generated and verified.
- Production IPC has no unrestricted filesystem, SQL or shell surfaces.
- Frontend fixtures cannot silently replace production failures.
- Local data reset never deletes original audio files.
- The complete core workflow works without an internet connection.
- Windows-native verification and packaging tests pass.
- Performance claims are supported by reproducible benchmarks.
- Required PRD and PDS acceptance criteria remain satisfied.

## 101. Architectural traceability

| Product requirement | Architectural implementation |
|---|---|
| FR-01 Onboarding | Bootstrap, native dialogs, licensed demo service |
| FR-02 Library | Source authorization, catalog repositories, FTS5 |
| FR-03 Audio analysis | Streaming engine and feature registry |
| FR-04 Background runtime | Persistent queue and bounded worker pool |
| FR-05 Observatory | Feature DTOs and binary visualization artifacts |
| FR-06 Sonic Atlas | Versioned normalization, PCA and snapshots |
| FR-07 Comparison | Compatible feature measurements and contribution decomposition |
| FR-08 Playback | Dedicated native playback actor |
| FR-09 Settings | Typed settings, reset and export services |
| Privacy requirements | Local-first persistence and restricted IPC |
| Reliability requirements | Transactions, recovery and content verification |
| Performance requirements | Bounded execution and benchmark instrumentation |
| Accessibility requirements | DOM-based controls and nonvisual alternatives |
| PDS visual system | Canonical tokens and presentation-layer architecture |

# Part XXIV — Coding agent architecture contract

## 102. Mandatory implementation instructions

The following can be committed as an architectural instruction section or incorporated into the repository's `AGENTS.md`.

Writing# SonicMirror — Engineering instructions

## Source of truth

Read the approved PRD, PDS, SAD and relevant architecture decision records before implementing features.

The PRD defines product behavior. The PDS defines visual and interaction behavior. The SAD defines software architecture and system contracts. The Audio Analysis Technical Specification defines mathematical correctness.

Do not silently reinterpret these documents.

## Scope

Implement only the approved core release.

Do not introduce AI providers, Spotify integrations, user accounts, cloud infrastructure, Studio, Identity, Journal or speculative plugin systems.

## Rust architecture

Maintain the dependency direction between `sonic-core`, `sonic-catalog`, `sonic-runtime` and the desktop adapter.

Keep computational code independent of Tauri.

Use streaming media processing, bounded resource allocation, typed errors and explicit numerical validity.

Do not use unchecked panics for expected operational failures.

## Persistence

All durable writes belong behind catalog operations.

Use parameterized SQL and versioned migrations.

Do not modify historical released migrations.

Never modify or delete original imported audio files.

Preserve source identity, analysis provenance, transaction boundaries and cache invalidation semantics.

## Runtime

Use bounded background execution.

Keep CPU-intensive processing outside async command handlers.

Treat the native job coordinator and playback actor as authoritative.

Persist terminal job state before publishing completion notifications.

## Frontend

Use the canonical `tokens.css`.

Follow the PDS exactly.

Do not invent colors, visual effects, data semantics, additional navigation or unsupported features.

Use generated IPC types and the centralized native client.

Use TanStack Query for native-owned data and local presentation state for transient interaction state.

Never replace failed production IPC calls with synthetic data.

## Verification

Every implementation must satisfy the relevant acceptance criteria.

Add unit, integration, numerical or interaction tests appropriate to the change.

Run applicable formatting, linting, type-checking and test commands before declaring work complete.

Do not claim a feature is implemented if its native operation is mocked or unavailable.

## Architecture changes

When the approved architecture is incompatible with verified technical constraints, document the problem, evidence, alternatives and proposed resolution.

Do not bypass a difficult architectural requirement simply to make a demonstration work.

Prefer the smallest correct implementation that satisfies the approved specifications.

# Part XXV — Open decisions and specification status

## 103. Decisions made in this SAD

I have introduced several concrete architecture decisions beyond the approved PRD and PDS.

| Decision | Rationale |
|---|---|
| Many-to-many source membership | Correctly handles overlapping music directories |
| Dedicated SQLite writer | Predictable transaction ownership and reduced contention |
| FTS5 search | Avoids introducing a separate search service |
| Lossless native path storage | Supports Windows path semantics correctly |
| Full-file BLAKE3 digest | Conservative and reproducible initial content identity |
| Shared analysis by content identity | Avoids unnecessary duplicate computation |
| Dedicated playback actor | Prevents playback ownership from fragmenting across screens |
| Snapshot-bound similarity models | Preserves analytical consistency during Atlas exploration |
| Binary visualization transport | Avoids large JSON payloads |
| Multiresolution waveform artifacts | Supports bounded zoom and rendering |
| Immutable artifact publication | Simplifies crash recovery across filesystem/database boundaries |
| Hash-based routing | Simplifies packaged desktop route handling |
| 2 GiB default visualization-cache budget | Establishes an initial bounded-storage policy |
| Native single-instance ownership | Prevents competing job coordinators |
| Manual application updates | Defers unnecessary update infrastructure |
| NSIS installer baseline | Focuses initial packaging on Windows |

These are selected implementation baselines rather than experimentally validated conclusions.

## 104. Remaining technical gates

| Gate | Status |
|---|---|
| Windows-first platform strategy | Confirmed |
| Product and design scope | Approved |
| Rust workspace architecture | Defined |
| Domain and persistence boundaries | Defined |
| Initial SQL migration | Specified, execution testing pending |
| IPC contracts | Specified, binding generation pending |
| Job execution and recovery | Specified |
| Playback ownership | Specified, native compatibility pending |
| Artifact storage | Specified, binary format and transport validation pending |
| Similarity architecture | Specified |
| Exact feature definitions | Next technical specification |
| Exact similarity feature weights | Next technical specification |
| DSP numerical tolerances | Next technical specification |
| Codec compatibility | Pending spike |
| Windows filesystem identity handling | Pending spike |
| WebView2 rendering and IPC behavior | Pending spike |
| Performance budgets | Pending measurement |
| Apache-2.0 licensing | Owner approval pending |
| Application identifier | Proposed |
| Final installer trust configuration | Pending |

### Important limitation

The Rust interfaces, SQL migration, TypeScript contracts and build configurations in this SAD are implementation specifications. I have not compiled them together in your new repository or run the Windows compatibility tests.

The document intentionally defines these remaining gates rather than claiming that architectural decisions are already verified.

In particular, the exact loudness implementation, tempo algorithm, MFCC configuration, spectrogram intensity reference and acoustic feature weighting must not be improvised during development. They belong in the next specification.

# 105. Final architecture summary

SonicMirror's architecture is built around one central idea: a validated native audio engine, surrounded by a reliable local application runtime and a carefully designed visual experience.

There is no artificial separation into services for the sake of architectural complexity. Each subsystem exists because the product has a concrete requirement that justifies it.
