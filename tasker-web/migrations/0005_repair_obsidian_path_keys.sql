-- Also repairs databases that already ran the original 0004 backfill, including
-- those where its index creation failed. Only derived keys are reset; note IDs,
-- paths, contents, timestamps and relationships are unchanged.
UPDATE tasks SET source_path_key = NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_section_source_path_key
  ON tasks(section_id, source_path_key)
  WHERE section_id IS NOT NULL AND source_path_key IS NOT NULL;
