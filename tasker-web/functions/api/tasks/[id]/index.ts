import type { AppContext, D1Value } from '../../../_shared/db';
import { error, getNumericParam, json, readJson } from '../../../_shared/http';
import {
  isPriority,
  isStatus,
  isTaskType,
  optionalDayPeriod,
  optionalDate,
  optionalInteger,
  optionalRecurrenceType,
  optionalString,
  optionalTime,
} from '../../../_shared/validation';

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
  day_period?: string | null;
  recurrence_type?: string | null;
  recurrence_interval?: number | null;
  recurrence_until?: string | null;
};

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

function calculateDuration(startTime: string | null, endTime: string | null, duration: number | null) {
  if (!startTime || !endTime) {
    return duration;
  }

  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);

  return minutes > 0 ? minutes : undefined;
}

function inferDayPeriodFromTime(startTime: string | null) {
  if (!startTime) {
    return null;
  }

  const [hour] = startTime.split(':').map(Number);

  if (hour >= 6 && hour < 12) {
    return 'morning';
  }

  if (hour >= 12 && hour < 21) {
    return 'afternoon';
  }

  return 'night';
}

function validateTimeBlock(type: string, startTime: string | null, endTime: string | null) {
  return type !== 'time_block' || Boolean(startTime && endTime);
}

