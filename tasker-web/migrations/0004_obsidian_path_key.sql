ALTER TABLE tasks ADD COLUMN source_path_key TEXT NULL;
-- Leave legacy keys NULL. The API claims paths using JavaScript Unicode
-- normalization and preserves historical duplicates instead of deleting them.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_section_source_path_key
  ON tasks(section_id, source_path_key)
  WHERE section_id IS NOT NULL AND source_path_key IS NOT NULL;
