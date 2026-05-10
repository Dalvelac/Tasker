import type { AppContext } from '../../_shared/db';
import { json } from '../../_shared/http';

export async function onRequestGet(context: AppContext) {
  const today = new URL(context.request.url).searchParams.get('date') ?? new Date().toISOString().slice(0, 10);

  const [todayTasks, overdueTasks, urgentTasks, progress] = await context.env.DB.batch([
    context.env.DB.prepare(
      `SELECT tasks.*, sections.name AS section_name, sections.color AS section_color
       FROM tasks
       LEFT JOIN sections ON sections.id = tasks.section_id
       WHERE tasks.date = ?
       ORDER BY tasks.start_time IS NULL, tasks.start_time ASC, tasks.id DESC`,
    ).bind(today),
    context.env.DB.prepare(
      `SELECT tasks.*, sections.name AS section_name, sections.color AS section_color
       FROM tasks
       LEFT JOIN sections ON sections.id = tasks.section_id
       WHERE tasks.date < ? AND tasks.status != 'done'
       ORDER BY tasks.date ASC, tasks.id DESC`,
    ).bind(today),
    context.env.DB.prepare(
      `SELECT tasks.*, sections.name AS section_name, sections.color AS section_color
       FROM tasks
       LEFT JOIN sections ON sections.id = tasks.section_id
       WHERE tasks.priority = 'urgent' AND tasks.status != 'done'
       ORDER BY tasks.date IS NULL, tasks.date ASC, tasks.start_time ASC`,
    ),
    context.env.DB.prepare(
      `SELECT
         COUNT(*) AS total,
         COUNT(CASE WHEN status = 'done' THEN 1 END) AS completed
       FROM tasks
       WHERE date = ?`,
    ).bind(today),
  ]);

  const nextTask = todayTasks.results.find(
    (task) =>
      typeof task === 'object' &&
      task !== null &&
      'status' in task &&
      'start_time' in task &&
      task.status !== 'done' &&
      Boolean(task.start_time),
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
