ALTER TABLE tasks ADD COLUMN source_path_key TEXT NULL;
UPDATE tasks SET source_path_key = lower(source_path) WHERE source_path IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_section_source_path_key
  ON tasks(section_id, source_path_key)
  WHERE section_id IS NOT NULL AND source_path_key IS NOT NULL;
