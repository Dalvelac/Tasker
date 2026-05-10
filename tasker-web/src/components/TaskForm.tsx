import { useState, type FormEvent } from 'react'
import type { Section } from '../features/sections/types'
import type { RecurrenceType, TaskInput, TaskPriority } from '../features/tasks/types'
import { SectionPicker } from './SectionPicker'

type TaskFormProps = {
  sections: Section[]
  compact?: boolean
  defaults?: TaskInput
  submitLabel?: string
  onSubmit: (input: TaskInput) => Promise<void>
}

const priorities: TaskPriority[] = ['low', 'normal', 'high', 'urgent']
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

export function TaskForm({
  sections,
  compact = false,
  defaults = {},
  submitLabel = 'Create task',
  onSubmit,
}: TaskFormProps) {
  const [title, setTitle] = useState(defaults.title ?? '')
  const [notes, setNotes] = useState(defaults.notes ?? '')
  const [sectionId, setSectionId] = useState<number | null>(defaults.section_id ?? null)
  const [date, setDate] = useState(defaults.date ?? '')
  const [startTime, setStartTime] = useState(defaults.start_time ?? '')
  const [priority, setPriority] = useState<TaskPriority>(defaults.priority ?? 'normal')
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType | 'none'>(defaults.recurrence_type ?? 'none')
  const [recurrenceInterval, setRecurrenceInterval] = useState(defaults.recurrence_interval?.toString() ?? '1')
  const [recurrenceDays, setRecurrenceDays] = useState(new Set((defaults.recurrence_days ?? '').split(',').filter(Boolean)))
  const [recurrenceUntil, setRecurrenceUntil] = useState(defaults.recurrence_until ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function toggleWeekday(day: string) {
    setRecurrenceDays((current) => {
      const next = new Set(current)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  function serializedWeekdays() {
    return weekdays
      .map((day) => day.value)
      .filter((day) => recurrenceDays.has(day))
      .join(',')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!title.trim()) {
      return
    }

    setIsSubmitting(true)
    await onSubmit({
      title: title.trim(),
      notes: notes.trim() || null,
      section_id: sectionId,
      date: date || null,
      start_time: startTime || null,
      priority,
      status: 'pending',
      type: 'task',
      recurrence_type: recurrenceType === 'none' ? null : recurrenceType,
      recurrence_interval: recurrenceType === 'none' ? null : Number(recurrenceInterval) || 1,
      recurrence_days: recurrenceType === 'weekly' ? serializedWeekdays() || null : null,
      recurrence_until: recurrenceType === 'none' ? null : recurrenceUntil || null,
    })
    setIsSubmitting(false)
    setTitle('')
    setNotes('')
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label className="form-label">
        Title
        <input
          className="field"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Capture a task..."
          value={title}
        />
      </label>

      {!compact && (
        <label className="form-label">
          Notes
          <textarea
            className="textarea"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional notes"
            value={notes ?? ''}
          />
        </label>
      )}

      <div className="form-grid form-grid--columns">
        <label className="form-label">
          Section
          <SectionPicker sections={sections} value={sectionId} onChange={setSectionId} />
        </label>
        <label className="form-label">
          Priority
          <select
            className="select"
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
            value={priority}
          >
            {priorities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-grid form-grid--columns">
        <label className="form-label">
          Date
          <input className="field" onChange={(event) => setDate(event.target.value)} type="date" value={date ?? ''} />
        </label>
        <label className="form-label">
          Start
          <input
            className="field"
            onChange={(event) => setStartTime(event.target.value)}
            type="time"
            value={startTime ?? ''}
          />
        </label>
      </div>

      {!compact && (
        <div className="form-grid form-grid--columns">
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
          {recurrenceType === 'weekly' && (
            <div className="form-label">
              Weekdays
              <div className="weekday-picker">
                {weekdays.map((day) => (
                  <button
                    className={`weekday-button ${recurrenceDays.has(day.value) ? 'is-selected' : ''}`}
                    key={day.value}
                    onClick={() => toggleWeekday(day.value)}
                    type="button"
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}
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
      )}

      <button className="button button--primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}
