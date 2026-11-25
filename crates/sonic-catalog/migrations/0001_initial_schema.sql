-- 0001_initial_schema.sql
--
-- Vertical-slice subset of the SAD §16 schema. Table and column names match
-- the architecture document; sources, albums, artists, collections, jobs and
-- projections arrive in later migrations.

CREATE TABLE tracks (
    id TEXT PRIMARY KEY NOT NULL,

    path_native BLOB NOT NULL,
    path_display TEXT NOT NULL,
    path_key BLOB NOT NULL UNIQUE,

    content_hash TEXT
        CHECK (content_hash IS NULL OR length(content_hash) = 64),
    size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
    modified_at_ms INTEGER,
    content_revision INTEGER NOT NULL DEFAULT 0
        CHECK (content_revision >= 0),

    title TEXT NOT NULL,
    artist_display TEXT,
    album_display TEXT,
    genre TEXT,
    release_year INTEGER,

    duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
    sample_rate_hz INTEGER CHECK (sample_rate_hz IS NULL OR sample_rate_hz > 0),
    channel_count INTEGER CHECK (channel_count IS NULL OR channel_count > 0),
    codec TEXT,

    availability TEXT NOT NULL
        CHECK (availability IN (
            'available', 'missing', 'inaccessible', 'unsupported', 'corrupt'
        )),
    diagnostic_code TEXT,

    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
);

CREATE INDEX idx_tracks_content_hash ON tracks(content_hash);
CREATE INDEX idx_tracks_title ON tracks(title COLLATE NOCASE, id);
CREATE INDEX idx_tracks_updated ON tracks(updated_at_ms DESC, id);

CREATE TABLE analysis_runs (
    id TEXT PRIMARY KEY NOT NULL,
    cache_key TEXT NOT NULL UNIQUE CHECK (length(cache_key) = 64),
    content_hash TEXT NOT NULL CHECK (length(content_hash) = 64),
    engine_version TEXT NOT NULL,
    feature_schema_version TEXT NOT NULL,
    configuration_hash TEXT NOT NULL,
    configuration_json TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('complete', 'partial', 'failed')),
    diagnostic_code TEXT,
    completed_at_ms INTEGER NOT NULL
);

CREATE INDEX idx_analysis_runs_content ON analysis_runs(content_hash);

CREATE TABLE track_analysis (
    track_id TEXT PRIMARY KEY NOT NULL
        REFERENCES tracks(id) ON DELETE CASCADE,
    analysis_id TEXT NOT NULL
        REFERENCES analysis_runs(id) ON DELETE RESTRICT,
    content_revision INTEGER NOT NULL CHECK (content_revision >= 0),
    attached_at_ms INTEGER NOT NULL
);

CREATE INDEX idx_track_analysis_result ON track_analysis(analysis_id);

CREATE TABLE audio_features (
    analysis_id TEXT NOT NULL
        REFERENCES analysis_runs(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL,
    value_kind TEXT NOT NULL CHECK (value_kind IN ('scalar', 'vector', 'none')),
    scalar_value REAL,
    vector_json TEXT,
    unit TEXT,
    status TEXT NOT NULL CHECK (status IN ('valid', 'unavailable', 'failed')),
    algorithm_version TEXT NOT NULL,
    confidence REAL
        CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
    diagnostic_code TEXT,

    PRIMARY KEY (analysis_id, feature_key),

    -- A value is stored exactly when the feature is valid: never a silent zero.
    CHECK (
        (status = 'valid' AND value_kind <> 'none')
        OR (status <> 'valid' AND value_kind = 'none'
            AND scalar_value IS NULL AND vector_json IS NULL)
    ),
    CHECK (value_kind <> 'scalar' OR (scalar_value IS NOT NULL AND vector_json IS NULL)),
    CHECK (value_kind <> 'vector' OR (vector_json IS NOT NULL AND scalar_value IS NULL))
);

CREATE TABLE analysis_artifacts (
    analysis_id TEXT NOT NULL
        REFERENCES analysis_runs(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('waveform', 'spectrogram')),
    format_version INTEGER NOT NULL CHECK (format_version > 0),
    relative_path TEXT NOT NULL,
    content_hash TEXT NOT NULL CHECK (length(content_hash) = 64),
    size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
    created_at_ms INTEGER NOT NULL,

    PRIMARY KEY (analysis_id, kind)
);
