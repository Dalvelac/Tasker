import { useState } from 'react'
import type { RecurrenceType, Task, TaskInput } from '../features/tasks/types'

type RecurrenceModalProps = {
  task: Task
  onClose: () => void
  onUpdateTask: (id: number, input: TaskInput) => Promise<void>
}

const recurrenceTypes: Array<RecurrenceType | 'none'> = ['none', 'daily', 'weekly', 'monthly']

export function RecurrenceModal({ task, onClose, onUpdateTask }: RecurrenceModalProps) {
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType | 'none'>(task.recurrence_type ?? 'none')
  const [recurrenceInterval, setRecurrenceInterval] = useState(task.recurrence_interval?.toString() ?? '1')
  const [recurrenceUntil, setRecurrenceUntil] = useState(task.recurrence_until ?? '')
  const [isSaving, setIsSaving] = useState(false)

  async function save() {
    setIsSaving(true)
    await onUpdateTask(task.id, {
      recurrence_type: recurrenceType === 'none' ? null : recurrenceType,
      recurrence_interval: recurrenceType === 'none' ? null : Number(recurrenceInterval) || 1,
      recurrence_until: recurrenceType === 'none' ? null : recurrenceUntil || null,
    })
    setIsSaving(false)
    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        aria-label="Configure recurrence"
        aria-modal="true"
        className="modal-panel"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="modal-header">
          <div>
            <p className="view-eyebrow">Ctrl R</p>
            <h2 className="modal-title">Repeat task</h2>
            <p className="view-description">{task.title}</p>
          </div>
          <button className="button" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="form-grid">
          <label className="form-label">
            Repeats
            <select
              className="select"
              onChange={(event) => setRecurrenceType(event.target.value as RecurrenceType | 'none')}
              value={recurrenceType}
            >
              {recurrenceTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid form-grid--columns">
            <label className="form-label">
              Every
              <input
                className="field"
                disabled={recurrenceType === 'none'}
                min="1"
                onChange={(event) => setRecurrenceInterval(event.target.value)}
                type="number"
                value={recurrenceInterval}
              />
            </label>
            <label className="form-label">
              Until
              <input
                className="field"
                disabled={recurrenceType === 'none'}
                onChange={(event) => setRecurrenceUntil(event.target.value)}
                type="date"
                value={recurrenceUntil}
              />
            </label>
          </div>
          <button className="button button--primary" disabled={isSaving} onClick={save} type="button">
            {isSaving ? 'Saving...' : 'Save recurrence'}
          </button>
        </div>
      </div>
    </div>
  )
}
