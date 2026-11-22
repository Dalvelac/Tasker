-- Run once after 0005 on an existing database, in a single D1 migration.
-- Rebuild both tables so historical and fresh installations enforce the same relationships.
ALTER TABLE sections ADD COLUMN is_vault INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sections ADD COLUMN create_key TEXT;
CREATE UNIQUE INDEX idx_sections_create_key ON sections(create_key);
UPDATE sections SET is_vault=1 WHERE description LIKE 'Imported from Obsidian%' OR EXISTS
  (SELECT 1 FROM tasks WHERE tasks.section_id=sections.id AND source_path IS NOT NULL);
CREATE TABLE task_sequence_backup AS SELECT seq FROM sqlite_sequence WHERE name='tasks';
CREATE TABLE tasks_next (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  notes TEXT,
  source_path TEXT NULL,
  source_path_key TEXT NULL,
  section_id INTEGER NULL,
  date TEXT NULL,
  due_date TEXT NULL,
  start_time TEXT NULL,
  end_time TEXT NULL,
  duration_minutes INTEGER NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  type TEXT NOT NULL DEFAULT 'task',
  is_all_day INTEGER NOT NULL DEFAULT 0,
  day_period TEXT NULL,
  recurrence_rule TEXT NULL,
  recurrence_type TEXT NULL,
  recurrence_interval INTEGER NULL,
  recurrence_days TEXT NULL,
  recurrence_until TEXT NULL,
  parent_task_id INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT NULL,
  kind TEXT NOT NULL DEFAULT 'task' CHECK (kind IN ('task','note','review')),
  linked_note_id INTEGER REFERENCES tasks_next(id) ON DELETE SET NULL,
  spawned_by INTEGER REFERENCES tasks_next(id) ON DELETE SET NULL,
  anchor_day INTEGER,
  revision INTEGER NOT NULL DEFAULT 0,
  change_token TEXT,
  create_key TEXT UNIQUE,
  deleted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_task_id) REFERENCES tasks_next(id) ON DELETE SET NULL
);
INSERT INTO tasks_next (id,title,notes,source_path,source_path_key,section_id,date,due_date,start_time,end_time,duration_minutes,priority,status,type,is_all_day,day_period,recurrence_rule,recurrence_type,recurrence_interval,recurrence_days,recurrence_until,parent_task_id,created_at,updated_at,completed_at,kind)
SELECT id,title,notes,source_path,source_path_key,section_id,date,due_date,start_time,end_time,duration_minutes,priority,status,type,is_all_day,day_period,recurrence_rule,recurrence_type,recurrence_interval,recurrence_days,recurrence_until,parent_task_id,created_at,updated_at,completed_at, CASE
  WHEN source_path IS NOT NULL AND date IS NULL AND due_date IS NULL AND start_time IS NULL
    AND end_time IS NULL AND duration_minutes IS NULL AND day_period IS NULL AND is_all_day=0
    AND status='pending' AND type='task' AND priority='normal' AND completed_at IS NULL
    AND recurrence_type IS NULL AND recurrence_rule IS NULL AND parent_task_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM task_tags WHERE task_id=tasks.id) THEN 'note'
  WHEN source_path IS NOT NULL OR section_id IN (SELECT id FROM sections WHERE is_vault=1) THEN 'review'
  ELSE 'task' END FROM tasks;
CREATE TABLE task_tags_next (
  task_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (task_id, tag_id),
  FOREIGN KEY (task_id) REFERENCES tasks_next(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
INSERT INTO task_tags_next SELECT task_id,tag_id FROM task_tags;
DROP TABLE task_tags;
DROP TABLE tasks;
ALTER TABLE tasks_next RENAME TO tasks;
ALTER TABLE task_tags_next RENAME TO task_tags;
UPDATE sqlite_sequence SET seq=MAX(seq,COALESCE((SELECT seq FROM task_sequence_backup),0)) WHERE name='tasks';
DROP TABLE task_sequence_backup;
CREATE INDEX IF NOT EXISTS idx_sections_slug ON sections(slug);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_section_id ON tasks(section_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);
CREATE INDEX IF NOT EXISTS idx_tasks_day_period ON tasks(day_period);
CREATE INDEX IF NOT EXISTS idx_tasks_source_path ON tasks(source_path);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_section_source_path_key
  ON tasks(section_id, source_path_key)
  WHERE section_id IS NOT NULL AND source_path_key IS NOT NULL;

UPDATE tasks SET anchor_day=CAST(substr(COALESCE((SELECT root.date FROM tasks root WHERE root.id=tasks.parent_task_id),date),9,2) AS INTEGER)
WHERE recurrence_type='monthly' AND date IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_spawned_by ON tasks(spawned_by)
  WHERE spawned_by IS NOT NULL AND deleted = 0;
CREATE INDEX IF NOT EXISTS idx_tasks_kind ON tasks(kind, deleted);
CREATE TABLE IF NOT EXISTS task_changes (
  token TEXT PRIMARY KEY,
  task_id INTEGER NOT NULL,
  before_json TEXT,
  child_id INTEGER,
  undo_attempt TEXT
);

