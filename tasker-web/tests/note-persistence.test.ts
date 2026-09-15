import assert from 'node:assert/strict'
import test from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { loadFunction, readProjectFile, sqliteBinding } from './support/functionHarness.ts'
import { notePathKey } from '../shared/notePathKey.ts'

const { onRequestPost } = loadFunction<typeof import('../functions/api/tasks/index.ts')>('functions/api/tasks/index.ts')
const { onRequestPatch } = loadFunction<typeof import('../functions/api/tasks/[id]/index.ts')>('functions/api/tasks/[id]/index.ts')
const migration4 = readProjectFile('migrations/0004_obsidian_path_key.sql')
const repair = readProjectFile('migrations/0005_repair_obsidian_path_keys.sql')

function setup(t: { after: (fn: () => void) => void }, legacy = false) {
  const db = new DatabaseSync(':memory:')
  t.after(() => db.close())
  if (legacy) {
    for (const name of ['0001_core_planner', '0002_plan_my_day', '0003_obsidian_source_path']) {
      db.exec(readProjectFile(`migrations/${name}.sql`))
    }
  } else {
    db.exec(readProjectFile('schema.sql'))
  }
  const env = { DB: sqliteBinding(db) }
  function post(path: string | null, notes = 'content', section: number | null = 1) {
    return onRequestPost({ env, request: new Request('http://localhost/api/tasks', {
      method: 'POST', body: JSON.stringify({ title: 'Note', source_path: path, section_id: section, notes }),
    }) })
  }
  function patch(id: number, body: object) {
    return onRequestPatch({ env, params: { id: String(id) }, request: new Request(`http://localhost/api/tasks/${id}`, {
      method: 'PATCH', body: JSON.stringify(body),
    }) })
  }
  function seed(path: string, notes = 'original') {
    return Number(db.prepare('INSERT INTO tasks (title, source_path, notes, section_id) VALUES (?, ?, ?, 1)')
      .run(path, path, notes).lastInsertRowid)
  }
  const rows = () => db.prepare('SELECT id, source_path, notes, section_id FROM tasks ORDER BY id').all()
  return { db, post, patch, seed, rows }
}

test('simultaneous Unicode path imports all succeed and return the same stored ID', async (t) => {
  const h = setup(t)
  const responses = await Promise.all(Array.from({ length: 12 }, (_, i) =>
    h.post(i % 2 ? 'École.md' : 'école.md', `body ${i}`)))
  assert.ok(responses.every((response) => response.ok))
  const ids = await Promise.all(responses.map(async (response) => (await response.json()).data.id))
  assert.equal(new Set(ids).size, 1)
  assert.equal(h.rows().length, 1)
  assert.equal(h.rows()[0].id, ids[0])
})

test('a retry returns the existing ID even after unrelated inserts and preserves task metadata', async (t) => {
  const h = setup(t)
  const first = (await (await h.post('Note.md')).json()).data.id
  h.db.prepare("UPDATE tasks SET status = 'done', priority = 'urgent', date = '2026-09-15' WHERE id = ?").run(first)
  await h.post('Unrelated.md')
  const retry = await h.post('NOTE.md', '    code\n\n')
  assert.equal((await retry.json()).data.id, first)
  const row = h.db.prepare('SELECT notes, status, priority, date FROM tasks WHERE id = ?').get(first)
  assert.equal(row?.notes, '    code\n\n')
  assert.equal(row?.status, 'done')
  assert.equal(row?.priority, 'urgent')
  assert.equal(row?.date, '2026-09-15')
})

test('path keys are scoped to sections; ordinary tasks and unassigned notes stay independent', async (t) => {
  const h = setup(t)
  await h.post('A.md', 'one', 1)
  await h.post('A.md', 'two', 2)
  await h.post(null)
  await h.post(null)
  await h.post('A.md', 'unassigned', null)
  await h.post('A.md', 'another unassigned', null)
  assert.equal(h.rows().length, 6)
})

