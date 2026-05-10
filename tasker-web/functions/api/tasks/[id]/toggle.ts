import type { AppContext } from '../../../_shared/db';
import { error, getNumericParam, json } from '../../../_shared/http';

export async function onRequestPatch(context: AppContext) {
  const id = getNumericParam(context.params, 'id');

  if (!id) {
    return error('Invalid task id');
  }

  await context.env.DB.prepare(
    `UPDATE tasks
     SET status = CASE status WHEN 'done' THEN 'pending' ELSE 'done' END,
         completed_at = CASE status WHEN 'done' THEN NULL ELSE CURRENT_TIMESTAMP END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  )
    .bind(id)
    .run();

  return json({ ok: true });
}
