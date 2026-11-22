import { Dialog } from './Dialog'
import { useState } from 'react'
import type { RecurrenceType, Task, TaskInput } from '../features/tasks/types'
import { formatRecurrenceLabel, getTaskWeekday } from '../features/tasks/utils'

type RecurrenceModalProps = {
  task: Task
  onClose: () => void
  onUpdateTask: (id: number, input: TaskInput) => Promise<void>
}

const recurrenceTypes: Array<RecurrenceType | 'none'> = ['none', 'daily', 'weekly', 'monthly']
const weekdays = [
  { value: '1', label: 'Mon' },
  { value: '2', label: 'Tue' },
  { value: '3', label: 'Wed' },
  { value: '4', label: 'Thu' },
  { value: '5', label: 'Fri' },
  { value: '6', label: 'Sat' },
  { value: '0', label: 'Sun' },
]

function parseDays(days: string | null, fallbackDate: string | null) {
  const fallback = getTaskWeekday(fallbackDate)
  return new Set((days || fallback || '').split(',').filter(Boolean))
}

function serializeDays(days: Set<string>) {
  return weekdays
    .map((day) => day.value)
    .filter((day) => days.has(day))
    .join(',')
}

export function RecurrenceModal({ task, onClose, onUpdateTask }: RecurrenceModalProps) {
  const [revision] = useState(task.revision)
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType | 'none'>(task.recurrence_type ?? 'none')
  const [recurrenceInterval, setRecurrenceInterval] = useState(task.recurrence_interval?.toString() ?? '1')
  const [recurrenceDays, setRecurrenceDays] = useState(() => parseDays(task.recurrence_days, task.date))
  const [recurrenceUntil, setRecurrenceUntil] = useState(task.recurrence_until ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const preview = formatRecurrenceLabel({
    ...task,
    recurrence_type: recurrenceType === 'none' ? null : recurrenceType,
    recurrence_interval: Number(recurrenceInterval) || 1,
    recurrence_days: recurrenceType === 'weekly' ? serializeDays(recurrenceDays) : null,
    recurrence_until: recurrenceUntil || null,
  })

  function toggleWeekday(day: string) {
    setRecurrenceDays((current) => {
      const next = new Set(current)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  async function save() {
    const selectedDays = serializeDays(recurrenceDays)

    setIsSaving(true)
    try {
      await onUpdateTask(task.id, {
        expectedRevision: revision,
        recurrence_type: recurrenceType === 'none' ? null : recurrenceType,
        recurrence_interval: recurrenceType === 'none' ? null : Number(recurrenceInterval) || 1,
        recurrence_days: recurrenceType === 'weekly' ? selectedDays || null : null,
        recurrence_until: recurrenceType === 'none' ? null : recurrenceUntil || null,
      })
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save recurrence')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog label="Configure recurrence" onClose={onClose}>
      <div className="modal-header">
        <div>
          <h2 className="modal-title">Repeat task</h2>
          <p className="view-description">{task.title}</p>
        </div>
        <button className="button" onClick={onClose} type="button">
          Close
        </button>
      </div>

      <div className="form-grid">
        {error && <p role="alert">{error}</p>}
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

        {recurrenceType !== 'none' && (
          <>
            <label className="form-label">
              {recurrenceType === 'daily' && 'Repeat every N day(s)'}
              {recurrenceType === 'weekly' && 'Repeat every N week(s) on'}
              {recurrenceType === 'monthly' && 'Repeat every N month(s)'}
              <input
                className="field"
                min="1"
                onChange={(event) => setRecurrenceInterval(event.target.value)}
                type="number"
                value={recurrenceInterval}
              />
            </label>

            {recurrenceType === 'weekly' && (
              <div className="form-label">
                Weekdays
                <div className="weekday-picker">
                  {weekdays.map((day) => (
                    <button
                      className={`weekday-button ${recurrenceDays.has(day.value) ? 'is-selected' : ''}`}
                      key={day.value}
                      aria-pressed={recurrenceDays.has(day.value)}
                      onClick={() => toggleWeekday(day.value)}
                      type="button"
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                <span className="field-hint">If no day is selected, Tasker uses the task date weekday.</span>
              </div>
            )}

            {recurrenceType === 'monthly' && (
              <p className="field-hint">
                Repeats on the same day of the month. If the month is shorter, Tasker uses the last day of that
                month.
              </p>
            )}

            <label className="form-label">
              Repeat until
              <input
                className="field"
                onChange={(event) => setRecurrenceUntil(event.target.value)}
                type="date"
                value={recurrenceUntil}
              />
            </label>
          </>
        )}

        {preview && <span className="pill pill--recurring">{preview}</span>}

        <button className="button button--primary" disabled={isSaving} onClick={save} type="button">
          {isSaving ? 'Saving...' : 'Save recurrence'}
        </button>
      </div>
    </Dialog>
  )
}
