import type { AppContext } from '../../_shared/db';
import { error, json } from '../../_shared/http';
import { activeSql, requestDay } from '../../_shared/planner';
import { addDays } from '../../_shared/recurrence';

type Completion = { minute: string; n: number };
type SectionStat = {
  section_id: number | null;
  section_name: string | null;
  section_color: string | null;
  completed: number;
  pending: number;
};

export async function onRequestGet(context: AppContext) {
  const day = requestDay(context.request);
  if (!day) return error('Invalid time zone');
  const count = Number(new URL(context.request.url).searchParams.get('days') ?? 180);
  const days = Number.isInteger(count) && count > 0 && count <= 365 ? count : 180;
  const from = addDays(day.today, 1 - days),
    weekFrom = addDays(day.today, -6);
  const [history, sections] = await context.env.DB.batch([
    context.env.DB.prepare(`SELECT substr(completed_at,1,16) AS minute,COUNT(*) AS n FROM tasks
      WHERE deleted=0 AND kind!='note' AND completed_at IS NOT NULL GROUP BY minute`),
    context.env.DB.prepare(
      `SELECT tasks.section_id,sections.name AS section_name,sections.color AS section_color,
      COUNT(tasks.completed_at) AS completed, SUM(CASE WHEN ${activeSql} THEN 1 ELSE 0 END) AS pending
      FROM tasks LEFT JOIN sections ON sections.id=tasks.section_id WHERE tasks.kind!='note' AND tasks.deleted=0
      GROUP BY tasks.section_id ORDER BY completed DESC,pending DESC`,
    ).bind(day.today),
  ]);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: day.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const byDay = new Map<string, number>();
  for (const row of history.results as Completion[]) {
    const instant = new Date(row.minute.replace(' ', 'T') + (row.minute.length === 10 ? 'T00:00' : '') + ':00Z');
    if (!Number.isFinite(instant.getTime())) continue;
    const key = formatter.format(instant);
    byDay.set(key, (byDay.get(key) ?? 0) + row.n);
  }
  let streak = 0;
  for (let key = day.today; byDay.has(key); key = addDays(key, -1)) streak++;
  const allDays = [...byDay].sort(([a], [b]) => a.localeCompare(b));
  const grouped = sections.results as SectionStat[];
  return json({
    range: { from, to: day.today, days },
    heatmap: allDays
      .filter(([d]) => d >= from && d <= day.today)
      .map(([date, completed]) => ({ date, completed })),
    sections: grouped,
    totals: {
      completed_today: byDay.get(day.today) ?? 0,
      completed_week: allDays.reduce((sum, [d, n]) => sum + (d >= weekFrom && d <= day.today ? n : 0), 0),
      pending_total: grouped.reduce((sum, s) => sum + s.pending, 0),
      current_streak: streak,
      top_section: grouped.find((s) => s.completed || s.pending) ?? null,
    },
  });
}
