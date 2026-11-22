import { useSearch } from '../../tasks/useSearch'
import { useMemo, useState } from 'react'
import type { Task } from '../../tasks/types'
import { fileName, groupNotes, notePath, type NoteSort } from '../utils'

interface NotebookFileBrowserProps {
  activeNoteId: number | null
  sectionId: number | null
  notebookName: string
  notes: Task[]
  onCreateFolder: (name: string) => Promise<void>
  onCreateNote: (path: string) => Promise<void>
  onSelect: (note: Task) => void
}

export function NotebookFileBrowser({
  sectionId,
  activeNoteId,
  notebookName,
  notes,
  onCreateFolder,
  onCreateNote,
  onSelect,
}: NotebookFileBrowserProps) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<NoteSort>('path')
  const [folderName, setFolderName] = useState('')
  const [noteName, setNoteName] = useState('')

  const response = useSearch(query, sectionId)
  const visibleNotes = useMemo(() => (query.trim() ? (response?.rows ?? []) : notes), [notes, query, response])

  async function createFolder() {
    if (!folderName.trim()) return
    try {
      await onCreateFolder(folderName.trim())
      setFolderName('')
    } catch {
      /* Keep entered name. */
    }
  }

  async function createNote() {
    if (!noteName.trim()) return
    try {
      await onCreateNote(noteName.trim())
      setNoteName('')
    } catch {
      /* Keep entered path. */
    }
  }

  return (
    <aside className="obsidian-vault__files" aria-label={`${notebookName} files`}>
      <div className="obsidian-vault__files-heading">
        <p className="obsidian-vault__label">Files</p>
        <small>{notes.length} total</small>
      </div>
      <div className="obsidian-vault__search-row">
        <input
          aria-label="Search notes"
          className="field"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search path or content…"
          type="search"
          value={query}
        />
        <select
          aria-label="Sort notes"
          className="select"
          onChange={(event) => setSort(event.target.value as NoteSort)}
          value={sort}
        >
          <option value="path">A–Z</option>
          <option value="updated">Recent</option>
        </select>
      </div>
      {sectionId !== null && (
        <>
          <div className="obsidian-vault__quick-create">
            <input
              aria-label="New folder name"
              className="field"
              onChange={(event) => setFolderName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void createFolder()
              }}
              placeholder="New folder"
              value={folderName}
            />
            <button className="button" onClick={createFolder} type="button">
              Folder
            </button>
          </div>
          <div className="obsidian-vault__quick-create">
            <input
              aria-label="New note path"
              className="field"
              onChange={(event) => setNoteName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void createNote()
              }}
              placeholder="New note.md or folder/note.md"
              value={noteName}
            />
            <button className="button" onClick={createNote} type="button">
              Note
            </button>
          </div>
        </>
      )}
      {response?.error && <p role="alert">{response.error}</p>}
      {visibleNotes.length === 0 ? (
        <p className="obsidian-vault__empty">
          {query.trim() && !response ? 'Searching…' : notes.length === 0 ? 'This folder is empty.' : `No notes match “${query.trim()}”.`}
        </p>
      ) : (
        groupNotes(visibleNotes, sort).map(([group, groupNotes]) => (
          <div className="obsidian-vault__file-group" key={group}>
            <p className="obsidian-vault__file-group-name">{group}</p>
            {groupNotes.map((note) => (
              <button
                className={`obsidian-vault__file ${activeNoteId === note.id ? 'is-active' : ''}`}
                key={note.id}
                onClick={() => onSelect(note)}
                type="button"
              >
                <span>{fileName(notePath(note))}</span>
                <small>{notePath(note)}</small>
              </button>
            ))}
          </div>
        ))
      )}
    </aside>
  )
}
