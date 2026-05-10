ALTER TABLE tasks ADD COLUMN day_period TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_day_period ON tasks(day_period);
