-- Optional self-hosted clip video on the public R2 bucket `carpeta-clips`.
-- YouTube stays the playback source until a clip has an object key.
--
-- Additive on the existing catalog: each statement is a single ADD COLUMN.
-- Null media columns and visibility's constant default 'public' are filled in
-- by SQLite without rewriting existing rows (169 clips in production).
-- A column CHECK is valid on ALTER TABLE ADD COLUMN in SQLite (D1). It only
-- allows 'public' and 'restricted'.

ALTER TABLE clips ADD COLUMN r2_key TEXT;
ALTER TABLE clips ADD COLUMN r2_key_low TEXT;
ALTER TABLE clips ADD COLUMN fps REAL;
ALTER TABLE clips ADD COLUMN duration_s REAL;
ALTER TABLE clips ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'restricted'));
