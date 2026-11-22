import type { AppContext } from '../../../_shared/db';
import { error, getNumericParam, json, readJson } from '../../../_shared/http';
import { sectionFields, taskJoin } from '../../../_shared/planner';
import { changeTask } from '../../../_shared/taskWrites';
import type { Input } from '../../../_shared/taskModel';

export async function onRequestGet(context: AppContext) {
  const id = getNumericParam(context.params, 'id');
  if (!id) return error('Invalid task id');
  const row = await context.env.DB.prepare(
    'SELECT tasks.*, ' + sectionFields + taskJoin + ' WHERE tasks.id=? AND tasks.deleted=0',
  )
    .bind(id)
    .first();
  return row ? json(row) : error('Task not found', 404);
}
export async function onRequestPatch(context: AppContext) {
  const id = getNumericParam(context.params, 'id');
  return id ? changeTask(context, id, await readJson<Input>(context.request)) : error('Invalid task id');
}
export async function onRequestDelete(context: AppContext) {
  const id = getNumericParam(context.params, 'id');
  return id ? changeTask(context, id, {}, 'delete') : error('Invalid task id');
}
