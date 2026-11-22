import type { AppContext, D1Value } from '../../_shared/db';
import { error, json, readJson } from '../../_shared/http';
import { activeSql, requestDay, sectionFields, taskJoin } from '../../_shared/planner';
import { insertTask } from '../../_shared/taskWrites';
import { valueFields, type Input } from '../../_shared/taskModel';
import { isPriority, isStatus, optionalDate, optionalInteger } from '../../_shared/validation';

export async function onRequestGet(context: AppContext) {
  const params = new URL(context.request.url).searchParams;
  const day = requestDay(context.request);
  if (!day) return error('Invalid time zone');
  const filters = ['tasks.deleted=0'];
  const values: D1Value[] = [];
  const section = optionalInteger(params.get('sectionId'));
  if (section === undefined) return error('Invalid section');
  if (section !== null) {
    filters.push('tasks.section_id=?');
    values.push(section);
  }
  const status = params.get('status'),
    priority = params.get('priority');
  if (status) {
    if (!isStatus(status)) return error('Invalid status');
    filters.push("CASE WHEN tasks.status='postponed' AND tasks.date<=? THEN 'pending' ELSE tasks.status END=?");
    values.push(day.today, status);
  } else if (params.get('includeDone') !== 'true') {
    filters.push(activeSql);
    values.push(day.today);
  }
  if (priority) {
    if (!isPriority(priority)) return error('Invalid priority');
    filters.push('tasks.priority=?');
    values.push(priority);
  }
  for (const [key, op] of [
    ['date', '='],
    ['from', '>='],
    ['to', '<='],
  ]) {
    const date = optionalDate(params.get(key));
    if (date === undefined) return error('Invalid date');
    if (date) {
      filters.push('tasks.date' + op + '?');
      values.push(date);
    }
  }
  if (params.get('inbox') === 'true') filters.push('tasks.section_id IS NULL');
  if (params.get('unscheduled') === 'true') filters.push('tasks.date IS NULL');
  const kind = params.get('kind');
  if (kind === 'planner') filters.push("tasks.kind!='note'");
  if (kind === 'vault') filters.push("tasks.kind!='task'");
  const search = params.get('q')?.trim();
  if (search) {
    filters.push(
      "instr(lower(tasks.title || ' ' || coalesce(tasks.notes,'') || ' ' || coalesce(tasks.source_path,'') || ' ' || coalesce(sections.name,'') || ' ' || tasks.priority || ' ' || tasks.status),lower(?)) > 0",
    );
    values.push(search);
  }
  const summary = params.get('summary') === 'true';
  const columns = summary
    ? [
        ...valueFields.filter((key) => key !== 'notes').map((key) => 'tasks.' + key),
        'tasks.id',
        'tasks.created_at',
        'tasks.updated_at',
        'tasks.completed_at',
        'tasks.parent_task_id',
        'tasks.recurrence_rule',
        'tasks.revision',
        'substr(tasks.notes,1,140) AS notes',
        "length(coalesce(tasks.notes,''))>140 AS truncated",
      ].join(',')
    : 'tasks.*';
  const sql =
    'SELECT ' +
    columns +
    ',' +
    sectionFields +
    taskJoin +
    ' WHERE ' +
    filters.join(' AND ') +
    `
    ORDER BY tasks.date IS NULL,tasks.date,tasks.start_time IS NULL,tasks.start_time,
    CASE tasks.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,tasks.id DESC`;
  const { results } = await context.env.DB.prepare(sql + (params.has('q') ? ' LIMIT 40' : ''))
    .bind(...values)
    .all();
  return json(results);
}
export async function onRequestPost(context: AppContext) {
  return insertTask(context, await readJson<Input>(context.request));
}
