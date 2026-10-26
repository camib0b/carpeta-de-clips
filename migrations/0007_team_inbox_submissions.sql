-- Private team folder inbox. One row per form submission.
-- Video bytes live in the R2 media bucket under inbox/<date>-<team>-<suffix>/.
-- Nothing here sends mail: the Worker has no email binding.

CREATE TABLE IF NOT EXISTS team_inbox_submissions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  team_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  external_link TEXT,
  object_prefix TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'received', 'abandoned')),
  client_address TEXT NOT NULL,
  file_manifest_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_team_inbox_submissions_client_created
  ON team_inbox_submissions (client_address, created_at);
