import assert from 'node:assert/strict'
import test from 'node:test'
import type { Section } from '../src/features/sections/types.ts'
import type { Task } from '../src/features/tasks/types.ts'
import { groupNotes, normalizePath, noteWordCount, uniqueNotebookName, uniquePath } from '../src/features/notebooks/utils.ts'

function note(id: number, path: string): Task {
  return { id, title: path.replace(/\.md$/, ''), notes: null, source_path: path } as Task
}

test('normalizes Markdown paths without losing nested folders', () => {
  assert.equal(normalizePath(' Projects \\ Weekly plan '), 'Projects/Weekly plan.md')
  assert.equal(normalizePath('already.md'), 'already.md')
  assert.equal(normalizePath('///'), 'Untitled.md')
})

test('creates a case-insensitive unique note path', () => {
  const notes = [note(1, 'Ideas.md'), note(2, 'Ideas 2.md')]
  assert.equal(uniquePath('ideas', notes), 'ideas 3.md')
  assert.equal(uniquePath('Archive/Ideas', notes), 'Archive/Ideas.md')
})

test('groups notes by folder and sorts groups and files naturally', () => {
  const groups = groupNotes([note(1, 'Work/Note 10.md'), note(2, 'Root.md'), note(3, 'Work/Note 2.md')])
  assert.deepEqual(groups.map(([name, notes]) => [name, notes.map((item) => item.source_path)]), [
    ['Root', ['Root.md']],
    ['Work', ['Work/Note 2.md', 'Work/Note 10.md']],
  ])
})

test('counts words and generates collision-free notebook names', () => {
  assert.equal(noteWordCount('  one\n two   three '), 3)
  assert.equal(noteWordCount('  '), 0)
  const sections = [{ name: 'Ideas' }, { name: 'ideas 2' }] as Section[]
  assert.equal(uniqueNotebookName('ideas', sections), 'ideas 3')
})
