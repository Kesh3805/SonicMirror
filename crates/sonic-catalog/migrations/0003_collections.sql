-- 0003_collections.sql
--
-- Logical user collections (SAD §16, PRD LIB-011/012). Membership only:
-- deleting a collection or removing a track from one never touches the
-- track row or its source file. Deleting a track removes its memberships.

CREATE TABLE collections (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
);

CREATE INDEX idx_collections_name ON collections(name COLLATE NOCASE, id);

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

CREATE INDEX idx_collection_items_track ON collection_items(track_id);
