import type { AppContext, D1Database } from './db';
import { error, json } from './http';
import { requestDay } from './planner';
import { claimLegacyNotePath } from './notePaths';
import { getNextRecurringDate } from './recurrence';
import {
  editableFields,
  snapshotSql,
  taskValues,
  valueFields,
  valuesOf,
  type Input,
  type TaskRow,
  type TaskValues,
} from './taskModel';

function writeFailure(cause: unknown): Response {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (message.includes('UNIQUE constraint'))
    return error('Another record already uses this path or identifier', 409);
  if (message.includes('FOREIGN KEY constraint'))
    return error('The linked section, note or task no longer exists', 409);
  throw cause;
}

export function readTask(db: D1Database, id: number) {
  return db.prepare('SELECT * FROM tasks WHERE id=? AND deleted=0').bind(id).first<TaskRow>();
}

function checkReturnDate(request: Request, row: TaskValues, old?: TaskRow) {
  if (row.status !== 'postponed' || (old?.status === row.status && old.date === row.date)) return;
  const day = requestDay(request);
  if (!day) return error('Invalid time zone');
  if (!row.date || row.date <= day.today) return error('Choose a future return date');
}

async function validateReferences(db: D1Database, row: TaskValues, old?: TaskRow) {
  if (
    row.linked_note_id &&
    row.linked_note_id !== old?.linked_note_id &&
    !(await db
      .prepare("SELECT id FROM tasks WHERE id=? AND kind='note' AND deleted=0")
      .bind(row.linked_note_id)
      .first())
  ) {
    return error('The linked note is unavailable', 409);
  }
  if (row.source_path_key && row.section_id) await claimLegacyNotePath(db, row.section_id, row.source_path_key);
}

export async function insertTask(context: AppContext, input: Input) {
  const db = context.env.DB;
  const key = context.request.headers.get('Idempotency-Key');
  const replay = async () =>
    key
      ? db.prepare('SELECT id, create_key FROM tasks WHERE create_key=?').bind(key).first<{ id: number }>()
      : null;
  const prior = await replay();
  if (prior) return json({ id: prior.id, undoToken: key });
  let row: TaskValues;
  try {
    row = taskValues(input);
  } catch (cause) {
    return error((cause as Error).message);
  }
  const invalid = checkReturnDate(context.request, row) ?? (await validateReferences(db, row));
  if (invalid) return invalid;
  const token = key || crypto.randomUUID();
  const columns = [...valueFields, 'completed_at', 'create_key', 'change_token'];
  const insert = `INSERT INTO tasks (${columns.join(',')}) VALUES (${valueFields.map(() => '?').join(',')},
    CASE WHEN ?='done' THEN CURRENT_TIMESTAMP END,?,?)`;
  const isImport = !!row.source_path_key && row.kind === 'note' && input.create_only !== true;
  const before = db
    .prepare(
      `INSERT INTO task_changes(token,task_id,before_json)
    SELECT ?,id,${snapshotSql} FROM tasks WHERE section_id=? AND source_path_key=? AND kind='note' AND deleted=0`,
    )
    .bind(token, row.section_id, row.source_path_key);
  const upsert = isImport
    ? ` ON CONFLICT(section_id,source_path_key) WHERE section_id IS NOT NULL AND source_path_key IS NOT NULL
    DO UPDATE SET title=excluded.title, notes=excluded.notes, source_path=excluded.source_path,
    revision=tasks.revision+1, change_token=excluded.change_token, updated_at=CURRENT_TIMESTAMP WHERE tasks.kind='note' AND tasks.deleted=0`
    : '';
  try {
    const changes = await db.batch<{ id: number }>([
      ...(isImport ? [before] : []),
      db.prepare(insert + upsert + ' RETURNING id').bind(...valuesOf(row), row.status, key, token),
      db
        .prepare('INSERT OR IGNORE INTO task_changes(token,task_id) SELECT ?,id FROM tasks WHERE change_token=?')
        .bind(token, token),
    ]);
    const result = changes[isImport ? 1 : 0].results[0];
    if (!result) return error('This path belongs to an entry awaiting classification', 409);
    return json({ id: result.id, undoToken: token }, { status: 201 });
  } catch (cause) {
    const record = await replay();
    if (record) return json({ id: record.id, undoToken: key });
    return writeFailure(cause);
  }
}

