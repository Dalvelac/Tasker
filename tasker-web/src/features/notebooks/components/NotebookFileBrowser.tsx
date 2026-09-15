import { useMemo, useState } from 'react'
import type { Task } from '../../tasks/types'
import { fileName, groupNotes, naturalCompare, notePath, type NoteSort } from '../utils'

interface NotebookFileBrowserProps {
  activeNoteId: number | null
  notebookName: string
  notes: Task[]
  isEditing: boolean
  onCreateFolder: (name: string) => Promise<void>
  onCreateNote: (path: string) => Promise<void>
  onEdit: () => void
  onPreview: () => void
  onSelect: (note: Task) => void
}

export function NotebookFileBrowser({ activeNoteId, notebookName, notes, isEditing, onCreateFolder, onCreateNote, onEdit, onPreview, onSelect }: NotebookFileBrowserProps) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<NoteSort>('path')
  const [folderName, setFolderName] = useState('')
  const [noteName, setNoteName] = useState('')

  const visibleNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return notes
      .filter((note) => !normalizedQuery || `${notePath(note)}\n${note.title}\n${note.notes ?? ''}`.toLocaleLowerCase().includes(normalizedQuery))
      .sort((left, right) => sort === 'updated' ? right.updated_at.localeCompare(left.updated_at) : naturalCompare(notePath(left), notePath(right)))
  }, [notes, query, sort])

  async function createFolder() {
    if (!folderName.trim()) return
    await onCreateFolder(folderName.trim())
    setFolderName('')
  }

  async function createNote() {
    if (!noteName.trim()) return
    await onCreateNote(noteName.trim())
    setNoteName('')
  }

  return (
    <aside className="obsidian-vault__files" aria-label={`${notebookName} files`}>
      <div className="obsidian-vault__files-heading"><p className="obsidian-vault__label">Files</p><small>{notes.length} total</small></div>
      <div className="obsidian-vault__search-row">
        <input aria-label="Search notes" className="field" onChange={(event) => setQuery(event.target.value)} placeholder="Search path or content…" type="search" value={query} />
        <select aria-label="Sort notes" className="select" onChange={(event) => setSort(event.target.value as NoteSort)} value={sort}>
          <option value="path">A–Z</option><option value="updated">Recent</option>
        </select>
      </div>
      <div className="obsidian-vault__mode-tabs" aria-label="Note mode">
        <button className={`obsidian-vault__mode ${!isEditing ? 'is-active' : ''}`} onClick={onPreview} title="Preview mode" type="button">◐</button>
        <button className={`obsidian-vault__mode ${isEditing ? 'is-active' : ''}`} onClick={onEdit} title="Edit mode" type="button">✎</button>
      </div>
      <div className="obsidian-vault__quick-create">
        <input className="field" onChange={(event) => setFolderName(event.target.value)} onKeyDown={(event) => {
          if (event.key === 'Enter') void createFolder()
        }} placeholder="New folder" value={folderName} />
        <button className="button" onClick={createFolder} type="button">Folder</button>
      </div>
      <div className="obsidian-vault__quick-create">
        <input className="field" onChange={(event) => setNoteName(event.target.value)} onKeyDown={(event) => {
          if (event.key === 'Enter') void createNote()
        }} placeholder="New note.md or folder/note.md" value={noteName} />
        <button className="button" onClick={createNote} type="button">Note</button>
      </div>
      {visibleNotes.length === 0 ? (
        <p className="obsidian-vault__empty">{notes.length === 0 ? 'This folder is empty.' : `No notes match “${query.trim()}”.`}</p>
      ) : groupNotes(visibleNotes).map(([group, groupNotes]) => (
        <div className="obsidian-vault__file-group" key={group}>
          <p className="obsidian-vault__file-group-name">{group}</p>
          {groupNotes.map((note) => (
            <button className={`obsidian-vault__file ${activeNoteId === note.id ? 'is-active' : ''}`} key={note.id} onClick={() => onSelect(note)} type="button">
              <span>{fileName(notePath(note))}</span><small>{notePath(note)}</small>
            </button>
          ))}
        </div>
      ))}
    </aside>
  )
}
