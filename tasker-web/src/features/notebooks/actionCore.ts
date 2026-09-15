import type { ObsidianImport } from '../import/obsidian'
import type { Section, SectionInput } from '../sections/types'
import type { Task, TaskInput } from '../tasks/types'

const notebookColors = ['#60A5FA', '#A78BFA', '#22C55E', '#F472B6', '#F59E0B', '#38BDF8', '#FB7185']

export type NotebookActionDependencies = {
  refresh: () => Promise<void>
  sections: Section[]
  setError: (message: string | null) => void
  tasks: Task[]
}

export type NotebookActionApi = {
  createSection: (input: SectionInput) => Promise<{ id: number }>
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
      await refresh()
      return result
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : fallbackMessage
      setError(message)
      throw new Error(message, { cause: error })
    }
  }

  async function saveNotes(sectionId: number, input: ObsidianImport) {
    const noteIdsByPath = new Map<string, number>()
    tasks.filter((task) => task.section_id === sectionId).forEach((task) => {
      if (task.source_path) noteIdsByPath.set(task.source_path.toLocaleLowerCase(), task.id)
      noteIdsByPath.set(`${task.title}.md`.toLocaleLowerCase(), task.id)
    })

    for (const note of [...input.notes].reverse()) {
      const pathKey = note.path.toLocaleLowerCase()
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
          description: 'Imported from Obsidian with 0 Markdown notes.',
        })
        return section.id
      }),
    importNotes: (input: ObsidianImport) =>
      run('Could not import Obsidian notes', async () => {
        const section = await api.createSection({
          name: api.uniqueNotebookName(input.sectionName, sections),
          color: notebookColors[sections.length % notebookColors.length],
          description: `Imported from Obsidian with ${input.notes.length} Markdown notes.`,
        })
        await saveNotes(section.id, input)
      }),
    importNotesIntoSection: (sectionId: number, input: ObsidianImport) =>
      run('Could not add notes to this folder', () => saveNotes(sectionId, input)),
    renameVault: (sectionId: number, name: string) =>
      run('Could not rename Markdown folder', () => api.updateSection(sectionId, { name }).then(() => undefined)),
  }
}
