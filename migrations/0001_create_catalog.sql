-- Catalog schema for carpeta-de-clips.
-- Clip metadata lives in D1; XML blobs stay in R2 (CLIPPED_XML).

CREATE TABLE IF NOT EXISTS libraries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  played_on TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_goals INTEGER,
  away_goals INTEGER,
  shootout_winner TEXT,
  place TEXT,
  division TEXT,
  library_id TEXT NOT NULL REFERENCES libraries(id),
  rival_label TEXT NOT NULL,
  youtube_playlist_id TEXT,
  r2_xml_object_key TEXT,
  UNIQUE (played_on, home_team, away_team, library_id, rival_label)
);

CREATE TABLE IF NOT EXISTS clips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_id TEXT NOT NULL UNIQUE,
  match_id TEXT NOT NULL REFERENCES matches(id),
  title TEXT NOT NULL,
  game_concept TEXT NOT NULL,
  uploaded_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clips_match_id ON clips (match_id);
CREATE INDEX IF NOT EXISTS idx_clips_uploaded_at ON clips (uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_library_played_on ON matches (library_id, played_on DESC);
