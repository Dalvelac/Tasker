import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { api, unavailable, until, visit } from './fixtures.mjs'

test('an interrupted import resumes in the same vault and Markdown files only enter the planner when promoted', async (t) => {
  const page = await visit(t, '#/obsidian')
  const files = ['North sample.md', 'South sample.md'].map((name) => ({
    name,
    mimeType: 'text/markdown',
    buffer: Buffer.from('# ' + name + '\n\nBody.'),
  }))
  const writes = []
  await page.route(/\/api\/tasks$/, async (route) => {
    if (route.request().method() === 'POST') {
      writes.push(route.request().postDataJSON().source_path)
      if (writes.length === 2) return route.fulfill(unavailable)
    }
    await route.continue()
  })
  await page.locator('input[type=file]').first().setInputFiles(files)
  const retry = page.getByRole('button', { name: 'Retry remaining files' })
  await retry.waitFor()
  await page.getByText(/1 of 2 saved\. Remaining:/).waitFor()
  await retry.click()
  await page.getByText(/Imported 2 notes into/).waitFor()
  assert.equal(writes.length, 3)
  assert.equal(writes[1], writes[2])
  assert.notEqual(writes[0], writes[2])
  const records = await api(page, 'tasks?kind=vault&includeDone=true&q=sample')
  assert.equal(records.length, 2)
  assert.equal(records[0].section_id, records[1].section_id)
  const vaultId = records[0].section_id
  assert.ok(records.every((row) => row.kind === 'note'))
  const folder = (await api(page, 'sections')).find((s) => s.id === vaultId)
  assert.equal(folder.pending_count, 0)
  assert.equal(folder.note_count, 2)
  await page.goto('/#/obsidian?note=' + records[0].id)
  await page.getByRole('button', { name: 'Create task from note' }).click()
  const promoted = await until(
    () => api(page, 'tasks?kind=planner&includeDone=true&q=sample'),
    (r) => r.length === 1,
  )
  assert.equal(promoted[0].linked_note_id, records[0].id)
  assert.equal((await api(page, 'sections')).find((s) => s.id === vaultId).pending_count, 1)
  await api(page, 'sections/' + vaultId, 'DELETE')
  await page.reload()
  await page.getByRole('button', { name: /Unfiled notes/ }).waitFor()
  assert.equal(await page.getByLabel('Note path', { exact: true }).inputValue(), records[0].source_path)
})

test('Back and Stay preserve the vault history, drafts recover on reload, and Save or Discard handles both path and body', async (t) => {
  const page = await visit(t, '#/inbox')
  const folder = await api(page, 'sections', 'POST', { name: 'Editing room', is_vault: true })
  const record = await api(page, 'tasks', 'POST', {
    title: 'Draft guard',
    source_path: 'Guard.md',
    notes: 'Old text',
    section_id: folder.id,
  })
  await page.getByRole('link', { name: /Obsidian Import$/ }).click()
  await page.getByRole('button', { name: /Editing room/ }).click()
  await page.getByRole('button', { name: /Guard\.md/ }).click()
  const url = page.url()
  await page.getByRole('button', { name: 'Edit note' }).click()
  const body = page.getByRole('textbox', { name: 'Markdown', exact: true })
  await body.fill('  Draft text  \n')
  await page.getByLabel('Note path', { exact: true }).fill('sub/Changed.md')
  await page.evaluate(() => history.back())
  const guard = page.getByRole('dialog', { name: 'Unsaved note' })
  await guard.getByRole('button', { name: 'Stay here' }).click()
  await page.waitForURL(url)
  assert.equal(await body.inputValue(), '  Draft text  \n')
  page.once('dialog', (dialog) => dialog.accept())
  await page.reload()
  assert.equal(await body.inputValue(), '  Draft text  \n')
  assert.equal(await page.getByLabel('Note path', { exact: true }).inputValue(), 'sub/Changed.md')
  await page.getByRole('link', { name: /Inbox$/ }).click()
  await guard.getByRole('button', { name: 'Save and continue' }).click()
  await page.waitForURL('**/#/inbox')
  const saved = await api(page, 'tasks/' + record.id)
  assert.equal(saved.notes, '  Draft text  \n')
  assert.equal(saved.source_path, 'sub/Changed.md')
  await page.goBack()
  await page.getByRole('button', { name: 'Edit note' }).click()
  await body.fill('Discard this draft')
  await page.getByRole('link', { name: /Inbox$/ }).click()
  await guard.getByRole('button', { name: 'Discard changes' }).click()
  await page.waitForURL('**/#/inbox')
  assert.equal((await api(page, 'tasks/' + record.id)).notes, saved.notes)
  assert.equal(await page.evaluate((id) => sessionStorage.getItem('tasker.draft.' + id), record.id), null)
})

test('a legacy entry can be classified while retaining its existing task identity and history', async (t) => {
  const page = await visit(t)
  const folder = await api(page, 'sections', 'POST', { name: 'Older imports', is_vault: true })
  const entry = await api(page, 'tasks', 'POST', {
    title: 'Existing done item',
    kind: 'review',
    section_id: folder.id,
    status: 'done',
  })
  const before = await api(page, 'tasks/' + entry.id)
  await page.goto('/#/obsidian?note=' + entry.id)
  await page.getByRole('button', { name: 'Keep as task' }).click()
  const kept = await until(
    () => api(page, 'tasks/' + entry.id),
    (r) => r.kind === 'task',
  )
  assert.equal(kept.completed_at, before.completed_at)
  assert.equal(kept.status, 'done')
})

test('reselecting the same ZIP after reload resumes the interrupted nested vault', async (t) => {
  const page = await visit(t, '#/obsidian')
  const archive = fileURLToPath(new URL('./fixtures/Travel.zip', import.meta.url))
  let count = 0
  await page.route(/\/api\/tasks$/, (route) => {
    if (route.request().method() === 'POST' && ++count === 2) return route.fulfill(unavailable)
    return route.continue()
  })
  await page.locator('input[type=file]').first().setInputFiles(archive)
  await page.getByRole('button', { name: 'Retry remaining files' }).waitFor()
  const [first] = await api(page, 'tasks?kind=vault&includeDone=true&q=Travel')
  assert.ok(first)
  await page.reload()
  await page.locator('input[type=file]').first().setInputFiles(archive)
  await page.getByText(/Imported 2 notes into/).waitFor()
  assert.equal(count, 3)
  const entries = await api(page, 'tasks?kind=vault&includeDone=true&sectionId=' + first.section_id)
  assert.deepEqual(entries.map((r) => r.source_path).sort(), ['Lists/Pack.md', 'Maps/Harbor.md'])
  assert.equal(entries.find((r) => r.source_path.endsWith('Harbor.md')).notes, '    Preserve indentation  \n')
  assert.equal((await api(page, 'sections')).filter((s) => s.name.startsWith('Travel')).length, 1)
})
