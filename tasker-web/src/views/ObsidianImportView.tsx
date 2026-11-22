import { useState } from 'react'
import { ObsidianDropzone } from '../components/ObsidianDropzone'
import { NoteRecord } from '../features/notebooks/components/NoteRecord'
import { NotebookFileBrowser } from '../features/notebooks/components/NotebookFileBrowser'
import { NotebookSidebar } from '../features/notebooks/components/NotebookSidebar'
import { fileName, naturalCompare, normalizePath, uniquePath } from '../features/notebooks/utils'
import { beforeNavigation, commitRoute, navigate, viewUrl } from '../app/routes'
import type { ObsidianImport } from '../features/import/obsidian'
import type { Section } from '../features/sections/types'
import type { Task, TaskInput } from '../features/tasks/types'

type Props = {
  sections: Section[]
  tasks: Task[]
  noteId: number | null
  vaultId: number | null
  onCreateObsidianNote: (id: number, path: string, body?: string) => Promise<number>
  onCreateObsidianVault: (name: string) => Promise<number>
  onDeleteTask: (id: number, revision?: number) => Promise<void>
  onCreateTask: (input: TaskInput) => Promise<number>
  onImportObsidianNotes: (input: ObsidianImport) => Promise<string | void>
  onImportObsidianNotesIntoSection: (id: number, input: ObsidianImport) => Promise<void>
  onRenameObsidianVault: (id: number, name: string) => Promise<void>
  onUpdateTask: (id: number, input: TaskInput) => Promise<void>
}
const unfiled: Section = {
  id: 0,
  name: 'Unfiled notes',
  slug: '',
  color: '#9CA3AF',
  icon: null,
  description: null,
  pending_count: 0,
  note_count: 0,
  is_vault: 1,
  created_at: '',
  updated_at: '',
}
export function ObsidianImportView(p: Props) {
  const [newNote, setNewNote] = useState<number | null>(null)
  const [names, setNames] = useState<Record<number, string>>({})
  const counts = new Map<number, number>()
  for (const task of p.tasks) {
    const id = task.section_id ?? 0
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const vaults = p.sections
    .filter((s) => s.is_vault || counts.has(s.id))
    .sort((a, b) => naturalCompare(a.name, b.name))
  if (counts.has(0)) vaults.push(unfiled)
  const requested = p.tasks.find((t) => t.id === p.noteId)
  const vault = requested
    ? vaults.find((s) => s.id === (requested.section_id ?? 0))
    : (vaults.find((s) => s.id === p.vaultId) ?? vaults[0])
  const notes = vault ? p.tasks.filter((n) => (n.section_id ?? 0) === vault.id) : []
  const selected = p.noteId ? requested : notes[0]
  const link = (id: number, note?: number) => viewUrl('obsidian', { vault: id, note: note ?? null })
  function guarded(action: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) =>
      beforeNavigation(
        () => void action().then(resolve, reject),
        () => reject(new Error('Navigation cancelled')),
      ),
    )
  }
  function createNote(path: string, content: string) {
    return guarded(async () => {
      if (!vault?.id) return
      const id = await p.onCreateObsidianNote(vault.id, uniquePath(path, notes), content)
      setNewNote(id)
      commitRoute(link(vault.id, id))
    })
  }
  async function rename(section: Section) {
    const name = names[section.id]?.trim()
    if (!name || name === section.name) return
    try {
      await p.onRenameObsidianVault(section.id, name)
      setNames((current) => {
        const next = { ...current }
        delete next[section.id]
        return next
      })
    } catch {
      /* The action reports the error and keeps the entered name. */
    }
  }
  return (
    <section className="view">
      <div className="view-header">
        <h2 className="view-title">Markdown vault</h2>
      </div>
      <div className="obsidian-vault">
        <NotebookSidebar
          activeSectionId={vault?.id ?? null}
          noteCounts={counts}
          sections={vaults}
          onCreate={(name) =>
            guarded(async () => {
              const id = await p.onCreateObsidianVault(name)
              commitRoute(link(id))
            })
          }
          onImport={p.onImportObsidianNotes}
          onSelect={(s) => navigate(link(s.id))}
        />
        <div className="obsidian-vault__workspace">
          {vault ? (
            <>
              <div className="obsidian-vault__toolbar">
                <label className="form-label">
                  Current folder
                  <input
                    className="field"
                    value={names[vault.id] ?? vault.name}
                    readOnly={!vault.id}
                    onChange={(e) => setNames({ ...names, [vault.id]: e.target.value })}
                    onBlur={() => void rename(vault)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                    }}
                  />
                </label>
                {!!vault.id && (
                  <ObsidianDropzone
                    key={vault.id}
                    compact
                    destinationKey={String(vault.id)}
                    title="Add to folder"
                    buttonLabel="Add files"
                    description="Add Markdown files or a ZIP."
                    onImport={async (input) => {
                      await p.onImportObsidianNotesIntoSection(vault.id, input)
                      return `Saved ${input.notes.length} notes in “${vault.name}”.`
                    }}
                  />
                )}
              </div>
              <div className="obsidian-vault__panes">
                <NotebookFileBrowser
                  key={vault.id}
                  sectionId={vault.id || null}
                  notebookName={vault.name}
                  activeNoteId={selected?.id ?? null}
                  notes={notes}
                  onCreateFolder={(name) => createNote(name + '/Untitled.md', '# ' + fileName(name) + '\n\n')}
                  onCreateNote={(path) =>
                    createNote(path, '# ' + fileName(normalizePath(path)).replace(/\.md$/i, '') + '\n\n')
                  }
                  onSelect={(note) => navigate(link(vault.id, note.id))}
                />
                {selected ? (
                  <NoteRecord
                    key={selected.id}
                    summary={selected}
                    startEditing={newNote === selected.id}
                    onEditorOpened={() => setNewNote(null)}
                    onUpdate={p.onUpdateTask}
                    onCreateTask={p.onCreateTask}
                    onDelete={p.onDeleteTask}
                    onRemoved={() => commitRoute(link(vault.id), true)}
                  />
                ) : (
                  <p className="obsidian-vault__empty-note">
                    {p.noteId ? 'This note is unavailable.' : 'Select or create a Markdown file.'}
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="obsidian-vault__empty-note">
              Create a folder or import Markdown files to start your vault.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
