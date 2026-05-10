import type { AppContext, D1Value } from '../../_shared/db';
import { error, json, readJson } from '../../_shared/http';
import { optionalString, slugify } from '../../_shared/validation';

type SectionInput = {
  name?: string;
  color?: string;
  icon?: string | null;
  description?: string | null;
};

export async function onRequestGet(context: AppContext) {
  const { results } = await context.env.DB.prepare(
    `SELECT
       sections.*,
       COUNT(CASE WHEN tasks.status != 'done' THEN 1 END) AS pending_count
     FROM sections
     LEFT JOIN tasks ON tasks.section_id = sections.id
     GROUP BY sections.id
     ORDER BY sections.name ASC`,
  ).all();

  return json(results);
}

export async function onRequestPost(context: AppContext) {
  const body = await readJson<SectionInput>(context.request);
  const name = optionalString(body.name);

  if (!name) {
    return error('Section name is required');
  }

  const color = optionalString(body.color) ?? '#38BDF8';
  const icon = optionalString(body.icon);
  const description = optionalString(body.description);
  const slug = slugify(name);

  if (!slug) {
    return error('Section name must include letters or numbers');
  }

  const values: D1Value[] = [name, slug, color, icon, description];
  const result = await context.env.DB.prepare(
    `INSERT INTO sections (name, slug, color, icon, description)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(...values)
    .run();

  return json({ id: result.meta.last_row_id }, { status: 201 });
}
