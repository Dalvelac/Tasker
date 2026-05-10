import type { AppContext } from './db';

export type RecurringTask = {
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

const weekdaysMondayFirst = [1, 2, 3, 4, 5, 6, 0];

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeekday(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).getDay();
}

export function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function addMonthsClamped(dateKey: string, months: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  const originalDay = date.getDate();

  date.setDate(1);
  date.setMonth(date.getMonth() + months);

  const lastDayOfTargetMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(originalDay, lastDayOfTargetMonth));

  return toDateKey(date);
}

function parseRecurrenceDays(recurrenceDays: string | null, fallbackDate: string) {
  if (!recurrenceDays) {
    return [getWeekday(fallbackDate)];
  }

  const selected = recurrenceDays.split(',').map(Number);
  return weekdaysMondayFirst.filter((day) => selected.includes(day));
}

export function getNextRecurringDate(task: Pick<RecurringTask, 'date' | 'recurrence_type' | 'recurrence_interval' | 'recurrence_days'>) {
  if (!task.date || !task.recurrence_type) {
    return null;
  }

  const interval = task.recurrence_interval && task.recurrence_interval > 0 ? task.recurrence_interval : 1;

  if (task.recurrence_type === 'daily') {
    return addDays(task.date, interval);
  }

  if (task.recurrence_type === 'monthly') {
    return addMonthsClamped(task.date, interval);
  }

  if (task.recurrence_type !== 'weekly') {
    return null;
  }

  const currentWeekday = getWeekday(task.date);
  const selectedDays = parseRecurrenceDays(task.recurrence_days, task.date);
  const nextSameWeekDay = selectedDays.find((day) => {
    const dayDistance = day - currentWeekday;
    return dayDistance > 0;
  });

  if (nextSameWeekDay !== undefined) {
    return addDays(task.date, nextSameWeekDay - currentWeekday);
  }

  const firstSelectedDay = selectedDays[0];
  const daysUntilNextWeek = 7 - currentWeekday + firstSelectedDay;

  // Weekly intervals advance only after the last selected day in the current recurrence week.
  // Example: Fri on Mon/Wed/Fri every 2 weeks jumps 10 days to the Monday two weeks later.
  return addDays(task.date, daysUntilNextWeek + (interval - 1) * 7);
}

export async function createNextRecurringInstance(context: AppContext, task: RecurringTask) {
  const nextDate = getNextRecurringDate(task);
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
      task.recurrence_interval && task.recurrence_interval > 0 ? task.recurrence_interval : 1,
      task.recurrence_days,
      task.recurrence_until,
      parentTaskId,
    )
    .run();
}
