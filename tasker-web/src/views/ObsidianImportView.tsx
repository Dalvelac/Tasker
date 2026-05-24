import { useMemo, useState } from 'react'
import { MarkdownPreview } from '../components/MarkdownPreview'
import { ObsidianDropzone } from '../components/ObsidianDropzone'
import type { ObsidianImport } from '../features/import/obsidian'
import type { Section } from '../features/sections/types'
import type { Task, TaskInput } from '../features/tasks/types'

type ObsidianImportViewProps = {
  sections: Section[]
  tasks: Task[]
  onCreateObsidianNote: (sectionId: number, path: string, content?: string) => Promise<number>
  onCreateObsidianVault: (name: string) => Promise<number>
  onDeleteTask: (id: number) => Promise<void>
  onImportObsidianNotes: (input: ObsidianImport) => Promise<string | void>
  onImportObsidianNotesIntoSection: (sectionId: number, input: ObsidianImport) => Promise<void>
  onRenameObsidianVault: (sectionId: number, name: string) => Promise<void>
  onUpdateTask: (id: number, input: TaskInput) => Promise<void>
}

function naturalCompare(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
}

function notePath(note: Task) {
  return note.source_path || `${note.title}.md`
}

function fileName(path: string) {
  return path.split('/').pop() || path
}

function parentPath(path: string) {
  const parts = path.split('/')
  if (parts.length === 1) return 'Root'
  return parts.slice(0, -1).join('/')
}

function normalizePath(path: string) {
  const cleanPath = path
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/')

  if (!cleanPath) return 'Untitled.md'
  return cleanPath.toLowerCase().endsWith('.md') ? cleanPath : `${cleanPath}.md`
}

function uniquePath(path: string, notes: Task[]) {
  const normalizedPath = normalizePath(path)
  const existingPaths = new Set(notes.map((note) => notePath(note).toLowerCase()))

  if (!existingPaths.has(normalizedPath.toLowerCase())) return normalizedPath

  const parts = normalizedPath.split('/')
  const name = parts.pop() ?? 'Untitled.md'
  const folder = parts.length > 0 ? `${parts.join('/')}/` : ''
  const baseName = name.replace(/\.md$/i, '')
  let index = 2

  while (existingPaths.has(`${folder}${baseName} ${index}.md`.toLowerCase())) {
    index += 1
  }

  return `${folder}${baseName} ${index}.md`
}

function isObsidianSection(section: Section, sectionTasks: Task[]) {
  return section.description?.includes('Imported from Obsidian') || sectionTasks.some((task) => task.source_path)
}

function groupNotes(notes: Task[]) {
  const groups = new Map<string, Task[]>()

  notes.forEach((note) => {
    const group = parentPath(notePath(note))
    groups.set(group, [...(groups.get(group) ?? []), note])
  })

  return [...groups.entries()]
    .map(([group, groupNotes]) => [
      group,
      [...groupNotes].sort((left, right) => naturalCompare(notePath(left), notePath(right))),
    ] as const)
    .sort(([left], [right]) => naturalCompare(left, right))
}

