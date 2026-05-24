ALTER TABLE tasks ADD COLUMN source_path TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_source_path ON tasks(source_path);
