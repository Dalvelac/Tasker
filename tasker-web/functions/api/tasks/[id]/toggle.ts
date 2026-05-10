import type { AppContext } from '../../../_shared/db';
import { error, getNumericParam, json } from '../../../_shared/http';

type RecurringTask = {
  id: number;
  title: string;
  notes: string | null;
  section_id: number | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  priority: string;
  status: string;
  type: string;
  is_all_day: number;
  day_period: string | null;
  recurrence_rule: string | null;
  recurrence_type: string | null;
  recurrence_interval: number | null;
  recurrence_days: string | null;
  recurrence_until: string | null;
  parent_task_id: number | null;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNextDate(dateKey: string, recurrenceType: string, interval: number) {
  const date = new Date(`${dateKey}T00:00:00`);

  if (recurrenceType === 'daily') {
    date.setDate(date.getDate() + interval);
  } else if (recurrenceType === 'weekly') {
    date.setDate(date.getDate() + interval * 7);
  } else if (recurrenceType === 'monthly') {
    const originalDay = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + interval);
    const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(originalDay, lastDayOfMonth));
  } else {
    return null;
  }

  return toDateKey(date);
}

async function createNextRecurringInstance(context: AppContext, task: RecurringTask) {
  if (!task.date || !task.recurrence_type) {
    return;
  }

  const interval = task.recurrence_interval && task.recurrence_interval > 0 ? task.recurrence_interval : 1;
  const nextDate = getNextDate(task.date, task.recurrence_type, interval);
  const parentTaskId = task.parent_task_id ?? task.id;

  if (!nextDate || (task.recurrence_until && nextDate > task.recurrence_until)) {
    return;
  }

  const existing = await context.env.DB.prepare(
    'SELECT id FROM tasks WHERE parent_task_id = ? AND date = ? LIMIT 1',
  )
    .bind(parentTaskId, nextDate)
    .first<{ id: number }>();

  if (existing) {
    return;
  }

  await context.env.DB.prepare(
    `INSERT INTO tasks (
       title, notes, section_id, date, due_date, start_time, end_time,
       duration_minutes, priority, status, type, is_all_day, day_period,
       recurrence_rule, recurrence_type, recurrence_interval, recurrence_days,
       recurrence_until, parent_task_id
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      task.title,
      task.notes,
      task.section_id,
      nextDate,
      nextDate,
      task.start_time,
      task.end_time,
      task.duration_minutes,
      task.priority,
      task.type,
      task.is_all_day,
      task.day_period,
      task.recurrence_rule,
      task.recurrence_type,
      interval,
      task.recurrence_days,
      task.recurrence_until,
      parentTaskId,
    )
    .run();
}

export async function onRequestPatch(context: AppContext) {
  const id = getNumericParam(context.params, 'id');

  if (!id) {
    return error('Invalid task id');
  }

  const task = await context.env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
    .bind(id)
    .first<RecurringTask>();

  if (!task) {
    return error('Task not found', 404);
  }

  const isReopening = task.status === 'done';

  await context.env.DB.prepare(
    `UPDATE tasks
     SET status = CASE status WHEN 'done' THEN 'pending' ELSE 'done' END,
         completed_at = CASE status WHEN 'done' THEN NULL ELSE CURRENT_TIMESTAMP END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  )
    .bind(id)
    .run();

  if (!isReopening) {
    await createNextRecurringInstance(context, task);
  }

  return json({ ok: true });
}
