import { activeSql, requestDay } from '../../_shared/planner';
import { optionalDate } from '../../_shared/validation';
import type { AppContext } from '../../_shared/db';
import { error, json } from '../../_shared/http';

export async function onRequestGet(context: AppContext) {
  const day = requestDay(context.request);
  if (!day) return error('Invalid time zone');
  const today = optionalDate(new URL(context.request.url).searchParams.get('date')) ?? day.today;
  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone: day.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date());

  const [todayTasks, overdueTasks, urgentTasks, progress] = await context.env.DB.batch([
    context.env.DB.prepare(
      `SELECT tasks.*, sections.name AS section_name, sections.color AS section_color
       FROM tasks
       LEFT JOIN sections ON sections.id = tasks.section_id
       WHERE tasks.deleted=0 AND tasks.kind!='note' AND (tasks.status='done' OR (${activeSql})) AND tasks.date = ?
       ORDER BY tasks.start_time IS NULL, tasks.start_time ASC, tasks.id DESC`,
    ).bind(today, today),
    context.env.DB.prepare(
      `SELECT tasks.*, sections.name AS section_name, sections.color AS section_color
       FROM tasks
       LEFT JOIN sections ON sections.id = tasks.section_id
       WHERE tasks.date < ? AND (${activeSql})
       ORDER BY tasks.date ASC, tasks.id DESC`,
    ).bind(today, today),
    context.env.DB.prepare(
      `SELECT tasks.*, sections.name AS section_name, sections.color AS section_color
       FROM tasks
       LEFT JOIN sections ON sections.id = tasks.section_id
       WHERE tasks.priority = 'urgent' AND (${activeSql})
       ORDER BY tasks.date IS NULL, tasks.date ASC, tasks.start_time ASC`,
    ).bind(today),
    context.env.DB.prepare(
      `SELECT
         COUNT(*) AS total,
         COUNT(CASE WHEN status = 'done' THEN 1 END) AS completed
       FROM tasks
       WHERE deleted=0 AND kind!='note' AND (status='done' OR (${activeSql})) AND date = ?`,
    ).bind(today, today),
  ]);

  const nextTask = todayTasks.results.find(
    (task) =>
      typeof task === 'object' &&
      task !== null &&
      'status' in task &&
      'start_time' in task &&
      task.status !== 'done' &&
      typeof task.start_time === 'string' &&
      task.start_time >= clock,
  );

  return json({
    today,
    tasks: todayTasks.results,
    overdue: overdueTasks.results,
    urgent: urgentTasks.results,
    progress: progress.results[0] ?? { total: 0, completed: 0 },
    nextTask: nextTask ?? null,
  });
}
