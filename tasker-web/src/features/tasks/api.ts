import { apiRequest, buildQuery } from '../../lib/api'
import type { Task, TaskFilters, TaskInput } from './types'

export type Mutation = { ok?: boolean; undoToken?: string }
export function listTasks(filters: TaskFilters = {}, signal?: AbortSignal) {
  return apiRequest<Task[]>(
    '/api/tasks' + buildQuery({ ...filters, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    { signal },
  )
}
export function getTask(id: number, signal?: AbortSignal) {
  return apiRequest<Task>('/api/tasks/' + id, { signal })
}
export function createTask(input: TaskInput) {
  const { requestKey, ...body } = input
  return apiRequest<Mutation & { id: number }>('/api/tasks', {
    method: 'POST',
    headers: requestKey ? { 'Idempotency-Key': requestKey } : undefined,
    body: JSON.stringify(body),
  })
}
export function updateTask(id: number, input: TaskInput) {
  const { expectedRevision, ...body } = input
  return apiRequest<Mutation>('/api/tasks/' + id, {
    method: 'PATCH',
    headers: expectedRevision === undefined ? undefined : { 'If-Match': String(expectedRevision) },
    body: JSON.stringify(body),
  })
}
export function deleteTask(id: number, revision?: number) {
  return apiRequest<Mutation>('/api/tasks/' + id, {
    method: 'DELETE',
    headers: revision === undefined ? undefined : { 'If-Match': String(revision) },
  })
}
export function undoChange(token: string) {
  return apiRequest<Mutation>('/api/undo/' + encodeURIComponent(token), { method: 'POST' })
}
