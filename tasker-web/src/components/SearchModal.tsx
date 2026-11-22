import { useState } from 'react'
import type { Task } from '../features/tasks/types'
import { viewUrl, followLink } from '../app/routes'
import { useSearch } from '../features/tasks/useSearch'
import { Dialog } from './Dialog'

export function SearchModal({ tasks, onClose }: { tasks: Task[]; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const response = useSearch(query)
  const results = query.trim() ? (response?.rows ?? []) : tasks.slice(0, 12)
  return (
    <Dialog wide label="Search tasks and notes" onClose={onClose}>
      <div className="modal-header">
        <h2>Search tasks and notes</h2>
        <button className="button" onClick={onClose}>
          Close
        </button>
      </div>
      <input
        className="field search-field"
        aria-label="Search tasks and notes"
        data-initial-focus
        placeholder="Search titles, notes, or sections…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'ArrowDown') {
            const first = e.currentTarget.parentElement?.querySelector<HTMLAnchorElement>('.search-result')
            if (first) {
              e.preventDefault()
              if (e.key === 'Enter') first.click()
              else first.focus()
            }
          }
        }}
      />
      <div className="search-results">
        {results.map((task) => {
          const url =
            task.kind === 'note' ? viewUrl('obsidian', { note: task.id }) : viewUrl('dashboard', { task: task.id })
          return (
            <a
              href={url}
              className="search-result"
              key={task.id}
              onClick={(event) => {
                followLink(event, url)
                if (event.defaultPrevented) onClose()
              }}
            >
              <div>
                <strong>{task.title}</strong>
                <span>{task.notes || task.source_path || task.section_name || 'Inbox'}</span>
              </div>
              <span className="pill">{task.kind === 'note' ? 'Note' : task.status}</span>
            </a>
          )
        })}
      </div>
      {response?.error && <p role="alert">{response.error}</p>}
      {!results.length && !response?.error && (
        <p role="status">{query && !response ? 'Searching…' : 'No matching records.'}</p>
      )}
    </Dialog>
  )
}
