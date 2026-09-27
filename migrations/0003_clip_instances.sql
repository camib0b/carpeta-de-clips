-- Per-play segments inside a compiled YouTube clip (AVA sidecar timeline).
CREATE TABLE IF NOT EXISTS clip_instances (
  clip_id         INTEGER NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  ord             INTEGER NOT NULL,
  offset_s        REAL    NOT NULL,
  duration_s      REAL    NOT NULL,
  quarter         TEXT,
  score_label     TEXT,
  xml_instance_id INTEGER,
  PRIMARY KEY (clip_id, ord)
);

CREATE INDEX IF NOT EXISTS idx_clip_instances_clip_id ON clip_instances (clip_id);