export async function onRequestPatch(context: AppContext) {
  const id = getNumericParam(context.params, 'id');

  if (!id) {
    return error('Invalid task id');
  }

  const body = await readJson<TaskInput>(context.request);
  const updates: string[] = [];
  const values: D1Value[] = [];
  let nextStartTime: string | null | undefined;
  let nextEndTime: string | null | undefined;
  let nextDuration: number | null | undefined;
  let nextType: string | undefined;
  let dayPeriodWasExplicit = false;
  let completedExistingTask: RecurringTask | null = null;

  if (body.title !== undefined) {
    const title = optionalString(body.title);
    if (!title) return error('Title is required');
    updates.push('title = ?');
    values.push(title);
  }

  if (body.notes !== undefined) {
    updates.push('notes = ?');
    values.push(optionalString(body.notes));
  }

  if (body.section_id !== undefined) {
    const sectionId = optionalInteger(body.section_id);
    if (sectionId === undefined) return error('Invalid section');
    updates.push('section_id = ?');
    values.push(sectionId);
  }

  if (body.date !== undefined) {
    const date = optionalDate(body.date);
    if (date === undefined) return error('Invalid date');
    updates.push('date = ?', 'due_date = ?');
    values.push(date, date);
  }

  if (body.start_time !== undefined) {
    const startTime = optionalTime(body.start_time);
    if (startTime === undefined) return error('Invalid start time');
    updates.push('start_time = ?');
    values.push(startTime);
    nextStartTime = startTime;
  }

  if (body.end_time !== undefined) {
    const endTime = optionalTime(body.end_time);
    if (endTime === undefined) return error('Invalid end time');
    updates.push('end_time = ?');
    values.push(endTime);
    nextEndTime = endTime;
  }

  if (body.duration_minutes !== undefined) {
    const duration = optionalInteger(body.duration_minutes);
    if (duration === undefined) return error('Invalid duration');
    nextDuration = duration;
  }

  if (nextStartTime !== undefined || nextEndTime !== undefined || nextDuration !== undefined) {
    const existing = await context.env.DB.prepare(
      'SELECT start_time, end_time, duration_minutes FROM tasks WHERE id = ?',
    )
      .bind(id)
      .first<{ start_time: string | null; end_time: string | null; duration_minutes: number | null }>();
    const startTime = nextStartTime !== undefined ? nextStartTime : existing?.start_time ?? null;
    const endTime = nextEndTime !== undefined ? nextEndTime : existing?.end_time ?? null;
    const duration = nextDuration !== undefined ? nextDuration : existing?.duration_minutes ?? null;
    const finalDuration = calculateDuration(startTime, endTime, duration);

    if (finalDuration === undefined) return error('End time must be after start time');

    updates.push('duration_minutes = ?');
    values.push(finalDuration);
  }

  if (body.priority !== undefined) {
    if (!isPriority(body.priority)) return error('Invalid priority');
    updates.push('priority = ?');
    values.push(body.priority);
  }

  if (body.status !== undefined) {
    if (!isStatus(body.status)) return error('Invalid status');
    if (body.status === 'done') {
      completedExistingTask = await context.env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
        .bind(id)
        .first<RecurringTask>();
    }
    updates.push('status = ?', "completed_at = CASE WHEN ? = 'done' THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE NULL END");
    values.push(body.status, body.status);
  }

  if (body.type !== undefined) {
    if (!isTaskType(body.type)) return error('Invalid task type');
    updates.push('type = ?');
    values.push(body.type);
    nextType = body.type;
  }

  if (body.is_all_day !== undefined) {
    updates.push('is_all_day = ?');
    values.push(body.is_all_day ? 1 : 0);
  }

  if (body.day_period !== undefined) {
    dayPeriodWasExplicit = true;
    const dayPeriod = optionalDayPeriod(body.day_period);
    if (dayPeriod === undefined) return error('Invalid day period');
    updates.push('day_period = ?');
    values.push(dayPeriod);
  }

  if (body.start_time !== undefined && !dayPeriodWasExplicit) {
    updates.push('day_period = ?');
    values.push(inferDayPeriodFromTime(nextStartTime ?? null));
  }

  if (body.recurrence_type !== undefined) {
    const recurrenceType = optionalRecurrenceType(body.recurrence_type);
    if (recurrenceType === undefined) return error('Invalid recurrence');
    updates.push('recurrence_type = ?');
    values.push(recurrenceType);

    if (body.recurrence_interval === undefined) {
      updates.push(recurrenceType === null ? 'recurrence_interval = NULL' : 'recurrence_interval = COALESCE(recurrence_interval, 1)');
    }

    if (recurrenceType === null && body.recurrence_until === undefined) updates.push('recurrence_until = NULL');
  }

  if (body.recurrence_interval !== undefined) {
    const recurrenceInterval = optionalInteger(body.recurrence_interval);
    if (recurrenceInterval === undefined || (recurrenceInterval !== null && recurrenceInterval < 1)) {
      return error('Invalid recurrence interval');
    }
    updates.push('recurrence_interval = ?');
    values.push(recurrenceInterval);
  }

  if (body.recurrence_until !== undefined) {
    const recurrenceUntil = optionalDate(body.recurrence_until);
    if (recurrenceUntil === undefined) return error('Invalid recurrence until');
    updates.push('recurrence_until = ?');
    values.push(recurrenceUntil);
  }

  if (updates.length === 0) {
    return error('No task fields to update');
  }

  if (nextType === 'time_block' || nextStartTime !== undefined || nextEndTime !== undefined) {
    const existing = await context.env.DB.prepare(
      'SELECT type, start_time, end_time FROM tasks WHERE id = ?',
    )
      .bind(id)
      .first<{ type: string; start_time: string | null; end_time: string | null }>();
    const type = nextType ?? existing?.type ?? 'task';
    const startTime = nextStartTime !== undefined ? nextStartTime : existing?.start_time ?? null;
    const endTime = nextEndTime !== undefined ? nextEndTime : existing?.end_time ?? null;

    if (!validateTimeBlock(type, startTime, endTime)) return error('Time blocks require start and end time');
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  await context.env.DB.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  if (completedExistingTask && completedExistingTask.status !== 'done') {
    await createNextRecurringInstance(context, completedExistingTask);
  }

  return json({ ok: true });
}

export async function onRequestDelete(context: AppContext) {
  const id = getNumericParam(context.params, 'id');

  if (!id) {
    return error('Invalid task id');
  }

  await context.env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();

  return json({ ok: true });
}
