const priorities = ['low', 'normal', 'high', 'urgent'];
const statuses = ['pending', 'in_progress', 'done', 'cancelled', 'postponed'];
const taskTypes = ['task', 'event', 'time_block'];
const dayPeriods = ['morning', 'afternoon', 'night'];

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isPriority(value: unknown): value is string {
  return typeof value === 'string' && priorities.includes(value);
}

export function isStatus(value: unknown): value is string {
  return typeof value === 'string' && statuses.includes(value);
}

export function isTaskType(value: unknown): value is string {
  return typeof value === 'string' && taskTypes.includes(value);
}

export function optionalDayPeriod(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return typeof value === 'string' && dayPeriods.includes(value) ? value : undefined;
}

export function optionalDate(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return undefined;
}

export function optionalTime(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  return undefined;
}

export function optionalString(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  return typeof value === 'string' ? value.trim() : undefined;
}

export function optionalInteger(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numberValue = Number(value);
  return Number.isInteger(numberValue) ? numberValue : undefined;
}
