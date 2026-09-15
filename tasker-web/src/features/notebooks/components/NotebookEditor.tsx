import { MarkdownPreview } from '../../../components/MarkdownPreview'
import type { Task } from '../../tasks/types'
import { fileName, notePath, noteWordCount } from '../utils'

interface NotebookEditorProps {
  draft: string
  isDirty: boolean
  isEditing: boolean
  isFullscreen: boolean
  note: Task | null
  pathDraft: string
  onCancel: () => void
  onDelete: () => void
  onDownload: () => void
  onDraftChange: (value: string) => void
  onEdit: () => void
  onFullscreenToggle: () => void
  onPathChange: (value: string) => void
  onPathSave: () => void
  onSave: () => void
}

export function NotebookEditor({ draft, isDirty, isEditing, isFullscreen, note, pathDraft, onCancel, onDelete, onDownload, onDraftChange, onEdit, onFullscreenToggle, onPathChange, onPathSave, onSave }: NotebookEditorProps) {
  return (
    <article className={`obsidian-vault__note ${isFullscreen ? 'is-fullscreen' : ''}`}>
      {note ? (
        <>
          <div className="obsidian-vault__note-header">
            <div>
              <p className="obsidian-vault__label">{isDirty ? 'Unsaved changes' : 'Saved'} · {noteWordCount(isEditing ? draft : note.notes ?? '')} words</p>
              <input className="field obsidian-vault__name-input" onBlur={onPathSave} onChange={(event) => onPathChange(event.target.value)} onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur()
              }} value={pathDraft} />
            </div>
            <div className="inline-actions obsidian-vault__icon-actions">
              {isEditing ? <><button className="icon-button icon-button--primary" onClick={onSave} title="Save" type="button">✓</button><button className="icon-button" onClick={onCancel} title="Cancel" type="button">×</button></> : <button className="icon-button" onClick={onEdit} title="Edit" type="button">✎</button>}
              <button aria-label="Download Markdown file" className="icon-button" onClick={onDownload} title="Download .md" type="button">↓</button>
              <button className="icon-button" onClick={onFullscreenToggle} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} type="button">{isFullscreen ? '↙' : '⛶'}</button>
              <button className="icon-button icon-button--danger" onClick={onDelete} title={`Delete ${fileName(notePath(note))}`} type="button">🗑</button>
            </div>
          </div>
          <div className={`obsidian-vault__note-body ${isEditing ? 'is-editing' : ''}`}>
            {isEditing ? <textarea className="textarea obsidian-vault__editor" onChange={(event) => onDraftChange(event.target.value)} spellCheck value={draft} /> : <MarkdownPreview value={note.notes ?? ''} />}
          </div>
        </>
      ) : <div className="obsidian-vault__empty-note">Select a Markdown file.</div>}
    </article>
  )
}
