import type { AppContext, D1Value } from '../../../_shared/db';
import { error, getNumericParam, json, readJson } from '../../../_shared/http';
import { optionalString, slugify } from '../../../_shared/validation';

type SectionInput = {
  name?: string;
  color?: string;
  icon?: string | null;
  description?: string | null;
};

export async function onRequestPatch(context: AppContext) {
  const id = getNumericParam(context.params, 'id');

  if (!id) {
    return error('Invalid section id');
  }

  const body = await readJson<SectionInput>(context.request);
  const updates: string[] = [];
  const values: D1Value[] = [];

  if (body.name !== undefined) {
    const name = optionalString(body.name);

    if (!name) {
      return error('Section name is required');
    }

    updates.push('name = ?', 'slug = ?');
    values.push(name, slugify(name));
  }

  if (body.color !== undefined) {
    const color = optionalString(body.color);

    if (!color) {
      return error('Section color is required');
    }

    updates.push('color = ?');
    values.push(color);
  }

  if (body.icon !== undefined) {
    updates.push('icon = ?');
    values.push(optionalString(body.icon));
  }

  if (body.description !== undefined) {
    updates.push('description = ?');
    values.push(optionalString(body.description));
  }

  if (updates.length === 0) {
    return error('No section fields to update');
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  await context.env.DB.prepare(`UPDATE sections SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return json({ ok: true });
}

export async function onRequestDelete(context: AppContext) {
  const id = getNumericParam(context.params, 'id');

  if (!id) {
    return error('Invalid section id');
  }

  await context.env.DB.batch([
    context.env.DB.prepare(
      `UPDATE tasks
       SET section_id = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE section_id = ?`,
    ).bind(id),
    context.env.DB.prepare('DELETE FROM sections WHERE id = ?').bind(id),
  ]);

  return json({ ok: true });
}
