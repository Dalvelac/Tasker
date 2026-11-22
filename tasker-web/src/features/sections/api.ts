import { apiRequest } from '../../lib/api'
import type { Section, SectionInput } from './types'

export function listSections() {
  return apiRequest<Section[]>(
    '/api/sections?timeZone=' + encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone),
  )
}

export function createSection(input: SectionInput) {
  return apiRequest<{ id: number; name?: string }>('/api/sections', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateSection(id: number, input: Partial<SectionInput>) {
  return apiRequest<{ ok: true }>(`/api/sections/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteSection(id: number) {
  return apiRequest<{ ok: true }>(`/api/sections/${id}`, {
    method: 'DELETE',
  })
}
