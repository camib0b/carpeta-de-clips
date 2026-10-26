-- Telestration for one play inside a compiled clip.
-- One row per drawing. play_id is not unique: a later logged-in account
-- gets its own row. owner_id NULL is the anonymous public drawing.
--
-- There is no login yet. Anyone who can view the team library may read and
-- edit that public row. When accounts exist:
-- 1. resolveAuthor() in lib/clip-drawings.ts returns the session account id.
-- 2. Reads filter to that owner, plus drawings explicitly shared with them.
-- 3. Writes set owner_id from the session and reject edits by anyone else.
--
-- strokes_json is a versioned document ({ "version", "strokes" }). New stroke
-- features (color, layers) bump the version. Old rows stay valid; this client
-- does not rewrite a version it does not understand.
--
-- SQLite UNIQUE treats NULL as distinct, so a plain UNIQUE(play_id, owner_id)
-- would allow many public rows. The partial unique indexes keep one public
-- drawing per play and one drawing per account per play.

CREATE TABLE IF NOT EXISTS clip_drawings (
  id TEXT PRIMARY KEY,
  play_id TEXT NOT NULL,
  owner_id TEXT,
  strokes_json TEXT NOT NULL CHECK (json_valid(strokes_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clip_drawings_play_owner
  ON clip_drawings (play_id, owner_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clip_drawings_public_play
  ON clip_drawings (play_id)
  WHERE owner_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clip_drawings_owner_play
  ON clip_drawings (play_id, owner_id)
  WHERE owner_id IS NOT NULL;
