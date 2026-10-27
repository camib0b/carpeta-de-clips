-- Canonical field hockey teams and name aliases (matches.home_team / away_team strings).
-- Seeded in 0010_seed_teams.sql from the approved teams draft CSV.

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL UNIQUE,
  club TEXT,
  short_code TEXT,
  home_kit TEXT,
  away_kit TEXT,
  kit_note TEXT
);

CREATE TABLE IF NOT EXISTS team_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  alias_normalized TEXT NOT NULL UNIQUE,
  confidence TEXT NOT NULL DEFAULT 'high' CHECK (confidence IN ('high', 'low'))
);

CREATE INDEX IF NOT EXISTS idx_team_aliases_team_id ON team_aliases (team_id);
