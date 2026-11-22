import { useCallback, useEffect, useRef, useState } from 'react'

export function useResource<T>(load: () => Promise<T>, enabled = true) {
  const [value, setValue] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const latest = useRef<symbol | null>(null)
  const refresh = useCallback(async () => {
    const request = Symbol()
    latest.current = request
    try {
      const result = await load()
      if (latest.current === request) {
        setValue(result)
        setError(null)
      }
    } catch (cause) {
      if (latest.current === request)
        setError(cause instanceof Error ? cause.message : 'Could not load this information')
    }
  }, [load])
  useEffect(() => {
    let active = true
    if (enabled)
      queueMicrotask(() => {
        if (active) void refresh()
      })
    return () => {
      active = false
      latest.current = null
    }
  }, [enabled, refresh])
  return { value, error, refresh }
}