test('corrected migration preserves duplicate content and concurrent imports reuse the oldest Unicode note', async (t) => {
  const h = setup(t, true)
  const oldest = h.seed('École.md', 'oldest text')
  const duplicate = h.seed('école.md', 'duplicate text')
  h.seed('A.md', 'first ASCII')
  h.seed('a.md', 'second ASCII')
  const before = h.rows()
  h.db.exec(migration4)
  assert.deepEqual(h.rows(), before)
  const responses = await Promise.all([h.post('école.md', 'imported'), h.post('École.md', 'imported')])
  for (const response of responses) {
    assert.equal(response.ok, true)
    assert.equal((await response.json()).data.id, oldest)
  }
  assert.equal(h.rows().length, 4)
  assert.equal(h.db.prepare('SELECT notes FROM tasks WHERE id = ?').get(duplicate)?.notes, 'duplicate text')
  const edit = await h.patch(duplicate, { source_path: 'école.md', notes: 'edited duplicate' })
  assert.equal(edit.status, 200)
  assert.equal(h.db.prepare('SELECT notes FROM tasks WHERE id = ?').get(oldest)?.notes, 'imported')
  assert.equal(h.db.prepare('SELECT notes FROM tasks WHERE id = ?').get(duplicate)?.notes, 'edited duplicate')
})

test('repair fixes already-applied ASCII-only backfill without changing note contents', async (t) => {
  const h = setup(t, true)
  const id = h.seed('École.md', 'preserved')
  h.db.exec(`ALTER TABLE tasks ADD COLUMN source_path_key TEXT NULL;
    UPDATE tasks SET source_path_key = lower(source_path);
    CREATE UNIQUE INDEX idx_tasks_section_source_path_key ON tasks(section_id, source_path_key)
      WHERE section_id IS NOT NULL AND source_path_key IS NOT NULL;`)
  assert.equal(h.db.prepare('SELECT source_path_key FROM tasks').get()?.source_path_key, 'École.md')
  const before = h.rows()
  h.db.exec(repair)
  h.db.exec(repair)
  assert.deepEqual(h.rows(), before)
  assert.equal((await (await h.post('école.md')).json()).data.id, id)
  assert.equal(h.rows().length, 1)
})

test('repair recovers a partially applied migration with duplicates and keeps all note IDs', async (t) => {
  const h = setup(t, true)
  h.seed('A.md', 'one')
  h.seed('a.md', 'two')
  h.db.exec('ALTER TABLE tasks ADD COLUMN source_path_key TEXT NULL; UPDATE tasks SET source_path_key = lower(source_path);')
  assert.throws(() => h.db.exec(`CREATE UNIQUE INDEX idx_tasks_section_source_path_key ON tasks(section_id, source_path_key)
    WHERE section_id IS NOT NULL AND source_path_key IS NOT NULL;`), /UNIQUE constraint/)
  const before = h.rows()
  h.db.exec(repair)
  assert.deepEqual(h.rows(), before)
  const responses = await Promise.all([h.post('A.md'), h.post('a.md')])
  assert.ok(responses.every((response) => response.ok))
  assert.equal(h.rows().length, 2)
  assert.equal(h.rows()[1].notes, 'two')
})

test('renaming a migrated note keeps the key in sync and protects occupied paths', async (t) => {
  const h = setup(t, true)
  const moving = h.seed('Old.md')
  const occupied = h.seed('École.md', 'destination text')
  h.db.exec(migration4)
  assert.equal((await h.patch(moving, { source_path: 'école.md', notes: 'must not overwrite' })).status, 409)
  assert.equal(h.db.prepare('SELECT notes FROM tasks WHERE id = ?').get(occupied)?.notes, 'destination text')
  assert.equal(h.db.prepare('SELECT source_path FROM tasks WHERE id = ?').get(moving)?.source_path, 'Old.md')
  assert.equal((await h.patch(moving, { source_path: 'Übung.md' })).status, 200)
  assert.equal((await (await h.post('übung.md')).json()).data.id, moving)
})

test('shared key normalization handles Unicode without depending on machine locale', () => {
  assert.equal(notePathKey(' ÉCOLE.md '), notePathKey('école.md'))
  assert.equal(notePathKey('I.md'), 'i.md')
})

test('renaming concurrently to the same path returns a conflict without overwriting either body', async (t) => {
  const h = setup(t)
  const a = (await (await h.post('A.md', 'body A')).json()).data.id
  const b = (await (await h.post('B.md', 'body B')).json()).data.id
  const responses = await Promise.all([
    h.patch(a, { source_path: 'École.md' }), h.patch(b, { source_path: 'école.md' }),
  ])
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409])
  assert.deepEqual(h.rows().map((row) => row.notes), ['body A', 'body B'])
})
