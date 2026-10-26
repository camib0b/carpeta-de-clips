-- Optional self-hosted JPEG/WebP thumbnail for library cards (`carpeta-clips` bucket).
-- Generated from the clip MP4; cards prefer this over YouTube mqdefault.

ALTER TABLE clips ADD COLUMN thumb_key TEXT;
