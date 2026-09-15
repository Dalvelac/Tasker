import assert from 'node:assert/strict'
import test from 'node:test'
import { apiRequest } from '../src/lib/api.ts'

test('empty and HTML failures identify the endpoint, status, and missing backend', async (t) => {
  for (const body of ['', '<html>Server error</html>']) {
    t.mock.method(globalThis, 'fetch', async () => new Response(body, { status: 502 }))
    await assert.rejects(apiRequest('/api/sections', { method: 'POST' }), /POST \/api\/sections \(502\).*backend is running/)
    t.mock.restoreAll()
  }
})

test('preserves backend validation errors', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Title is required' }, { status: 400 }))
  await assert.rejects(apiRequest('/api/tasks', { method: 'POST' }), /POST \/api\/tasks \(400\): Title is required/)
})

test('unwraps successful responses', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ data: { id: 42 } }))
  assert.deepEqual(await apiRequest('/api/sections'), { id: 42 })
})
