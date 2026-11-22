import type { ImportProgress, ObsidianImport } from '../import/obsidian'
import type { Section, SectionInput } from '../sections/types'
import type { Task, TaskInput } from '../tasks/types'
import { notePathKey } from '../../../shared/notePathKey.ts'

const notebookColors = ['#60A5FA', '#A78BFA', '#22C55E', '#F472B6', '#F59E0B', '#38BDF8', '#FB7185']

export type NotebookActionDependencies = {
  refresh: () => Promise<void>
  sections: Section[]
  setError: (message: string | null) => void
  tasks: Task[]
}

export type NotebookActionApi = {
  createSection: (input: SectionInput) => Promise<{ id: number; name?: string }>
  createTask: (input: TaskInput) => Promise<{ id: number }>
  updateSection: (id: number, input: Partial<SectionInput>) => Promise<unknown>
  updateTask: (id: number, input: TaskInput) => Promise<unknown>
  uniqueNotebookName: (name: string, sections: Section[]) => string
}

export function createNotebookActionSet(
  { refresh, sections, setError, tasks }: NotebookActionDependencies,
  api: NotebookActionApi,
) {
  async function run<T>(fallbackMessage: string, action: () => Promise<T>) {
    try {
      setError(null)
      const result = await action()
      await refresh().catch(() => setError('Saved. Refresh to load the latest records.'))
      return result
    } catch (error) {
      // A batch may have written earlier notes before one request failed. Refresh
      // so those notes are visible and a retry can match them by path.
      try {
        await refresh()
      } catch {
        // Preserve the original action error for the user.
      }
      const message = error instanceof Error && error.message ? error.message : fallbackMessage
      setError(message)
      throw new Error(message, { cause: error })
    }
  }

  async function saveNotes(
    sectionId: number,
    input: ObsidianImport,
    progress: ImportProgress = input.progress ?? { completed: [] },
  ) {
    const noteIdsByPath = new Map<string, number>()
    tasks
      .filter((task) => task.section_id === sectionId)
      .forEach((task) => {
        if (!task.source_path || task.kind === 'task' || task.kind === 'review') return
        const path = task.source_path
        const key = notePathKey(path)
        const existingId = noteIdsByPath.get(key)
        // Match the backend's legacy duplicate policy regardless of task sorting.
        noteIdsByPath.set(key, existingId === undefined ? task.id : Math.min(existingId, task.id))
      })

    for (let index = input.notes.length - 1; index >= 0; index--) {
      if (progress.completed.includes(index)) continue
      const note = input.notes[index]
      const pathKey = notePathKey(note.path)
      const existingId = noteIdsByPath.get(pathKey)
      if (existingId) {
        await api.updateTask(existingId, { title: note.title, notes: note.content, source_path: note.path })
      } else {
        const created = await api.createTask({
          title: note.title,
          notes: note.content,
          source_path: note.path,
          section_id: sectionId,
          priority: 'normal',
          status: 'pending',
          type: 'task',
        })
        noteIdsByPath.set(pathKey, created.id)
      }
      progress.completed.push(index)
      input.onProgress?.(progress)
    }
  }

  return {
    createNote: (sectionId: number, path: string, content = '') =>
      run('Could not create Markdown note', async () => {
        const title = path.split('/').pop()?.replace(/\.md$/i, '') || 'Untitled'
        const note = await api.createTask({
          title,
          notes: content || null,
          source_path: path,
          kind: 'note',
          create_only: true,
          section_id: sectionId,
          priority: 'normal',
          status: 'pending',
          type: 'task',
        })
        return note.id
      }),
    createVault: (name: string) =>
      run('Could not create Markdown folder', async () => {
        const section = await api.createSection({
          name: api.uniqueNotebookName(name, sections),
          color: notebookColors[sections.length % notebookColors.length],
          is_vault: true,
          description: 'Imported from Obsidian with 0 Markdown notes.',
        })
        return section.id
      }),
    importNotes: (input: ObsidianImport) =>
      run('Could not import Obsidian notes', async () => {
        const progress = input.progress ?? { completed: [] }
        if (!progress.sectionId) {
          const name = api.uniqueNotebookName(input.sectionName, sections)
          const section = await api.createSection({
            name,
            color: notebookColors[sections.length % notebookColors.length],
            is_vault: true,
            description: `Imported from Obsidian with ${input.notes.length} Markdown notes.`,
            requestKey: progress.requestKey,
          })
          progress.sectionId = section.id
          progress.sectionName = section.name ?? name
          input.onProgress?.(progress)
        }
        await saveNotes(progress.sectionId, input, progress)
        return `Imported ${input.notes.length} notes into “${progress.sectionName}”.`
      }),
    importNotesIntoSection: (sectionId: number, input: ObsidianImport) =>
      run('Could not add notes to this folder', () => saveNotes(sectionId, input)),
    renameVault: (sectionId: number, name: string) =>
      run('Could not rename Markdown folder', () => api.updateSection(sectionId, { name }).then(() => undefined)),
  }
}
