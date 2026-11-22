import { optionalDate } from './validation';

export function zoneDay(timestamp: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    timestamp,
  );
}

export function requestDay(request: Request) {
  const params = new URL(request.url).searchParams;
  const timeZone = params.get('timeZone') || 'UTC';
  try {
    const today = zoneDay(new Date(), timeZone);
    return { timeZone, today: optionalDate(params.get('today')) || today };
  } catch {
    return null;
  }
}

export const activeSql = `tasks.kind != 'note' AND tasks.deleted = 0 AND
  (tasks.status IN ('pending','in_progress') OR (tasks.status = 'postponed' AND tasks.date <= ?))`;

export const taskJoin = ' FROM tasks LEFT JOIN sections ON sections.id = tasks.section_id ';
export const sectionFields =
  'sections.name AS section_name, sections.slug AS section_slug, sections.color AS section_color, sections.icon AS section_icon';
