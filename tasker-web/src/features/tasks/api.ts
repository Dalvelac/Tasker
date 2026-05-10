import { apiRequest, buildQuery } from '../../lib/api'
import type { Task, TaskFilters, TaskInput } from './types'

export function listTasks(filters: TaskFilters = {}) {
  return apiRequest<Task[]>(`/api/tasks${buildQuery(filters)}`)
}

export function createTask(input: TaskInput) {
  return apiRequest<{ id: number }>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateTask(id: number, input: TaskInput) {
  return apiRequest<{ ok: true }>(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteTask(id: number) {
  return apiRequest<{ ok: true }>(`/api/tasks/${id}`, {
    method: 'DELETE',
  })
}

export function toggleTask(id: number) {
  return apiRequest<{ ok: true }>(`/api/tasks/${id}/toggle`, {
    method: 'PATCH',
  })
}
