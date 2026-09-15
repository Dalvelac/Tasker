import assert from 'node:assert/strict'
import test from 'node:test'
import type { Section, SectionInput } from '../src/features/sections/types.ts'
import type { Task, TaskInput } from '../src/features/tasks/types.ts'
import { createNotebookActionSet, type NotebookActionApi } from '../src/features/notebooks/actionCore.ts'
import { uniqueNotebookName } from '../src/features/notebooks/utils.ts'

function createHarness(tasks: Task[] = [], sections: Section[] = []) {
  const createdSections: SectionInput[] = []
  const createdTasks: TaskInput[] = []
  const updatedSections: Array<[number, Partial<SectionInput>]> = []
  const updatedTasks: Array<[number, TaskInput]> = []
  const errors: Array<string | null> = []
  let refreshes = 0

  const api: NotebookActionApi = {
    createSection: async (input) => {
      createdSections.push(input)
      return { id: 50, ...input } as Section
    },
    createTask: async (input) => {
      createdTasks.push(input)
      return { id: 100 + createdTasks.length, ...input } as Task
    },
    updateSection: async (id, input) => {
      updatedSections.push([id, input])
      return { id, ...input } as Section
    },
    uniqueNotebookName,
    updateTask: async (id, input) => {
      updatedTasks.push([id, input])
      return { id, ...input } as Task
    },
  }
  const actions = createNotebookActionSet({
    refresh: async () => { refreshes += 1 },
    sections,
    setError: (error) => errors.push(error),
    tasks,
  }, api)

  return { actions, api, createdSections, createdTasks, errors, get refreshes() { return refreshes }, updatedSections, updatedTasks }
}

test('creates a notebook with a unique name and refreshes once', async () => {
  const harness = createHarness([], [{ name: 'Research' }, { name: 'Research 2' }] as Section[])
  const id = await harness.actions.createVault('Research')
  assert.equal(id, 50)
  assert.equal(harness.createdSections[0].name, 'Research 3')
  assert.equal(harness.refreshes, 1)
  assert.deepEqual(harness.errors, [null])
})

test('updates matching notes and creates missing notes during import', async () => {
  const existing = [{ id: 7, section_id: 3, title: 'Existing', source_path: 'Folder/Existing.md' }] as Task[]
  const harness = createHarness(existing)
  await harness.actions.importNotesIntoSection(3, {
    sectionName: 'Vault',
    notes: [
      { title: 'New', path: 'New.md', content: '# New' },
      { title: 'Existing changed', path: 'folder/existing.md', content: '# Updated' },
    ],
  })
  assert.equal(harness.createdTasks.length, 1)
  assert.deepEqual(harness.updatedTasks, [[7, {
    title: 'Existing changed', notes: '# Updated', source_path: 'folder/existing.md',
  }]])
  assert.equal(harness.refreshes, 1)
})

test('root notes do not overwrite nested notes with the same title', async () => {
  const harness = createHarness([{ id: 7, section_id: 3, title: 'Meeting', source_path: 'Work/Meeting.md' }] as Task[])
  await harness.actions.importNotesIntoSection(3, {
    sectionName: 'Vault',
    notes: [{ title: 'Meeting', path: 'Meeting.md', content: '# Root note' }],
  })
  assert.equal(harness.createdTasks.length, 1)
  assert.equal(harness.createdTasks[0].source_path, 'Meeting.md')
  assert.deepEqual(harness.updatedTasks, [])
})

test('legacy notes without paths still match by title', async () => {
  const harness = createHarness([{ id: 7, section_id: 3, title: 'Meeting', source_path: null }] as Task[])
  await harness.actions.importNotesIntoSection(3, {
    sectionName: 'Vault',
    notes: [{ title: 'Meeting', path: 'Meeting.md', content: '# Updated' }],
  })
  assert.equal(harness.createdTasks.length, 0)
  assert.equal(harness.updatedTasks[0][0], 7)
})

test('deduplicates repeated paths within one import batch', async () => {
  const harness = createHarness()
  await harness.actions.importNotesIntoSection(3, {
    sectionName: 'Vault',
    notes: [
      { title: 'Latest', path: 'Same.md', content: 'latest' },
      { title: 'Earlier', path: 'same.md', content: 'earlier' },
    ],
  })
  assert.equal(harness.createdTasks.length, 1)
  assert.equal(harness.updatedTasks.length, 1)
  assert.equal(harness.updatedTasks[0][0], 101)
})

test('reports a useful fallback error and refreshes after a failed action', async () => {
  const harness = createHarness()
  harness.api.createSection = async () => { throw null }
  await assert.rejects(harness.actions.createVault('Broken'), /Could not create Markdown folder/)
  assert.deepEqual(harness.errors, [null, 'Could not create Markdown folder'])
  assert.equal(harness.refreshes, 1)
})
