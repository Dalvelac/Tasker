import { valueFields } from './taskModel';
import { optionalDate } from './validation';

export function zoneDay(timestamp: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    timestamp,
  );
}

export function requestDay(request: Request) {
  const params = new URL(request.url).searchParams;
  const timeZone = params.get('timeZone') || request.headers.get('X-Tasker-Time-Zone') || 'UTC';
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

const publicFields = [...valueFields.filter(field => !['notes','anchor_day','source_path_key'].includes(field)),
  'id','created_at','updated_at','completed_at','parent_task_id','recurrence_rule','revision'].map(field => 'tasks.' + field);

// Search matches can occur far beyond the ordinary card preview.
export function taskColumns(summary = false, search = false) {
  const body = search ? "substr(tasks.notes,max(1,instr(lower(tasks.notes),lower(?))-35),140)" : "substr(tasks.notes,1,140)";
  return [...publicFields, ...(summary ? [body + ' AS notes', "length(coalesce(tasks.notes,''))>140 AS truncated"] : ['tasks.notes'])].join(',');
}