export function ObsidianImportView({
  sections,
  tasks,
  onCreateObsidianNote,
  onCreateObsidianVault,
  onDeleteTask,
  onImportObsidianNotes,
  onImportObsidianNotesIntoSection,
  onRenameObsidianVault,
  onUpdateTask,
}: ObsidianImportViewProps) {
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [draftNotes, setDraftNotes] = useState('')
  const [newVaultName, setNewVaultName] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [newNotePath, setNewNotePath] = useState('')
  const [vaultNameDrafts, setVaultNameDrafts] = useState<Record<number, string>>({})
  const [notePathDrafts, setNotePathDrafts] = useState<Record<number, string>>({})

  const notesBySection = useMemo(() => {
    const map = new Map<number, Task[]>()
    tasks.forEach((task) => {
      if (task.section_id) map.set(task.section_id, [...(map.get(task.section_id) ?? []), task])
    })
    return map
  }, [tasks])

  const vaultSections = useMemo(
    () =>
      sections
        .filter((section) => isObsidianSection(section, notesBySection.get(section.id) ?? []))
        .sort((left, right) => naturalCompare(left.name, right.name)),
    [notesBySection, sections],
  )

  const activeSection = vaultSections.find((section) => section.id === activeSectionId) ?? vaultSections[0] ?? null
  const activeNotes = useMemo(() => {
    if (!activeSection) return []
    return [...(notesBySection.get(activeSection.id) ?? [])].sort((left, right) =>
      naturalCompare(notePath(left), notePath(right)),
    )
  }, [activeSection, notesBySection])
  const activeNote = activeNotes.find((note) => note.id === activeTaskId) ?? activeNotes[0] ?? null
  const groupedNotes = useMemo(() => groupNotes(activeNotes), [activeNotes])

  async function importIntoActiveSection(input: ObsidianImport) {
    if (!activeSection) return 'Choose a folder before adding notes.'
    await onImportObsidianNotesIntoSection(activeSection.id, input)
    return `Added ${input.notes.length} notes to "${activeSection.name}".`
  }

  async function saveActiveNote() {
    if (!activeNote) return
    await onUpdateTask(activeNote.id, {
      title: activeNote.title,
      notes: draftNotes.trim() || null,
      source_path: notePath(activeNote),
    })
    setIsEditing(false)
  }

  async function createVault() {
    const name = newVaultName.trim()
    if (!name) return
    const sectionId = await onCreateObsidianVault(name)
    setActiveSectionId(sectionId)
    setActiveTaskId(null)
    setNewVaultName('')
  }

  async function createNote(path: string, content = '') {
    if (!activeSection) return
    const nextPath = uniquePath(path, activeNotes)
    const taskId = await onCreateObsidianNote(activeSection.id, nextPath, content)
    setActiveTaskId(taskId)
    setDraftNotes(content)
    setIsEditing(true)
  }

  async function createFolder() {
    const folder = newFolderName.trim()
    if (!folder) return
    await createNote(`${folder}/Untitled.md`, `# ${fileName(folder)}\n\n`)
    setNewFolderName('')
  }

  async function createNamedNote() {
    const path = newNotePath.trim()
    if (!path) return
    await createNote(path, `# ${fileName(normalizePath(path)).replace(/\.md$/i, '')}\n\n`)
    setNewNotePath('')
  }

  async function saveVaultName(section: Section) {
    const nextName = (vaultNameDrafts[section.id] ?? section.name).trim()
    if (!nextName || nextName === section.name) return
    await onRenameObsidianVault(section.id, nextName)
    setVaultNameDrafts((current) => {
      const next = { ...current }
      delete next[section.id]
      return next
    })
  }

  async function saveNotePath(note: Task) {
    const nextPath = normalizePath(notePathDrafts[note.id] ?? notePath(note))
    if (nextPath === notePath(note)) return
    await onUpdateTask(note.id, {
      title: fileName(nextPath).replace(/\.md$/i, ''),
      source_path: uniquePath(nextPath, activeNotes.filter((item) => item.id !== note.id)),
    })
    setNotePathDrafts((current) => {
      const next = { ...current }
      delete next[note.id]
      return next
    })
  }

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="view-eyebrow">Obsidian</p>
          <h2 className="view-title">Markdown vault</h2>
          <p className="view-description">Browse imported folders, open notes, edit Markdown, and add more files later.</p>
        </div>
      </div>

      <div className="obsidian-vault">
        <aside className="obsidian-vault__folders" aria-label="Markdown folders">
          <ObsidianDropzone
            compact
            buttonLabel="New folder"
            description="Drop a ZIP or .md files to create a folder."
            onImport={onImportObsidianNotes}
            title="Import"
          />

          <div className="obsidian-vault__quick-create">
            <input
              className="field"
              onChange={(event) => setNewVaultName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void createVault()
              }}
              placeholder="New import name"
              value={newVaultName}
            />
            <button className="button button--primary" onClick={createVault} type="button">
              Create
            </button>
          </div>

          <div className="obsidian-vault__section-list">
            <p className="obsidian-vault__label">Folders</p>
            {vaultSections.length === 0 ? (
              <p className="obsidian-vault__empty">No Markdown folders yet.</p>
            ) : (
              vaultSections.map((section) => {
                const count = notesBySection.get(section.id)?.length ?? 0
                return (
                  <button
                    className={`obsidian-vault__folder ${activeSection?.id === section.id ? 'is-active' : ''}`}
                    key={section.id}
                    onClick={() => {
                      setActiveSectionId(section.id)
                      setActiveTaskId(null)
                      setDraftNotes('')
                      setIsEditing(false)
                      setIsFullscreen(false)
                    }}
                    type="button"
                  >
                    <span className="obsidian-vault__folder-accent" style={{ background: section.color }} />
                    <span>
                      <strong>{section.name}</strong>
                      <small>{count} notes</small>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        <div className="obsidian-vault__workspace">
          {activeSection ? (
            <>
              <div className="obsidian-vault__toolbar">
                <div>
                  <p className="obsidian-vault__label">Current folder</p>
                  <input
                    className="field obsidian-vault__name-input"
                    onBlur={() => void saveVaultName(activeSection)}
                    onChange={(event) =>
                      setVaultNameDrafts((current) => ({ ...current, [activeSection.id]: event.target.value }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur()
                    }}
                    value={vaultNameDrafts[activeSection.id] ?? activeSection.name}
                  />
                </div>
                <ObsidianDropzone
                  compact
                  buttonLabel="Add files"
                  description="Drop more .md files or a ZIP into this folder."
                  onImport={importIntoActiveSection}
                  title="Add to folder"
                />
              </div>

              <div className="obsidian-vault__panes">
                <aside className="obsidian-vault__files" aria-label={`${activeSection.name} files`}>
                  <p className="obsidian-vault__label">Files</p>
                  <div className="obsidian-vault__mode-tabs" aria-label="Note mode">
                    <button
                      className={`obsidian-vault__mode ${!isEditing ? 'is-active' : ''}`}
                      onClick={() => setIsEditing(false)}
                      title="Preview mode"
                      type="button"
                    >
                      ◐
                    </button>
                    <button
                      className={`obsidian-vault__mode ${isEditing ? 'is-active' : ''}`}
                      onClick={() => {
                        setDraftNotes(activeNote?.notes ?? '')
                        setIsEditing(true)
                      }}
                      title="Edit mode"
                      type="button"
                    >
                      ✎
                    </button>
                  </div>
                  <div className="obsidian-vault__quick-create">
                    <input
                      className="field"
                      onChange={(event) => setNewFolderName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void createFolder()
                      }}
                      placeholder="New folder"
                      value={newFolderName}
                    />
                    <button className="button" onClick={createFolder} type="button">
                      Folder
                    </button>
                  </div>
                  <div className="obsidian-vault__quick-create">
                    <input
                      className="field"
                      onChange={(event) => setNewNotePath(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void createNamedNote()
                      }}
                      placeholder="New note.md or folder/note.md"
                      value={newNotePath}
                    />
                    <button className="button" onClick={createNamedNote} type="button">
                      Note
                    </button>
                  </div>
                  {activeNotes.length === 0 ? (
                    <p className="obsidian-vault__empty">This folder is empty.</p>
                  ) : (
                    groupedNotes.map(([group, notes]) => (
                      <div className="obsidian-vault__file-group" key={group}>
                        <p className="obsidian-vault__file-group-name">{group}</p>
                        {notes.map((note) => {
                          const path = notePath(note)
                          return (
                            <button
                              className={`obsidian-vault__file ${activeNote?.id === note.id ? 'is-active' : ''}`}
                              key={note.id}
                              onClick={() => {
                                setActiveTaskId(note.id)
                                setDraftNotes(note.notes ?? '')
                                setIsEditing(false)
                                setIsFullscreen(false)
                              }}
                              type="button"
                            >
                              <span>{fileName(path)}</span>
                              <small>{path}</small>
                            </button>
                          )
                        })}
                      </div>
                    ))
                  )}
                </aside>

                <article className={`obsidian-vault__note ${isFullscreen ? 'is-fullscreen' : ''}`}>
                  {activeNote ? (
                    <>
                      <div className="obsidian-vault__note-header">
                        <div>
                          <p className="obsidian-vault__label">{notePath(activeNote)}</p>
                          <input
                            className="field obsidian-vault__name-input"
                            onBlur={() => void saveNotePath(activeNote)}
                            onChange={(event) =>
                              setNotePathDrafts((current) => ({ ...current, [activeNote.id]: event.target.value }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') event.currentTarget.blur()
                            }}
                            value={notePathDrafts[activeNote.id] ?? notePath(activeNote)}
                          />
                        </div>
                        <div className="inline-actions obsidian-vault__icon-actions">
                          {isEditing ? (
                            <>
                              <button
                                className="icon-button icon-button--primary"
                                onClick={saveActiveNote}
                                title="Save"
                                type="button"
                              >
                                ✓
                              </button>
                              <button
                                className="icon-button"
                                onClick={() => {
                                  setDraftNotes(activeNote.notes ?? '')
                                  setIsEditing(false)
                                }}
                                title="Cancel"
                                type="button"
                              >
                                ×
                              </button>
                            </>
                          ) : (
                            <button
                              className="icon-button"
                              onClick={() => {
                                setDraftNotes(activeNote.notes ?? '')
                                setIsEditing(true)
                              }}
                              title="Edit"
                              type="button"
                            >
                              ✎
                            </button>
                          )}
                          <button
                            className="icon-button"
                            onClick={() => setIsFullscreen((value) => !value)}
                            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                            type="button"
                          >
                            {isFullscreen ? '↙' : '⛶'}
                          </button>
                          <button
                            className="icon-button icon-button--danger"
                            onClick={() => onDeleteTask(activeNote.id)}
                            title="Delete"
                            type="button"
                          >
                            🗑
                          </button>
                        </div>
                      </div>

                      <div className={`obsidian-vault__note-body ${isEditing ? 'is-editing' : ''}`}>
                        {isEditing ? (
                          <textarea
                            className="textarea obsidian-vault__editor"
                            onChange={(event) => setDraftNotes(event.target.value)}
                            spellCheck
                            value={draftNotes}
                          />
                        ) : (
                          <MarkdownPreview value={activeNote.notes ?? ''} />
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="obsidian-vault__empty-note">Select a Markdown file.</div>
                  )}
                </article>
              </div>
            </>
          ) : (
            <div className="obsidian-vault__empty-note">Import a ZIP or Markdown files to start a vault.</div>
          )}
        </div>
      </div>
    </section>
  )
}
