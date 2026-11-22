import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { chromium } from 'playwright'

const cwd = fileURLToPath(new URL('../../', import.meta.url))
const cli = join(cwd, 'node_modules/wrangler/bin/wrangler.js')
let directory, server, browser, baseURL
async function freePort() {
  const socket = createServer()
  socket.listen(0, '127.0.0.1')
  await once(socket, 'listening')
  const { port } = socket.address()
  await new Promise((resolve) => socket.close(resolve))
  return port
}
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'tasker-browser-'))
  const env = {
    ...process.env,
    WRANGLER_SEND_METRICS: 'false',
    WRANGLER_LOG_PATH: join(directory, 'wrangler.log'),
  }
  const state = ['--persist-to', directory]
  await promisify(execFile)(
    process.execPath,
    [cli, 'd1', 'execute', 'tasker-db', '--local', ...state, '--file=schema.sql'],
    { cwd, env },
  )
  const port = await freePort()
  baseURL = 'http://127.0.0.1:' + port
  server = spawn(
    process.execPath,
    [
      cli,
      'pages',
      'dev',
      'dist',
      '--ip',
      '127.0.0.1',
      '--port',
      String(port),
      '--inspector-port',
      String(await freePort()),
      ...state,
    ],
    { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  let log = ''
  for (const pipe of [server.stdout, server.stderr])
    pipe.on('data', (chunk) => {
      log = (log + chunk).slice(-10000)
    })
  const deadline = Date.now() + 25000
  while (true) {
    if (server.exitCode !== null || Date.now() > deadline) throw new Error('Local Pages did not start. ' + log)
    if (
      await fetch(baseURL + '/api/sections')
        .then((response) => response.ok)
        .catch(() => false)
    )
      break
    await delay(100)
  }
  browser = await chromium.launch()
})
after(async () => {
  await browser?.close()
  if (server && server.exitCode === null && !server.signalCode) {
    const closed = once(server, 'exit')
    server.kill('SIGTERM')
    await closed
  }
  if (directory) await rm(directory, { recursive: true, force: true })
})
export async function visit(t, hash = '', options = {}) {
  const context = await browser.newContext({
    baseURL,
    timezoneId: 'UTC',
    viewport: { width: 1280, height: 900 },
    ...options,
  })
  const errors = []
  t.after(async () => {
    await context.close()
    assert.deepEqual(errors, [], 'Unexpected page errors')
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  page.setDefaultTimeout(5000)
  await page.route(/^https:\/\//, (route) => route.abort())
  await page.goto('/' + hash)
  return page
}
export async function api(page, path, method = 'GET', data) {
  const response = await page.request.fetch('/api/' + path, { method, data })
  const body = await response.json()
  assert.ok(response.ok(), method + ' ' + path + ': ' + JSON.stringify(body))
  return body.data
}
export function card(page, id) {
  return page.locator('[data-task-id="' + id + '"]')
}
export async function until(read, check) {
  const end = Date.now() + 5000
  while (true) {
    const result = await read()
    if (check(result)) return result
    if (Date.now() > end) assert.fail('Condition timed out. Last value: ' + JSON.stringify(result))
    await delay(60)
  }
}
export const unavailable = {
  status: 503,
  contentType: 'application/json',
  body: JSON.stringify({ error: 'Temporarily unavailable' }),
}
