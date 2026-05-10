import { useEffect, useMemo, useRef, useState } from 'react'
import type { Task } from '../features/tasks/types'
import { formatDateKey } from '../lib/dates'

type SearchModalProps = {
  tasks: Task[]
  onClose: () => void
}

export function SearchModal({ tasks, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    if (!normalized) {
      return tasks.slice(0, 12)
    }

    return tasks
      .filter((task) =>
        [task.title, task.notes, task.section_name, task.priority, task.status]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized)),
      )
      .slice(0, 20)
  }, [query, tasks])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        aria-label="Search tasks"
        aria-modal="true"
        className="modal-panel modal-panel--wide"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="modal-header">
          <div>
            <p className="view-eyebrow">Ctrl K</p>
            <h2 className="modal-title">Search</h2>
          </div>
          <button className="button" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <input
          className="field search-field"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, notes, section..."
          ref={inputRef}
          value={query}
        />
        <div className="search-results">
          {results.map((task) => (
            <article className="search-result" key={task.id}>
              <div>
                <strong>{task.title}</strong>
                <span>{task.notes ?? task.section_name ?? 'Inbox'}</span>
              </div>
              <div className="task-meta">
                <span className="pill">{task.date ? formatDateKey(task.date) : 'unscheduled'}</span>
                <span className="pill">{task.status}</span>
                <span className="pill">{task.priority}</span>
              </div>
            </article>
          ))}
          {results.length === 0 && <div className="empty-state">No tasks found.</div>}
        </div>
      </div>
    </div>
  )
}
