import { useEffect, useMemo, useState } from 'react'
import { ObsidianDropzone } from '../components/ObsidianDropzone'
import { NotebookEditor } from '../features/notebooks/components/NotebookEditor'
import { NotebookFileBrowser } from '../features/notebooks/components/NotebookFileBrowser'
import { NotebookSidebar } from '../features/notebooks/components/NotebookSidebar'
import { fileName, isNotebookSection, naturalCompare, normalizePath, notePath, uniquePath } from '../features/notebooks/utils'
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

export function ObsidianImportView({ sections, tasks, onCreateObsidianNote, onCreateObsidianVault, onDeleteTask, onImportObsidianNotes, onImportObsidianNotesIntoSection, onRenameObsidianVault, onUpdateTask }: ObsidianImportViewProps) {
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [draft, setDraft] = useState('')
  const [vaultNameDrafts, setVaultNameDrafts] = useState<Record<number, string>>({})
  const [notePathDrafts, setNotePathDrafts] = useState<Record<number, string>>({})

  const notesBySection = useMemo(() => {
    const map = new Map<number, Task[]>()
    tasks.forEach((task) => {
      if (task.section_id) map.set(task.section_id, [...(map.get(task.section_id) ?? []), task])
    })
    return map
  }, [tasks])
  const vaultSections = useMemo(() => sections
    .filter((section) => isNotebookSection(section, notesBySection.get(section.id) ?? []))
    .sort((left, right) => naturalCompare(left.name, right.name)), [notesBySection, sections])
  const activeSection = vaultSections.find((section) => section.id === activeSectionId) ?? vaultSections[0] ?? null
  const activeNotes = useMemo(() => activeSection ? notesBySection.get(activeSection.id) ?? [] : [], [activeSection, notesBySection])
  const activeNote = activeNotes.find((note) => note.id === activeTaskId) ?? activeNotes[0] ?? null
  const isDirty = Boolean(activeNote && isEditing && draft !== (activeNote.notes ?? ''))

  async function saveActiveNote() {
    if (!activeNote) return
    await onUpdateTask(activeNote.id, { title: activeNote.title, notes: draft.trim() || null, source_path: notePath(activeNote) })
    setIsEditing(false)
  }

  useEffect(() => {
    if (!isEditing || !activeNote) return
    function saveWithShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void saveActiveNote()
      }
    }
    window.addEventListener('keydown', saveWithShortcut)
    return () => window.removeEventListener('keydown', saveWithShortcut)
  })

  function canDiscardDraft() {
    return !isDirty || window.confirm('Discard the unsaved changes to this note?')
  }

  function selectNote(note: Task) {
    if (!canDiscardDraft()) return
    setActiveTaskId(note.id)
    setDraft(note.notes ?? '')
    setIsEditing(false)
    setIsFullscreen(false)
  }

  async function createNote(path: string, content = '') {
    if (!activeSection) return
    const nextPath = uniquePath(path, activeNotes)
    const taskId = await onCreateObsidianNote(activeSection.id, nextPath, content)
    setActiveTaskId(taskId)
    setDraft(content)
    setIsEditing(true)
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

  async function saveNotePath() {
    if (!activeNote) return
    const nextPath = normalizePath(notePathDrafts[activeNote.id] ?? notePath(activeNote))
    if (nextPath === notePath(activeNote)) return
    await onUpdateTask(activeNote.id, { title: fileName(nextPath).replace(/\.md$/i, ''), source_path: uniquePath(nextPath, activeNotes.filter((item) => item.id !== activeNote.id)) })
    setNotePathDrafts((current) => {
      const next = { ...current }
      delete next[activeNote.id]
      return next
    })
  }

  function downloadActiveNote() {
    if (!activeNote) return
    const url = URL.createObjectURL(new Blob([activeNote.notes ?? ''], { type: 'text/markdown;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = fileName(notePath(activeNote))
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="view">
      <div className="view-header"><div><p className="view-eyebrow">Obsidian</p><h2 className="view-title">Markdown vault</h2><p className="view-description">Browse imported folders, open notes, edit Markdown, and add more files later.</p></div></div>
      <div className="obsidian-vault">
        <NotebookSidebar activeSectionId={activeSection?.id ?? null} noteCounts={new Map([...notesBySection].map(([id, notes]) => [id, notes.length]))} sections={vaultSections} onCreate={async (name) => {
          const sectionId = await onCreateObsidianVault(name)
          setActiveSectionId(sectionId)
          setActiveTaskId(null)
        }} onImport={onImportObsidianNotes} onSelect={(section) => {
          if (!canDiscardDraft()) return
          setActiveSectionId(section.id)
          setActiveTaskId(null)
          setDraft('')
          setIsEditing(false)
          setIsFullscreen(false)
        }} />
        <div className="obsidian-vault__workspace">
          {activeSection ? <>
            <div className="obsidian-vault__toolbar">
              <div><p className="obsidian-vault__label">Current folder</p><input className="field obsidian-vault__name-input" onBlur={() => void saveVaultName(activeSection)} onChange={(event) => setVaultNameDrafts((current) => ({ ...current, [activeSection.id]: event.target.value }))} onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur()
              }} value={vaultNameDrafts[activeSection.id] ?? activeSection.name} /></div>
              <ObsidianDropzone compact buttonLabel="Add files" description="Drop more .md files or a ZIP into this folder." onImport={async (input) => {
                await onImportObsidianNotesIntoSection(activeSection.id, input)
                return `Added ${input.notes.length} notes to "${activeSection.name}".`
              }} title="Add to folder" />
            </div>
            <div className="obsidian-vault__panes">
              <NotebookFileBrowser activeNoteId={activeNote?.id ?? null} notebookName={activeSection.name} notes={activeNotes} isEditing={isEditing} onCreateFolder={async (name) => {
                await createNote(`${name}/Untitled.md`, `# ${fileName(name)}\n\n`)
              }} onCreateNote={async (path) => {
                const normalized = normalizePath(path)
                await createNote(path, `# ${fileName(normalized).replace(/\.md$/i, '')}\n\n`)
              }} onEdit={() => {
                setDraft(activeNote?.notes ?? '')
                setIsEditing(true)
              }} onPreview={() => {
                if (canDiscardDraft()) setIsEditing(false)
              }} onSelect={selectNote} />
              <NotebookEditor draft={draft} isDirty={isDirty} isEditing={isEditing} isFullscreen={isFullscreen} note={activeNote} pathDraft={activeNote ? notePathDrafts[activeNote.id] ?? notePath(activeNote) : ''} onCancel={() => {
                setDraft(activeNote?.notes ?? '')
                setIsEditing(false)
              }} onDelete={() => {
                if (activeNote && window.confirm(`Delete ${fileName(notePath(activeNote))}? This cannot be undone.`)) void onDeleteTask(activeNote.id)
              }} onDownload={downloadActiveNote} onDraftChange={setDraft} onEdit={() => {
                setDraft(activeNote?.notes ?? '')
                setIsEditing(true)
              }} onFullscreenToggle={() => setIsFullscreen((value) => !value)} onPathChange={(value) => {
                if (activeNote) setNotePathDrafts((current) => ({ ...current, [activeNote.id]: value }))
              }} onPathSave={() => void saveNotePath()} onSave={() => void saveActiveNote()} />
            </div>
          </> : <div className="obsidian-vault__empty-note">Import a ZIP or Markdown files to start a vault.</div>}
        </div>
      </div>
    </section>
  )
}
