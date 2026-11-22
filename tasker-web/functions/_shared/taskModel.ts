import { getWeekday } from './recurrence';
import {
  isPriority,
  isStatus,
  isTaskType,
  optionalDate,
  optionalDayPeriod,
  optionalInteger,
  optionalRecurrenceDays,
  optionalRecurrenceType,
  optionalString,
  optionalTime,
} from './validation';
import type { D1Value } from './db';
import { notePathKey } from './notePaths';

export type TaskValues = {
  title: string;
  notes: string | null;
  source_path: string | null;
  source_path_key: string | null;
  section_id: number | null;
  date: string | null;
  due_date: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  priority: string;
  status: string;
  type: string;
  is_all_day: number;
  day_period: string | null;
  recurrence_type: string | null;
  recurrence_interval: number | null;
  recurrence_days: string | null;
  recurrence_until: string | null;
  kind: string;
  linked_note_id: number | null;
  anchor_day: number | null;
};
export type TaskRow = TaskValues & {
  id: number;
  revision: number;
  deleted: number;
  change_token: string | null;
  parent_task_id: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  spawned_by: number | null;
  recurrence_rule: string | null;
};

export const valueFields = [
  'title',
  'notes',
  'source_path',
  'source_path_key',
  'section_id',
  'date',
  'due_date',
  'start_time',
  'end_time',
  'duration_minutes',
  'priority',
  'status',
  'type',
  'is_all_day',
  'day_period',
  'recurrence_type',
  'recurrence_interval',
  'recurrence_days',
  'recurrence_until',
  'kind',
  'linked_note_id',
  'anchor_day',
] as const;
export const editableFields = valueFields.filter(
  (key) => !['source_path_key', 'due_date', 'anchor_day'].includes(key),
);
export const snapshotFields = [
  ...valueFields,
  'parent_task_id',
  'completed_at',
  'spawned_by',
  'recurrence_rule',
  'change_token',
  'deleted',
] as const;
export const snapshotSql = 'json_object(' + snapshotFields.map((key) => "'" + key + "'," + key).join(',') + ')';

export type Input = Record<string, unknown>;
function minutes(time: string) {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
}
function periodFor(time: string | null) {
  if (!time) return null;
  const hour = Number(time.slice(0, 2));
  return hour >= 6 && hour < 12 ? 'morning' : hour >= 12 && hour < 21 ? 'afternoon' : 'night';
}

export function taskValues(input: Input, old?: TaskRow): TaskValues {
  const raw = { ...old, ...input };
  const title = optionalString(raw.title);
  if (!title) throw new Error('Title is required');
  const notes = raw.notes ?? null;
  if (typeof notes !== 'string' && notes !== null) throw new Error('Invalid notes');
  const source = optionalString(raw.source_path);
  const section = optionalInteger(raw.section_id);
  if (source === undefined || section === undefined || (section !== null && section <= 0))
    throw new Error('Invalid note path or section');
  const date = optionalDate(raw.date);
  const start = optionalTime(raw.start_time);
  const end = optionalTime(raw.end_time);
  if (date === undefined) throw new Error('Invalid calendar date');
  if (start === undefined || end === undefined) throw new Error('Invalid clock time');
  let duration = optionalInteger(raw.duration_minutes);
  if (duration === undefined || (duration !== null && duration < 0)) throw new Error('Invalid duration');
  if (start && end) {
    const span = minutes(end) - minutes(start);
    if (!old || start !== old.start_time || end !== old.end_time || 'duration_minutes' in input) duration = span;
    if (span <= 0) throw new Error('End time must be after start time');
  }
  const priority = raw.priority ?? 'normal',
    status = raw.status ?? 'pending',
    type = raw.type ?? 'task';
  if (!isPriority(priority) || !isStatus(status) || !isTaskType(type))
    throw new Error('Invalid priority, status or task type');
  if (type === 'time_block' && (!start || !end)) throw new Error('Time blocks require start and end time');
  if (status === 'postponed' && !date && (old?.status !== status || 'date' in input))
    throw new Error('Choose a return date for this task');
  const period =
    input.day_period === undefined && (!old || 'start_time' in input)
      ? periodFor(start)
      : optionalDayPeriod(raw.day_period);
  if (period === undefined) throw new Error('Invalid day period');
  const repeat = optionalRecurrenceType(raw.recurrence_type);
  const interval = optionalInteger(raw.recurrence_interval ?? 1);
  const until = optionalDate(raw.recurrence_until);
  const days = optionalRecurrenceDays(raw.recurrence_days);
  if (repeat === undefined || days === undefined || until === undefined || (repeat && (!interval || interval < 1)))
    throw new Error('Invalid recurrence');
  const kind = raw.kind ?? (source ? 'note' : 'task');
  if (kind !== 'note' && kind !== 'review' && kind !== 'task') throw new Error('Invalid record kind');
  const linked = optionalInteger(raw.linked_note_id);
  if (linked === undefined || (linked !== null && linked <= 0)) throw new Error('Invalid linked note');
  const key = source && kind !== 'task' ? notePathKey(source) : null;
  const unchangedLegacy =
    old?.source_path_key === null &&
    old.section_id === section &&
    old.source_path &&
    key === notePathKey(old.source_path);
  const anchor =
    repeat === 'monthly' && date
      ? ((old?.recurrence_type === 'monthly' && old.date === date ? old.anchor_day : null) ??
        Number(date.slice(8)))
      : null;
  return {
    title,
    notes,
    source_path: source,
    source_path_key: unchangedLegacy ? null : key,
    section_id: section,
    date,
    due_date: old && !('date' in input) ? old.due_date : date,
    start_time: start,
    end_time: end,
    duration_minutes: duration,
    priority,
    status,
    type,
    is_all_day: raw.is_all_day ? 1 : 0,
    day_period: period,
    recurrence_type: repeat,
    recurrence_interval: repeat ? interval! : null,
    recurrence_days: repeat === 'weekly' ? (days ?? (date ? String(getWeekday(date)) : null)) : null,
    recurrence_until: repeat ? until : null,
    kind,
    linked_note_id: linked,
    anchor_day: anchor,
  };
}

export function valuesOf(row: TaskValues): D1Value[] {
  return valueFields.map((key) => row[key]);
}
