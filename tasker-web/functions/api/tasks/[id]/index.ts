import type { AppContext, D1Value } from '../../../_shared/db';
import { error, getNumericParam, json, readJson } from '../../../_shared/http';
import {
  isPriority,
  isStatus,
  isTaskType,
  optionalDayPeriod,
  optionalDate,
  optionalInteger,
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
};

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
