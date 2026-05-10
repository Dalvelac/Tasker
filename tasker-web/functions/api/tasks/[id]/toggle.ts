import type { AppContext } from '../../../_shared/db';
import { error, getNumericParam, json } from '../../../_shared/http';
import { createNextRecurringInstance, type RecurringTask } from '../../../_shared/recurrence';

export async function onRequestPatch(context: AppContext) {
  const id = getNumericParam(context.params, 'id');

  if (!id) {
    return error('Invalid task id');
  }

  const task = await context.env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
    .bind(id)
    .first<RecurringTask>();

  if (!task) {
    return error('Task not found', 404);
  }

  const isReopening = task.status === 'done';

  await context.env.DB.prepare(
    `UPDATE tasks
     SET status = CASE status WHEN 'done' THEN 'pending' ELSE 'done' END,
         completed_at = CASE status WHEN 'done' THEN NULL ELSE CURRENT_TIMESTAMP END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  )
    .bind(id)
    .run();

  if (!isReopening) {
    await createNextRecurringInstance(context, task);
  }

  return json({ ok: true });
}
