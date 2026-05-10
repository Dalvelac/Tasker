import type { AppContext } from '../../_shared/db';
import { json } from '../../_shared/http';

type CompletedDay = {
  date: string;
  completed: number;
};

type SectionStat = {
  section_id: number | null;
  section_name: string | null;
  section_color: string | null;
  completed: number;
  pending: number;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function getCurrentStreak(days: CompletedDay[], today: string) {
  const completedByDay = new Map(days.map((day) => [day.date, day.completed]));
  let cursor = today;
  let streak = 0;

  while ((completedByDay.get(cursor) ?? 0) > 0) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export async function onRequestGet(context: AppContext) {
  const url = new URL(context.request.url);
  const days = Number(url.searchParams.get('days') ?? 180);
  const safeDays = Number.isInteger(days) && days > 0 && days <= 365 ? days : 180;
  const today = toDateKey(new Date());
  const from = addDays(today, -(safeDays - 1));
  const weekFrom = addDays(today, -6);

  const [completedDays, sectionStats, totals] = await context.env.DB.batch([
    context.env.DB.prepare(
      `SELECT substr(completed_at, 1, 10) AS date, COUNT(*) AS completed
       FROM tasks
       WHERE completed_at IS NOT NULL AND substr(completed_at, 1, 10) >= ?
       GROUP BY substr(completed_at, 1, 10)
       ORDER BY date ASC`,
    ).bind(from),
    context.env.DB.prepare(
      `SELECT
         tasks.section_id,
         sections.name AS section_name,
         sections.color AS section_color,
         COUNT(CASE WHEN tasks.completed_at IS NOT NULL THEN 1 END) AS completed,
         COUNT(CASE WHEN tasks.status != 'done' THEN 1 END) AS pending
       FROM tasks
       LEFT JOIN sections ON sections.id = tasks.section_id
       GROUP BY tasks.section_id
       ORDER BY completed DESC, pending DESC`,
    ),
    context.env.DB.prepare(
      `SELECT
         COUNT(CASE WHEN completed_at IS NOT NULL AND substr(completed_at, 1, 10) = ? THEN 1 END) AS completed_today,
         COUNT(CASE WHEN completed_at IS NOT NULL AND substr(completed_at, 1, 10) >= ? THEN 1 END) AS completed_week,
         COUNT(CASE WHEN status != 'done' THEN 1 END) AS pending_total
       FROM tasks`,
    ).bind(today, weekFrom),
  ]);

  const daysResult = completedDays.results as CompletedDay[];
  const sectionsResult = sectionStats.results as SectionStat[];
  const topSection = sectionsResult.find((section) => section.completed > 0 || section.pending > 0) ?? null;

  return json({
    range: {
      from,
      to: today,
      days: safeDays,
    },
    heatmap: daysResult,
    sections: sectionsResult,
    totals: {
      ...(totals.results[0] ?? { completed_today: 0, completed_week: 0, pending_total: 0 }),
      current_streak: getCurrentStreak(daysResult, today),
      top_section: topSection,
    },
  });
}
