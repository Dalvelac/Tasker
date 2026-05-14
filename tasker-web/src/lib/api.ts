type ApiEnvelope<T> = {
  data: T
}

async function readJson<T>(response: Response, path: string) {
  const text = await response.text()

  if (!text) return {} as T

  const contentType = response.headers.get('content-type') ?? 'unknown content type'
  const trimmedText = text.trim()
  const looksLikeJson = trimmedText.startsWith('{') || trimmedText.startsWith('[')

  if (!contentType.includes('application/json') && !looksLikeJson) {
    throw new Error(`Expected JSON from ${path}, but received ${contentType}.`)
  }

  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Expected JSON from ${path}, but received ${contentType}.`)
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = await readJson<{ error?: string }>(response, path).catch(() => ({ error: 'Request failed' }))
    throw new Error(body.error ?? 'Request failed')
  }

  const body = await readJson<ApiEnvelope<T>>(response, path)
  return body.data
}

export function buildQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const search = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  })

  const query = search.toString()
  return query ? `?${query}` : ''
}
