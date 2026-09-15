import type { Section } from '../sections/types'
import type { Task } from '../tasks/types'

export type NoteSort = 'path' | 'updated'

export function naturalCompare(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
}

export function notePath(note: Task) {
  return note.source_path || `${note.title}.md`
}

export function fileName(path: string) {
  return path.split('/').pop() || path
}

export function normalizePath(path: string) {
  const cleanPath = path
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/')

  if (!cleanPath) return 'Untitled.md'
  return cleanPath.toLowerCase().endsWith('.md') ? cleanPath : `${cleanPath}.md`
}

export function uniquePath(path: string, notes: Task[]) {
  const normalizedPath = normalizePath(path)
  const existingPaths = new Set(notes.map((note) => notePath(note).toLowerCase()))
  if (!existingPaths.has(normalizedPath.toLowerCase())) return normalizedPath

  const parts = normalizedPath.split('/')
  const name = parts.pop() ?? 'Untitled.md'
  const folder = parts.length > 0 ? `${parts.join('/')}/` : ''
  const baseName = name.replace(/\.md$/i, '')
  let index = 2
  while (existingPaths.has(`${folder}${baseName} ${index}.md`.toLowerCase())) index += 1
  return `${folder}${baseName} ${index}.md`
}

export function isNotebookSection(section: Section, sectionTasks: Task[]) {
  return section.description?.includes('Imported from Obsidian') || sectionTasks.some((task) => task.source_path)
}

export function groupNotes(notes: Task[], sort: NoteSort = 'path') {
  const groups = new Map<string, Task[]>()
  notes.forEach((note) => {
    const path = notePath(note).split('/')
    const group = path.length === 1 ? 'Root' : path.slice(0, -1).join('/')
    groups.set(group, [...(groups.get(group) ?? []), note])
  })

  return [...groups.entries()]
    .map(([group, groupNotes]) => [
      group,
      [...groupNotes].sort((left, right) => sort === 'updated'
        ? right.updated_at.localeCompare(left.updated_at)
        : naturalCompare(notePath(left), notePath(right))),
    ] as const)
    .sort(([left], [right]) => naturalCompare(left, right))
}

export function noteWordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0
}

export function uniqueNotebookName(name: string, sections: Section[]) {
  const existingNames = new Set(sections.map((section) => section.name.toLowerCase()))
  const baseName = name.trim() || 'Obsidian Notes'
  let nextName = baseName
  let index = 2

  while (existingNames.has(nextName.toLowerCase())) {
    nextName = `${baseName} ${index}`
    index += 1
  }
  return nextName
}
