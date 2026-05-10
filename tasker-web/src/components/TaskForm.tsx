import { useState, type FormEvent } from 'react'
import type { Section } from '../features/sections/types'
import type { TaskInput, TaskPriority } from '../features/tasks/types'
import { SectionPicker } from './SectionPicker'

type TaskFormProps = {
  sections: Section[]
  compact?: boolean
  defaults?: TaskInput
  submitLabel?: string
  onSubmit: (input: TaskInput) => Promise<void>
}

const priorities: TaskPriority[] = ['low', 'normal', 'high', 'urgent']

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
  const [isSubmitting, setIsSubmitting] = useState(false)

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

      <button className="button button--primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}
