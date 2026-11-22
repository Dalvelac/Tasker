import assert from 'node:assert/strict'
import test from 'node:test'
import { api, card, unavailable, until, visit } from './fixtures.mjs'

test('a failed capture preserves its draft and retry key, and a failed refresh cannot duplicate a saved task', async (t) => {
  const page = await visit(t, '#/dashboard')
  await page.route('**/api/stats/overview?*', (route) => route.fulfill(unavailable))
  await page.reload()
  await page.getByRole('button', { name: 'Retry statistics' }).waitFor()
  const keys = []
  let failRefresh = false
  await page.route(/\/api\/tasks(?:\?.*)?$/, async (route) => {
    const request = route.request()
    if (request.method() === 'POST') {
      keys.push(request.headers()['idempotency-key'])
      if (keys.length === 1) {
        // D1 commits, but the browser never receives that successful response.
        assert.ok((await route.fetch()).ok())
        return route.fulfill(unavailable)
      }
      failRefresh = true
    } else if (failRefresh) return route.fulfill(unavailable)
    await route.continue()
  })
  const opener = page.getByRole('button', { name: 'Quick add', exact: true })
  await opener.click()
  const modal = page.getByRole('dialog', { name: 'Quick add task' })
  const title = modal.getByLabel('Title')
  await title.fill('Capture retry test')
  const save = modal.getByRole('button', { name: 'Add task' })
  await save.click()
  await modal.getByRole('alert').waitFor()
  assert.equal(await title.inputValue(), 'Capture retry test')
  assert.ok(await save.isEnabled())
  await save.click()
  await modal.waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: 'Retry tasks' }).waitFor()
  assert.ok(keys[0])
  assert.deepEqual(keys, [keys[0], keys[0]])
  failRefresh = false
  await page.getByRole('button', { name: 'Retry tasks' }).click()
  await page.getByRole('link', { name: /Inbox$/ }).click()
  const task = page.getByRole('article').filter({ hasText: 'Capture retry test' })
  await task.waitFor()
  const id = Number(await task.getAttribute('data-task-id'))
  await task.getByRole('button', { name: 'Delete' }).click()
  await task.waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: 'Undo delete Capture retry test' }).click()
  await card(page, id).waitFor()
  await page.getByRole('button', { name: 'Undo create Capture retry test' }).click()
  await task.waitFor({ state: 'hidden' })
  assert.equal((await api(page, 'tasks?q=Capture%20retry%20test&includeDone=true')).length, 0)
})

test('editing a completed task preserves Markdown and completion history and a stale editor keeps the unsaved title', async (t) => {
  const page = await visit(t)
  const notes = '    indented code  \n\n'
  const { id } = await api(page, 'tasks', 'POST', {
    title: 'Finished draft',
    status: 'done',
    notes,
    date: new Date().toISOString().slice(0, 10),
  })
  const before = await api(page, 'tasks/' + id)
  await page.goto('/#/today')
  await page.reload()
  const row = card(page, id)
  await row.getByRole('button', { name: 'Edit', exact: true }).click()
  await row.getByLabel('Title', { exact: true }).fill('Renamed finished draft')
  await row.getByRole('button', { name: 'Save details' }).click()
  await row.getByRole('link', { name: 'Renamed finished draft' }).waitFor()
  const updated = await api(page, 'tasks/' + id)
  assert.equal(updated.status, 'done')
  assert.equal(updated.completed_at, before.completed_at)
  assert.equal(updated.notes, notes)
  await row.getByRole('button', { name: 'Edit', exact: true }).click()
  await row.getByLabel('Title', { exact: true }).fill('Keep my draft')
  await api(page, 'tasks/' + id, 'PATCH', { title: 'Changed in another tab' })
  await row.getByRole('button', { name: 'Save details' }).click()
  await row.getByRole('alert').waitFor()
  assert.equal(await row.getByLabel('Title', { exact: true }).inputValue(), 'Keep my draft')
  assert.equal((await api(page, 'tasks/' + id)).title, 'Changed in another tab')
})

test('planning into a period leaves work untimed and moving a timed block asks before changing its schedule', async (t) => {
  const page = await visit(t)
  const { id } = await api(page, 'tasks', 'POST', { title: 'Flexible estimate', duration_minutes: 45 })
  const block = await api(page, 'tasks', 'POST', {
    title: 'Timed meeting',
    type: 'time_block',
    date: new Date().toISOString().slice(0, 10),
    start_time: '08:00',
    end_time: '08:30',
  })
  await page.goto('/#/plan')
  await page.reload()
  const region = (id) => page.locator('.plan-draggable').filter({ has: card(page, id) })
  await region(id).getByRole('button', { name: 'Afternoon', exact: true }).click()
  const flexible = await until(
    () => api(page, 'tasks/' + id),
    (r) => r.day_period === 'afternoon',
  )
  assert.equal(flexible.start_time, null)
  assert.equal(flexible.end_time, null)
  assert.equal(flexible.duration_minutes, 45)
  await region(block.id).getByRole('button', { name: 'Night', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Move timed work' })
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  assert.equal((await api(page, 'tasks/' + block.id)).start_time, '08:00')
  await region(block.id).getByRole('button', { name: 'Night', exact: true }).click()
  await dialog.getByRole('button', { name: 'Move as untimed work' }).click()
  const moved = await until(
    () => api(page, 'tasks/' + block.id),
    (r) => r.day_period === 'night',
  )
  assert.equal(moved.type, 'task')
  assert.equal(moved.start_time, null)
  assert.equal(moved.duration_minutes, 30)
  await region(block.id).getByRole('button', { name: 'Move to Unscheduled' }).click()
  const loose = await until(
    () => api(page, 'tasks/' + block.id),
    (r) => r.date === null,
  )
  assert.equal(loose.day_period, null)
})
