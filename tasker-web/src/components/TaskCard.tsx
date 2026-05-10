import { useState } from 'react'
import type { Section } from '../features/sections/types'
import type { Task, TaskInput, TaskPriority } from '../features/tasks/types'
import { isBeforeToday } from '../lib/dates'
import { SectionPicker } from './SectionPicker'

type TaskCardProps = {
  task: Task
  sections: Section[]
  onDelete: (id: number) => Promise<void>
  onToggle: (id: number) => Promise<void>
  onUpdate: (id: number, input: TaskInput) => Promise<void>
}

const priorities: TaskPriority[] = ['low', 'normal', 'high', 'urgent']

export function TaskCard({ task, sections, onDelete, onToggle, onUpdate }: TaskCardProps) {
  const [sectionId, setSectionId] = useState<number | null>(task.section_id)
  const [date, setDate] = useState(task.date ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
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
            <button className="button button--danger" onClick={() => onDelete(task.id)} type="button">
              Delete
            </button>
          </div>
        </div>

        <div className="task-meta">
          <span className="pill">{task.section_name ?? 'Inbox'}</span>
          <span className={`pill ${task.priority === 'urgent' ? 'pill--urgent' : ''}`}>{task.priority}</span>
          <span className="pill">{task.start_time ?? 'sin hora'}</span>
          {task.date && <span className="pill">{isBeforeToday(task.date) ? `overdue ${task.date}` : task.date}</span>}
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
      </div>
    </article>
  )
}
