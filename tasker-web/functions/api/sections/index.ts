import type { AppContext, D1Value } from '../../_shared/db';
import { error, json, readJson } from '../../_shared/http';
import { optionalString, slugify } from '../../_shared/validation';

import { activeSql, requestDay } from '../../_shared/planner';

type SectionInput = {
  is_vault?: boolean;
  requestKey?: string;
  name?: string;
  color?: string;
  icon?: string | null;
  description?: string | null;
};

export async function onRequestGet(context: AppContext) {
  const day = requestDay(context.request);
  if (!day) return error('Invalid time zone');
  const { results } = await context.env.DB.prepare(
    `SELECT
       sections.*,
       COUNT(CASE WHEN ${activeSql} THEN 1 END) AS pending_count,
       COUNT(CASE WHEN tasks.kind IN ('note','review') AND tasks.deleted=0 THEN 1 END) AS note_count
     FROM sections
     LEFT JOIN tasks ON tasks.section_id = sections.id
     GROUP BY sections.id
     ORDER BY sections.name ASC`,
  )
    .bind(day.today)
    .all();

  return json(results);
}

export async function onRequestPost(context: AppContext) {
  const body = await readJson<SectionInput>(context.request);
  const key = optionalString(body.requestKey);
  if (key === undefined) return error('Invalid request key');
  const replay = () =>
    context.env.DB.prepare('SELECT id,name FROM sections WHERE create_key=?')
      .bind(key)
      .first<{ id: number; name: string }>();
  if (key) {
    const existing = await replay();
    if (existing) return json(existing);
  }
  const name = optionalString(body.name);

  if (!name) {
    return error('Section name is required');
  }

  const color = optionalString(body.color) ?? '#38BDF8';
  const icon = optionalString(body.icon);
  const description = optionalString(body.description);
  if (icon === undefined || description === undefined) return error('Invalid section details');
  const slug = slugify(name);

  if (!slug) {
    return error('Section name must include letters or numbers');
  }

  const conflict = await context.env.DB.prepare('SELECT id FROM sections WHERE slug = ?').bind(slug).first();
  if (conflict) {
    return error('A section with this name already exists', 409);
  }

  const values: D1Value[] = [name, slug, color, icon, description, body.is_vault ? 1 : 0, key];
  const result = await context.env.DB.prepare(
    `INSERT INTO sections (name, slug, color, icon, description,is_vault,create_key)
     VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING RETURNING id,name`,
  )
    .bind(...values)
    .first<{ id: number }>();
  if (!result) {
    const existing = key && (await replay());
    return existing ? json(existing) : error('A section with this name already exists', 409);
  }
  return json(result, { status: 201 });
}
