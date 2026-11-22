import assert from 'node:assert/strict'
import test from 'node:test'
import { planner } from './support/plannerHarness.ts'
import { loadFunction } from './support/functionHarness.ts'
import { isActionable } from '../shared/planner.ts'
import type { AppContext } from '../functions/_shared/db.ts'
const overview = loadFunction<{ onRequestGet: (context: AppContext) => Promise<Response> }>(
  'functions/api/stats/overview.ts',
).onRequestGet
const today = loadFunction<{ onRequestGet: (context: AppContext) => Promise<Response> }>(
  'functions/api/dashboard/today.ts',
).onRequestGet
const sections = loadFunction<{ onRequestGet: (context: AppContext) => Promise<Response> }>(
  'functions/api/sections/index.ts',
).onRequestGet

test('local completion days cover DST and the streak is independent of the heatmap window', async (t) => {
  const h = planner(t)
  const put = h.sql.prepare("INSERT INTO tasks(title,status,completed_at) VALUES('Finished','done',?)")
  for (let day = 0; day < 160; day++) {
    const date = new Date(Date.UTC(2026, 10, 1 - day, 18))
    put.run(date.toISOString().slice(0, 19).replace('T', ' '))
  }
  put.run('2026-11-02 07:30:00') // Still Nov 1 in Los Angeles after the fall transition.
  const get = async (zone: string) =>
    (
      await (
        await overview({
          env: h.env,
          request: new Request('https://test/api/stats/overview?days=7&today=2026-11-01&timeZone=' + zone),
        })
      ).json()
    ).data
  const local = await get('America/Los_Angeles')
  assert.equal(local.totals.current_streak, 160)
  assert.equal(local.totals.completed_today, 2)
  assert.equal(local.totals.completed_week, 8)
  assert.equal(local.heatmap.length, 7)
  assert.equal((await get('UTC')).totals.completed_today, 1)
  assert.equal(
    (await overview({ env: h.env, request: new Request('https://test/api/stats/overview?timeZone=Invalid') }))
      .status,
    400,
  )
})
test('planner queues, section counts and summaries agree about notes, cancellation and return dates', async (t) => {
  const h = planner(t)
  const data = [
    { kind: 'task', status: 'cancelled', date: '2026-10-03' },
    { kind: 'task', status: 'postponed', date: '2026-11-02' },
    { kind: 'task', status: 'postponed', date: '2026-11-01' },
    { kind: 'task', status: 'postponed', date: null },
    { kind: 'note', status: 'pending', date: null },
    { kind: 'review', status: 'in_progress', date: '2026-10-10' },
  ]
  for (const row of data)
    h.sql
      .prepare("INSERT INTO tasks(title,section_id,kind,status,date,priority) VALUES('Entry',1,?,?,?,'urgent')")
      .run(row.kind, row.status, row.date)
  const request = new Request('https://test/api/test?today=2026-11-01&date=2026-11-01')
  const ctx = { env: h.env, request }
  assert.equal(data.filter((row) => isActionable(row, '2026-11-01')).length, 2)
  assert.equal((await (await overview(ctx)).json()).data.totals.pending_total, 2)
  assert.equal((await (await sections(ctx)).json()).data.find((s: { id: number }) => s.id === 1).pending_count, 2)
  const dashboard = (await (await today(ctx)).json()).data
  assert.equal(dashboard.overdue.length, 1)
  assert.equal(dashboard.urgent.length, 2)
  assert.equal(dashboard.tasks.length, 1)
})

test('search matches full Markdown, returns a short matching excerpt and reserves undo tokens for writers', async (t) => {
  const h = planner(t)
  const get = loadFunction<{ onRequestGet: (ctx: AppContext) => Promise<Response> }>(
    'functions/api/tasks/index.ts',
  ).onRequestGet
  const body = 'chapter '.repeat(80) + 'orchard marker ' + 'end '.repeat(60)
  const { id } = (await (await h.create({ title: 'Travel', notes: body }, 'private-write-token')).json()).data
  async function rows(query: string) {
    return (await (await get({ env: h.env, request: new Request('https://test/api/tasks' + query) })).json()).data
  }
  const [summary] = await rows('?summary=true&q=orchard')
  assert.equal(summary.id, id)
  assert.equal(summary.truncated, 1)
  assert.match(summary.notes, /orchard/)
  assert.ok(summary.notes.length <= 140)
  const [detail] = await rows('')
  assert.equal(detail.notes, body)
  for (const item of [summary, detail]) {
    assert.equal(item.create_key, undefined)
    assert.equal(item.change_token, undefined)
  }
})
