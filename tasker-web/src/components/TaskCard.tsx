import { useState } from 'react'
import type { Section } from '../features/sections/types'
import type { Task, TaskInput, TaskPriority, TaskStatus, TaskType } from '../features/tasks/types'
import { formatDateKey, isBeforeToday } from '../lib/dates'
import { SectionPicker } from './SectionPicker'

type TaskCardProps = {
  task: Task
  sections: Section[]
  onDelete: (id: number) => Promise<void>
  onToggle: (id: number) => Promise<void>
  onUpdate: (id: number, input: TaskInput) => Promise<void>
}

const priorities: TaskPriority[] = ['low', 'normal', 'high', 'urgent']
const statuses: TaskStatus[] = ['pending', 'in_progress', 'done', 'cancelled', 'postponed']
const taskTypes: TaskType[] = ['task', 'event', 'time_block']

export function TaskCard({ task, sections, onDelete, onToggle, onUpdate }: TaskCardProps) {
  const [sectionId, setSectionId] = useState<number | null>(task.section_id)
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes ?? '')
  const [date, setDate] = useState(task.date ?? '')
  const [startTime, setStartTime] = useState(task.start_time ?? '')
  const [endTime, setEndTime] = useState(task.end_time ?? '')
  const [durationMinutes, setDurationMinutes] = useState(task.duration_minutes?.toString() ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [type, setType] = useState<TaskType>(task.type)
  const [isEditing, setIsEditing] = useState(false)
  const accent = task.section_color ?? '#9CA3AF'
  const isDone = task.status === 'done'

  async function updateSection(value: number | null) {
    setSectionId(value)
    await onUpdate(task.id, { section_id: value })
  }

  async function updateDate(value: string) {
    setDate(value)
    await onUpdate(task.id, { date: value || null })
  }

  async function updatePriority(value: TaskPriority) {
    setPriority(value)
    await onUpdate(task.id, { priority: value })
  }

  async function saveDetails() {
    const duration = durationMinutes ? Number(durationMinutes) : null

    await onUpdate(task.id, {
      title: title.trim(),
      notes: notes.trim() || null,
      section_id: sectionId,
      date: date || null,
      start_time: startTime || null,
      end_time: endTime || null,
      duration_minutes: Number.isFinite(duration) ? duration : null,
      priority,
      status,
      type,
    })
    setIsEditing(false)
  }

  return (
    <article className={`task-card ${isDone ? 'is-done' : ''}`}>
      <span className="task-card__accent" style={{ background: accent }} />
      <div className="task-card__main">
        <div className="task-card__top">
          <div>
            <h3 className="task-card__title">{task.title}</h3>
            {task.notes && <p className="task-card__notes">{task.notes}</p>}
          </div>

          <div className="task-actions">
            <button className="button" onClick={() => onToggle(task.id)} type="button">
              {isDone ? 'Reopen' : 'Done'}
            </button>
            <button className="button" onClick={() => setIsEditing((value) => !value)} type="button">
              {isEditing ? 'Close' : 'Edit'}
            </button>
            <button className="button button--danger" onClick={() => onDelete(task.id)} type="button">
              Delete
            </button>
          </div>
        </div>

        <div className="task-meta">
          <span className="pill">{task.section_name ?? 'Inbox'}</span>
          <span className={`pill ${task.priority === 'urgent' ? 'pill--urgent' : ''}`}>{task.priority}</span>
          <span className="pill">{task.type}</span>
          <span className="pill">{task.start_time ?? 'sin hora'}</span>
          {task.end_time && <span className="pill">to {task.end_time}</span>}
          {task.date && (
            <span className="pill">
              {isBeforeToday(task.date) ? `overdue ${formatDateKey(task.date)}` : formatDateKey(task.date)}
            </span>
          )}
        </div>

        <div className="task-editor">
          <SectionPicker sections={sections} value={sectionId} onChange={updateSection} />
          <input className="field" onChange={(event) => updateDate(event.target.value)} type="date" value={date} />
          <select
            className="select"
            onChange={(event) => updatePriority(event.target.value as TaskPriority)}
            value={priority}
          >
            {priorities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {isEditing && (
          <div className="task-editor task-editor--expanded">
            <label className="form-label">
              Title
              <input className="field" onChange={(event) => setTitle(event.target.value)} value={title} />
            </label>
            <label className="form-label">
              Notes
              <textarea className="textarea" onChange={(event) => setNotes(event.target.value)} value={notes} />
            </label>
            <label className="form-label">
              Start
              <input className="field" onChange={(event) => setStartTime(event.target.value)} type="time" value={startTime} />
            </label>
            <label className="form-label">
              End
              <input className="field" onChange={(event) => setEndTime(event.target.value)} type="time" value={endTime} />
            </label>
            <label className="form-label">
              Duration
              <input
                className="field"
                min="0"
                onChange={(event) => setDurationMinutes(event.target.value)}
                placeholder="minutes"
                type="number"
                value={durationMinutes}
              />
            </label>
            <label className="form-label">
              Status
              <select
                className="select"
                onChange={(event) => setStatus(event.target.value as TaskStatus)}
                value={status}
              >
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-label">
              Type
              <select className="select" onChange={(event) => setType(event.target.value as TaskType)} value={type}>
                {taskTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <button className="button button--primary" onClick={saveDetails} type="button">
              Save details
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
