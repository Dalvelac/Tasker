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

    const slug = slugify(name);
    if (!slug) return error('Section name must include letters or numbers');
    updates.push('name = ?', 'slug = ?');
    values.push(name, slug);
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
    const value = optionalString(body.icon);
    if (value === undefined) return error('Invalid icon');
    values.push(value);
  }

  if (body.description !== undefined) {
    updates.push('description = ?');
    const value = optionalString(body.description);
    if (value === undefined) return error('Invalid description');
    values.push(value);
  }

  if (updates.length === 0) {
    return error('No section fields to update');
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  try {
    const result = await context.env.DB.prepare(
    `UPDATE sections SET ${updates.join(', ')} WHERE id = ? RETURNING id`,
  )
    .bind(...values)
    .first();
    if (!result) return error('Section not found', 404);
  } catch (cause) {
    if (String(cause).includes('UNIQUE constraint')) return error('A section with this name already exists',409);
    throw cause;
  }

  return json({ ok: true });
}

export async function onRequestDelete(context: AppContext) {
  const id = getNumericParam(context.params, 'id');

  if (!id) {
    return error('Invalid section id');
  }

  const results = await context.env.DB.batch([
    context.env.DB.prepare(
      `UPDATE tasks
       SET section_id = NULL, revision=revision+1,change_token=NULL, updated_at = CURRENT_TIMESTAMP
       WHERE section_id = ?`,
    ).bind(id),
    context.env.DB.prepare('DELETE FROM sections WHERE id = ? RETURNING id').bind(id),
  ]);
  if (!results[1].results.length) return error('Section not found', 404);

  return json({ ok: true });
}
