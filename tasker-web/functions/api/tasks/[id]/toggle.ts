import type { AppContext } from '../../../_shared/db';
import { error, getNumericParam } from '../../../_shared/http';
import { changeTask } from '../../../_shared/taskWrites';

export async function onRequestPatch(context: AppContext) {
  const id = getNumericParam(context.params, 'id');
  return id ? changeTask(context, id, {}, 'toggle') : error('Invalid task id');
}
