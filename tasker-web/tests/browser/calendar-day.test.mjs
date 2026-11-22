import assert from 'node:assert/strict'
import test from 'node:test'
import { api, card, visit } from './fixtures.mjs'

test('Today advances at local midnight and a postponed task returns without a reload', async (t) => {
  const page = await visit(t, '#/today', { timezoneId: 'America/Los_Angeles' })
  // On this date the local day turns over at 07:00 UTC.
  await page.clock.install({ time: new Date('2090-06-05T06:59:20Z') })
  const returning = await api(page, 'tasks', 'POST', {
    title: 'Returned at local midnight',
    status: 'postponed',
    date: '2090-06-05',
  })
  const evening = await api(page, 'tasks', 'POST', {
    title: 'Late current block',
    type: 'time_block',
    date: '2090-06-04',
    start_time: '23:40',
    end_time: '23:59',
  })
  const morning = await api(page, 'tasks', 'POST', {
    title: 'Next local appointment',
    date: '2090-06-05',
    start_time: '08:05',
  })
  await page.reload()
  await page.getByRole('heading', { name: 'Today Command Center' }).waitFor()
  await card(page, evening.id).waitFor()
  assert.equal(await card(page, returning.id).count(), 0)
  const active = page
    .locator('.card')
    .filter({ has: page.getByRole('heading', { name: 'Current block', exact: true }) })
  assert.doesNotMatch(await active.innerText(), /Late current block/)
  await page.clock.fastForward('01:00')
  await card(page, returning.id).waitFor()
  await card(page, morning.id).waitFor()
  assert.match(await page.locator('.view-header').innerText(), /08:05 Next local appointment/)
  assert.equal(
    await page
      .locator('.plan-blocks')
      .locator('[data-task-id="' + evening.id + '"]')
      .count(),
    0,
  )
})

test('live recurring completion produces exactly one successor and Undo removes that occurrence', async (t) => {
  const page = await visit(t)
  const root = await api(page, 'tasks', 'POST', {
    title: 'Leap year series',
    date: '2028-01-31',
    recurrence_type: 'monthly',
  })
  const finish = () => api(page, 'tasks/' + root.id, 'PATCH', { status: 'done' })
  const completions = await Promise.all([finish(), finish()])
  const receipt = completions.find((row) => row.undoToken)
  const list = () => api(page, 'tasks?includeDone=true&kind=planner&q=Leap%20year%20series')
  const rows = await list()
  assert.equal(rows.length, 2)
  const child = rows.find((row) => row.parent_task_id === root.id)
  assert.equal(child.date, '2028-02-29')
  await api(page, 'undo/' + receipt.undoToken, 'POST')
  assert.deepEqual(
    (await list()).map((row) => [row.id, row.status]),
    [[root.id, 'pending']],
  )
})
