CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  notes TEXT,
  source_path TEXT NULL,
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
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT
);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (task_id, tag_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sections_slug ON sections(slug);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_section_id ON tasks(section_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);
CREATE INDEX IF NOT EXISTS idx_tasks_day_period ON tasks(day_period);
CREATE INDEX IF NOT EXISTS idx_tasks_source_path ON tasks(source_path);

INSERT OR IGNORE INTO sections (name, slug, color, icon, description) VALUES
  ('Universidad', 'universidad', '#60A5FA', 'graduation-cap', 'Clases, entregas y estudio.'),
  ('Cybersecurity', 'cybersecurity', '#A78BFA', 'shield', 'Labs, CTFs y aprendizaje de seguridad.'),
  ('Gym', 'gym', '#22C55E', 'activity', 'Entrenamientos y rutinas.'),
  ('Personal', 'personal', '#F472B6', 'user', 'Vida personal y recados.'),
  ('Trabajo', 'trabajo', '#F59E0B', 'briefcase', 'Trabajo y responsabilidades profesionales.'),
  ('Proyectos', 'proyectos', '#38BDF8', 'code', 'Proyectos personales y builds.'),
  ('Erasmus', 'erasmus', '#FB7185', 'plane', 'Tramites y preparacion Erasmus.'),
  ('Salud', 'salud', '#34D399', 'heart-pulse', 'Salud, citas y bienestar.'),
  ('Finanzas', 'finanzas', '#FACC15', 'wallet', 'Gastos, pagos y finanzas.');
