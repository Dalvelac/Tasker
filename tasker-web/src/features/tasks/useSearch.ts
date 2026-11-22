import { useEffect, useState } from 'react'
import { listTasks } from './api'
import type { Task } from './types'

export function useSearch(query: string, sectionId?: number | null) {
  const [response, setResponse] = useState<{
    query: string
    sectionId?: number | null
    rows: Task[]
    error?: string
  } | null>(null)
  useEffect(() => {
    if (!query.trim()) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      listTasks(
        {
          q: query,
          summary: true,
          includeDone: true,
          kind: sectionId === undefined ? undefined : 'vault',
          sectionId: sectionId ?? undefined,
          inbox: sectionId === null,
        },
        controller.signal,
      )
        .then((rows) => {
          if (!controller.signal.aborted) setResponse({ query, sectionId, rows })
        })
        .catch((cause) => {
          if (!controller.signal.aborted) setResponse({ query, sectionId, rows: [], error: String(cause) })
        })
    }, 140)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, sectionId])
  return response?.query === query && response.sectionId === sectionId ? response : null
}
