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

export function addMonthsClamped(dateKey: string, months: number, anchorDay?: number | null) {
  const date = new Date(`${dateKey}T00:00:00`);
  const originalDay = anchorDay ?? date.getDate();

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

export function getNextRecurringDate(task: {
  date: string | null;
  recurrence_type: string | null;
  recurrence_interval: number | null;
  recurrence_days: string | null;
  anchor_day?: number | null;
}) {
  if (!task.date || !task.recurrence_type) {
    return null;
  }

  const interval = task.recurrence_interval && task.recurrence_interval > 0 ? task.recurrence_interval : 1;

  if (task.recurrence_type === 'daily') {
    return addDays(task.date, interval);
  }

  if (task.recurrence_type === 'monthly') {
    return addMonthsClamped(task.date, interval, task.anchor_day);
  }

  if (task.recurrence_type !== 'weekly') {
    return null;
  }

  const current = (getWeekday(task.date) + 6) % 7;
  const selected = parseRecurrenceDays(task.recurrence_days, task.date).map((day) => (day + 6) % 7);
  const later = selected.find((day) => day > current);
  return addDays(task.date, (later ?? 7 * interval + selected[0]) - current);
}