export async function changeTask(
  context: AppContext,
  id: number,
  input: Input,
  mode: 'patch' | 'toggle' | 'delete' = 'patch',
) {
  const db = context.env.DB;
  const old = await readTask(db, id);
  if (!old) return error('Task not found', 404);
  const expected = context.request.headers.get('If-Match');
  if (expected !== null && expected !== String(old.revision))
    return error('This item changed. Reopen it to review the latest version.', 409);
  if (mode === 'toggle') input = { status: old.status === 'done' ? 'pending' : 'done' };
  if (mode === 'patch' && !editableFields.some((field) => field in input))
    return error('No task fields to update');
  let next: TaskValues = old;
  if (mode !== 'delete') {
    try {
      // Once the return day arrives, ordinary rescheduling should behave like any other pending task.
      if (old.status === 'postponed' && old.date && 'date' in input && !('status' in input)) {
        const day = requestDay(context.request);
        if (!day) return error('Invalid time zone');
        if (old.date <= day.today) input = { ...input, status: 'pending' };
      }
      next = taskValues(input, old);
    } catch (cause) {
      return error((cause as Error).message);
    }
    if (valueFields.every((key) => next[key] === old[key])) return json({ ok: true });
    const invalid = checkReturnDate(context.request, next, old) ?? (await validateReferences(db, next, old));
    if (invalid) return invalid;
  }
  const token = crypto.randomUUID();
  const guard = 'WHERE id=? AND revision=? AND deleted=0';
  const current = [id, old.revision] as const;
  const journal = db
    .prepare(`INSERT INTO task_changes(token,task_id,before_json) SELECT ?,id,${snapshotSql} FROM tasks ${guard}`)
    .bind(token, ...current);
  const stamp = 'revision=revision+1,change_token=?,updated_at=CURRENT_TIMESTAMP';
  const update =
    mode === 'delete'
      ? db
          .prepare(`UPDATE tasks SET deleted=1,source_path_key=NULL,${stamp} ${guard} RETURNING id`)
          .bind(token, ...current)
      : db
          .prepare(
            `UPDATE tasks SET ${valueFields.map((key) => key + '=?').join(',')},
      completed_at=CASE WHEN ?=status THEN completed_at WHEN ?='done' THEN COALESCE(completed_at,CURRENT_TIMESTAMP) END,${stamp} ${guard} RETURNING id`,
          )
          .bind(...valuesOf(next), next.status, next.status, token, ...current);
  const statements = [journal, update];
  const nextDate =
    mode !== 'delete' && next.kind !== 'note' && old.status !== 'done' && next.status === 'done'
      ? getNextRecurringDate(next)
      : null;
  if (nextDate && (!next.recurrence_until || nextDate <= next.recurrence_until)) {
    const root = old.parent_task_id ?? id;
    const child: TaskValues = {
      ...next,
      kind: 'task',
      date: nextDate,
      due_date: nextDate,
      status: 'pending',
      source_path: null,
      source_path_key: null,
    };
    statements.push(
      db
        .prepare(
          `INSERT INTO tasks (${valueFields.join(',')},parent_task_id,spawned_by,recurrence_rule,change_token)
      SELECT ${valueFields.map(() => '?').join(',')},?,?,?,? WHERE EXISTS (SELECT 1 FROM tasks WHERE id=? AND change_token=?)
      AND NOT EXISTS (SELECT 1 FROM tasks WHERE deleted=0 AND (spawned_by=? OR (parent_task_id=? AND date=?)))`,
        )
        .bind(...valuesOf(child), root, id, old.recurrence_rule, token, id, token, id, root, nextDate),
    );
    statements.push(
      db
        .prepare(
          'UPDATE task_changes SET child_id=(SELECT id FROM tasks WHERE spawned_by=? AND change_token=?) WHERE token=?',
        )
        .bind(id, token, token),
    );
  }
  try {
    const batch = await db.batch(statements);
    if (!batch[1].results.length) {
      if (
        expected === null &&
        mode === 'patch' &&
        Object.keys(input).length === 1 &&
        input.status === 'done' &&
        (await readTask(db, id))?.status === 'done'
      )
        return json({ ok: true });
      return error('This item changed while you were editing it. Reopen it and try again.', 409);
    }
    return json({ ok: true, undoToken: token });
  } catch (cause) {
    return writeFailure(cause);
  }
}
