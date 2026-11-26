-- 0002_atlas_snapshots.sql
--
-- Saved Atlas projections (SAD §16, §44). A snapshot freezes coordinates and
-- the analysis each point came from; it is never rewritten, only superseded.
-- `input_digest` fingerprints the whole catalog input so a later state can be
-- recognised as stale. `model_json` holds the principal axes shown in the
-- legend. Columns for catalog revisions and stored normalization arrive with
-- the job coordinator.

CREATE TABLE atlas_snapshots (
    id TEXT PRIMARY KEY NOT NULL,

    feature_schema_version TEXT NOT NULL,
    algorithm_version TEXT NOT NULL,
    input_digest TEXT NOT NULL CHECK (length(input_digest) = 64),

    model_json TEXT NOT NULL,

    eligible_count INTEGER NOT NULL
        CHECK (eligible_count >= 0),

    excluded_count INTEGER NOT NULL
        CHECK (excluded_count >= 0),

    created_at_ms INTEGER NOT NULL
);

CREATE INDEX idx_atlas_snapshots_created ON atlas_snapshots(created_at_ms DESC, id DESC);

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

CREATE INDEX idx_atlas_points_track ON atlas_points(track_id);
