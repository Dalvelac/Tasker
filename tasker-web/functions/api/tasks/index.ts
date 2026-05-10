import type { AppContext, D1Value } from '../../_shared/db';
import { error, json, readJson } from '../../_shared/http';
import {
  isPriority,
  isStatus,
  isTaskType,
  optionalDate,
  optionalInteger,
  optionalString,
  optionalTime,
} from '../../_shared/validation';

type TaskInput = {
  title?: string;
  notes?: string | null;
  section_id?: number | null;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  duration_minutes?: number | null;
  priority?: string;
  status?: string;
  type?: string;
  is_all_day?: boolean | number;
};

const taskSelect = `
  SELECT
    tasks.*,
    sections.name AS section_name,
    sections.slug AS section_slug,
    sections.color AS section_color,
    sections.icon AS section_icon
  FROM tasks
  LEFT JOIN sections ON sections.id = tasks.section_id
`;

export async function onRequestGet(context: AppContext) {
  const url = new URL(context.request.url);
  const filters: string[] = [];
  const values: D1Value[] = [];

  const sectionId = url.searchParams.get('sectionId');
  const status = url.searchParams.get('status');
  const priority = url.searchParams.get('priority');
  const date = url.searchParams.get('date');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const inbox = url.searchParams.get('inbox') === 'true';
  const unscheduled = url.searchParams.get('unscheduled') === 'true';
  const includeDone = url.searchParams.get('includeDone') === 'true';

  if (sectionId) {
    filters.push('tasks.section_id = ?');
    values.push(Number(sectionId));
  }

  if (status && isStatus(status)) {
    filters.push('tasks.status = ?');
    values.push(status);
  }

  if (priority && isPriority(priority)) {
    filters.push('tasks.priority = ?');
    values.push(priority);
  }

  if (date) {
    filters.push('tasks.date = ?');
    values.push(date);
  }

  if (from) {
    filters.push('tasks.date >= ?');
    values.push(from);
  }

  if (to) {
    filters.push('tasks.date <= ?');
    values.push(to);
  }

  if (inbox) {
    filters.push('tasks.section_id IS NULL');
  }

  if (unscheduled) {
    filters.push('tasks.date IS NULL');
  }

  if (!includeDone && !status) {
    filters.push("tasks.status != 'done'");
  }

  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const { results } = await context.env.DB.prepare(
    `${taskSelect}
     ${where}
     ORDER BY
       tasks.date IS NULL,
       tasks.date ASC,
       tasks.start_time IS NULL,
       tasks.start_time ASC,
       CASE tasks.priority
         WHEN 'urgent' THEN 0
         WHEN 'high' THEN 1
         WHEN 'normal' THEN 2
         ELSE 3
       END,
       tasks.id DESC`,
  )
    .bind(...values)
    .all();

  return json(results);
}

export async function onRequestPost(context: AppContext) {
  const body = await readJson<TaskInput>(context.request);
  const title = optionalString(body.title);

  if (!title) {
    return error('Title is required');
  }

  const notes = optionalString(body.notes);
  const sectionId = optionalInteger(body.section_id);
  const date = optionalDate(body.date);
  const startTime = optionalTime(body.start_time);
  const endTime = optionalTime(body.end_time);
  const durationMinutes = optionalInteger(body.duration_minutes);
  const priority = body.priority ?? 'normal';
  const status = body.status ?? 'pending';
  const type = body.type ?? 'task';
  const isAllDay = body.is_all_day ? 1 : 0;

  if (date === undefined) return error('Invalid date');
  if (startTime === undefined) return error('Invalid start time');
  if (endTime === undefined) return error('Invalid end time');
  if (durationMinutes === undefined) return error('Invalid duration');
  if (!isPriority(priority)) return error('Invalid priority');
  if (!isStatus(status)) return error('Invalid status');
  if (!isTaskType(type)) return error('Invalid task type');

  const result = await context.env.DB.prepare(
    `INSERT INTO tasks (
       title, notes, section_id, date, due_date, start_time, end_time,
       duration_minutes, priority, status, type, is_all_day, completed_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'done' THEN CURRENT_TIMESTAMP ELSE NULL END)`,
  )
    .bind(
      title,
      notes,
      sectionId,
      date,
      date,
      startTime,
      endTime,
      durationMinutes,
      priority,
      status,
      type,
      isAllDay,
      status,
    )
    .run();

  return json({ id: result.meta.last_row_id }, { status: 201 });
}
