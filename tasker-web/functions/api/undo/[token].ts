import type { AppContext } from '../../_shared/db';
import { error, json } from '../../_shared/http';
import { snapshotFields, type TaskRow } from '../../_shared/taskModel';

type Receipt = {
  task_id: number;
  before_json: string | null;
  child_id: number | null;
  undo_attempt: string | null;
};

export async function onRequestPost(context: AppContext) {
  const token = context.params?.token ?? '';
  const db = context.env.DB;
  const receipt = await db.prepare('SELECT * FROM task_changes WHERE token=?').bind(token).first<Receipt>();
  if (!receipt) return error('Undo action not found', 404);
  if (receipt.undo_attempt) return json({ ok: true });
  const attempt = crypto.randomUUID();
  const eligible = db
    .prepare(
      `UPDATE task_changes SET undo_attempt=? WHERE token=? AND undo_attempt IS NULL
    AND EXISTS (SELECT 1 FROM tasks WHERE id=task_id AND change_token=?)
    AND (child_id IS NULL OR EXISTS (SELECT 1 FROM tasks WHERE id=child_id AND change_token=? AND deleted=0))
    RETURNING task_id`,
    )
    .bind(attempt, token, token, token);
  const guard = ' WHERE id=? AND EXISTS (SELECT 1 FROM task_changes WHERE token=? AND undo_attempt=?)';
  const params = [receipt.task_id, token, attempt] as const;
  const before: TaskRow | null = receipt.before_json ? JSON.parse(receipt.before_json) : null;
  const restore = before
    ? db
        .prepare(
          'UPDATE tasks SET ' +
            snapshotFields.map((key) => key + '=?').join(',') +
            ',revision=revision+1,updated_at=CURRENT_TIMESTAMP' +
            guard,
        )
        .bind(...snapshotFields.map((key) => before[key]), ...params)
    : db
        .prepare('UPDATE tasks SET deleted=1,source_path_key=NULL,change_token=NULL,revision=revision+1' + guard)
        .bind(...params);
  const statements = [eligible, restore];
  if (receipt.child_id)
    statements.push(
      db
        .prepare('UPDATE tasks SET deleted=1,change_token=NULL,revision=revision+1' + guard)
        .bind(receipt.child_id, token, attempt),
    );
  try {
    const result = await db.batch(statements);
    if (result[0].results.length) return json({ ok: true });
    const replay = await db
      .prepare('SELECT undo_attempt FROM task_changes WHERE token=?')
      .bind(token)
      .first<Receipt>();
    return replay?.undo_attempt
      ? json({ ok: true })
      : error('This item or its next occurrence has changed. Its newer work has been preserved.', 409);
  } catch (cause) {
    if (String(cause).includes('constraint'))
      return error('The original section or file path is no longer available.', 409);
    throw cause;
  }
}
