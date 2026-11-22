import assert from 'node:assert/strict'
import test from 'node:test'
import { api, until, visit } from './fixtures.mjs'

test('full-text search opens a deep-linked note and keyboard dialogs keep and restore focus', async (t) => {
  const page = await visit(t, '#/inbox')
  const folder = await api(page, 'sections', 'POST', { name: 'Search notes', is_vault: true })
  const phrase = 'hidden orchard'
  const created = await api(page, 'tasks', 'POST', {
    title: 'Field journal',
    source_path: 'Field.md',
    section_id: folder.id,
    notes: 'walking '.repeat(90) + phrase,
  })
  const opener = page.getByRole('button', { name: 'Search', exact: true })
  await opener.click()
  const modal = page.getByRole('dialog', { name: 'Search tasks and notes' })
  const input = modal.getByRole('textbox')
  await input.fill(phrase)
  const link = modal.getByRole('link', { name: /Field journal/ })
  await link.waitFor()
  assert.match(await link.innerText(), /hidden orchard/)
  await input.press('Enter')
  await page.waitForURL('**/#/obsidian?note=' + created.id)
  await page.getByRole('button', { name: 'Edit note' }).waitFor()
  await opener.focus()
  await page.keyboard.press('?')
  const help = page.getByRole('dialog', { name: 'Keyboard shortcuts' })
  await help.waitFor()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  assert.ok(await help.evaluate((dialog) => dialog.contains(document.activeElement)))
  await page.keyboard.press('Escape')
  await help.waitFor({ state: 'hidden' })
  assert.ok(await opener.evaluate((button) => button === document.activeElement))
})

for (const width of [320, 390])
  test('touch calendar fits ' + width + 'px and creates on the selected date', async (t) => {
    const page = await visit(t, '#/calendar?month=2027-03', {
      viewport: { width, height: 810 },
      isMobile: true,
      hasTouch: true,
    })
    const day = page.getByRole('button', { name: '2027-03-14', exact: true })
    await day.waitFor()
    const geometry = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('.calendar-day')]
        .slice(0, 8)
        .map((el) => el.getBoundingClientRect())
      return {
        width: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
        xs: cells.slice(0, 7).map((r) => Math.round(r.x)),
        right: cells[6].right,
        sameY: cells[0].y === cells[6].y,
        wraps: cells[7].y > cells[0].y,
      }
    })
    assert.equal(geometry.viewport, width)
    assert.ok(geometry.width <= width && geometry.right <= width, JSON.stringify(geometry))
    assert.equal(new Set(geometry.xs).size, 7)
    assert.ok(geometry.sameY && geometry.wraps)
    await day.tap()
    assert.equal(await day.getAttribute('aria-pressed'), 'true')
    const form = page.locator('form')
    const title = 'Mobile calendar ' + width
    await form.getByLabel('Title').fill(title)
    assert.equal(await form.getByLabel('Date').inputValue(), '2027-03-14')
    await form.getByRole('button', { name: 'Add task' }).tap()
    await page.getByRole('link', { name: title }).waitFor()
    const [record] = await until(
      () => api(page, 'tasks?includeDone=true&q=' + encodeURIComponent(title)),
      (rows) => rows.length === 1,
    )
    assert.equal(record.date, '2027-03-14')
    await page.getByRole('button', { name: 'Menu', exact: true }).tap()
    await page.getByRole('link', { name: /Inbox$/ }).tap()
    await page.waitForURL('**/#/inbox')
  })

test('planner startup and title edits use summaries and load vault bodies on demand', async (t) => {
  const page = await visit(t, '#/inbox')
  const section = await api(page, 'sections', 'POST', { name: 'Large vault', is_vault: true })
  const longBody = 'a long Markdown paragraph. '.repeat(4500) + 'unique ending'
  const note = await api(page, 'tasks', 'POST', {
    title: 'Long reference',
    notes: longBody,
    source_path: 'Large.md',
    section_id: section.id,
  })
  const task = await api(page, 'tasks', 'POST', { title: 'Lightweight capture' })
  const requests = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (request.method() === 'GET' && url.pathname.startsWith('/api/')) requests.push(url.pathname + url.search)
  })
  await page.reload()
  const row = page.locator('[data-task-id="' + task.id + '"]')
  await row.getByRole('button', { name: 'Edit', exact: true }).click()
  await row.getByLabel('Title', { exact: true }).fill('Lightweight revision')
  assert.ok(requests.some((url) => url.includes('kind=planner') && url.includes('summary=true')))
  assert.ok(requests.every((url) => !url.includes('kind=vault') && !url.startsWith('/api/stats/')))
  requests.length = 0
  await row.getByRole('button', { name: 'Save details' }).click()
  await row.getByRole('link', { name: 'Lightweight revision' }).waitFor()
  assert.ok(requests.some((url) => url.includes('summary=true') && url.includes('kind=planner')))
  assert.ok(requests.every((url) => url.startsWith('/api/tasks?')))
  const vaultRequests = []
  page.on('response', (response) => {
    if (response.url().includes('kind=vault')) vaultRequests.push(response)
  })
  await page.goto('/#/obsidian?note=' + note.id)
  await page.getByRole('button', { name: 'Edit note' }).click()
  assert.equal(await page.getByRole('textbox', { name: 'Markdown', exact: true }).inputValue(), longBody)
  const body = await vaultRequests[0].json()
  assert.ok(body.data.every((row) => (row.notes?.length ?? 0) <= 140))
  assert.ok(requests.includes('/api/tasks/' + note.id))
})
