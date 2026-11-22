import { effectiveStatus } from '../../shared/planner'
import { getTask } from '../features/tasks/api'
import { viewUrl, followLink } from '../app/routes'
import { useState } from 'react'
import type { Section } from '../features/sections/types'
import type { RecurrenceType, Task, TaskInput, TaskPriority, TaskStatus, TaskType } from '../features/tasks/types'
import {
  addMinutesToTime,
  formatDuration,
  formatRecurrenceLabel,
  getTaskDurationMinutes,
  inferDayPeriodFromTime,
} from '../features/tasks/utils'
import { formatDateKey, isBeforeToday, todayKey } from '../lib/dates'
import { MarkdownPreview } from './MarkdownPreview'
import { SectionPicker } from './SectionPicker'

type TaskCardProps = {
  task: Task
  sections: Section[]
  readonly?: boolean
  onDelete: (id: number,revision?:number) => Promise<void>
  onToggle: (id: number,seen?:Task) => Promise<void>
  onUpdate: (id: number, input: TaskInput) => Promise<void>
}

const priorities: TaskPriority[] = ['low', 'normal', 'high', 'urgent']
const statuses: TaskStatus[] = ['pending', 'in_progress', 'done', 'cancelled', 'postponed']
const taskTypes: TaskType[] = ['task', 'event', 'time_block']
const durationPresets = [30, 60, 90]
const recurrenceTypes: Array<RecurrenceType | 'none'> = ['none', 'daily', 'weekly', 'monthly']

export function TaskCard({ task, sections, readonly, onDelete, onToggle, onUpdate }: TaskCardProps) {
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
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType | 'none'>(task.recurrence_type ?? 'none')
  const [recurrenceInterval, setRecurrenceInterval] = useState(task.recurrence_interval?.toString() ?? '1')
  const [recurrenceDays, setRecurrenceDays] = useState(task.recurrence_days ?? '')
  const [recurrenceUntil, setRecurrenceUntil] = useState(task.recurrence_until ?? '')
  const [baseline, setBaseline] = useState(task)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const accent = task.section_color ?? '#9CA3AF'
  const isDone = task.status === 'done'
  const isTimeBlock = task.type === 'time_block'
  const durationLabel = formatDuration(getTaskDurationMinutes(task))
  const recurrenceLabel = formatRecurrenceLabel(task)

  async function perform(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update task')
    } finally {
      setBusy(false)
    }
  }

  async function startEditing() {
    const current = await getTask(task.id)
    const currentStatus = effectiveStatus(current, todayKey())
    setBaseline({...current,status:currentStatus})
    setTitle(current.title)
    setNotes(current.notes ?? '')
    setSectionId(current.section_id)
    setDate(current.date ?? '')
    setStartTime(current.start_time ?? '')
    setEndTime(current.end_time ?? '')
    setDurationMinutes(current.duration_minutes?.toString() ?? '')
    setPriority(current.priority)
    setStatus(currentStatus)
    setType(current.type)
    setRecurrenceType(current.recurrence_type ?? 'none')
    setRecurrenceInterval(current.recurrence_interval?.toString() ?? '1')
    setRecurrenceDays(current.recurrence_days ?? '')
    setRecurrenceUntil(current.recurrence_until ?? '')
    setIsEditing(true)
  }
  async function saveDetails() {
    if (
      status === 'postponed' &&
      (baseline.status !== 'postponed' || date !== baseline.date) &&
      (!date || date <= todayKey())
    )
      throw new Error('Choose a future return date.')
    const duration = durationMinutes ? Number(durationMinutes) : null

    const edited: TaskInput = {
      title: title.trim(),
      notes: notes || null,
      section_id: sectionId,
      date: date || null,
      start_time: startTime || null,
      end_time: endTime || null,
      duration_minutes: Number.isFinite(duration) ? duration : null,
      priority,
      status,
      type,
      recurrence_type: recurrenceType === 'none' ? null : recurrenceType,
      recurrence_interval: recurrenceType === 'none' ? null : Number(recurrenceInterval) || 1,
      recurrence_days: recurrenceType === 'weekly' ? recurrenceDays || null : null,
      recurrence_until: recurrenceType === 'none' ? null : recurrenceUntil || null,
    }
    const changes = Object.fromEntries(
      Object.entries(edited).filter(([key, value]) => baseline[key as keyof Task] !== value),
    )
    if (Object.keys(changes).length) await onUpdate(task.id, { ...changes, expectedRevision: baseline.revision })
    setIsEditing(false)
  }

  async function makeBlock() {
    const nextStart = task.start_time || '09:00'
    const nextEnd = task.end_time || addMinutesToTime(nextStart, 60)
    const nextDate = task.date || todayKey()
    const nextPeriod = inferDayPeriodFromTime(nextStart)

    setStartTime(nextStart)
    setEndTime(nextEnd)
    setDate(nextDate)
    setType('time_block')
    await onUpdate(task.id, {
      type: 'time_block',
      date: nextDate,
      start_time: nextStart,
      end_time: nextEnd,
      day_period: nextPeriod,
    })
  }

  async function removeBlock() {
    setType('task')
    await onUpdate(task.id, { type: 'task', start_time: null, end_time: null, day_period: null })
  }

  function applyDurationPreset(minutes: number) {
    const nextStart = startTime || task.start_time || '09:00'

    setStartTime(nextStart)
    setEndTime(addMinutesToTime(nextStart, minutes))
    setDurationMinutes(String(minutes))
  }

  return (
    <article
      className={`task-card ${isDone ? 'is-done' : ''} ${isTimeBlock ? 'is-time-block' : ''}`}
      data-task-id={task.id}
      onMouseEnter={() => window.dispatchEvent(new CustomEvent('tasker:hover-task', { detail: task.id }))}
      onMouseLeave={() => window.dispatchEvent(new CustomEvent('tasker:hover-task', { detail: null }))}
    >
      <span className="task-card__accent" style={{ background: accent }} />
      <div className="task-card__main">
        <div className="task-card__top">
          <div>
            <h3 className="task-card__title">
              <a
                href={viewUrl('dashboard', { task: task.id })}
                onClick={(e) => followLink(e, viewUrl('dashboard', { task: task.id }))}
              >
                {task.title}
              </a>
            </h3>
            {task.linked_note_id && (
              <a
                href={viewUrl('obsidian', { note: task.linked_note_id })}
                onClick={(e) => followLink(e, viewUrl('obsidian', { note: task.linked_note_id }))}
              >
                Source note
              </a>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            {task.notes && <MarkdownPreview value={task.notes} />}
            {!!task.truncated && (
              <a
                href={viewUrl('dashboard', { task: task.id })}
                onClick={(e) => followLink(e, viewUrl('dashboard', { task: task.id }))}
              >
                Read full notes
              </a>
            )}
          </div>

          <div className="task-actions">
            <button
              className="button"
              disabled={busy}
              onClick={() => void perform(() => onToggle(task.id,task))}
              type="button"
            >
              {isDone ? 'Reopen' : 'Done'}
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => (isEditing ? setIsEditing(false) : void perform(startEditing))}
              type="button"
            >
              {isEditing ? 'Close' : 'Edit'}
            </button>
            {isTimeBlock ? (
              <button className="button" disabled={busy} onClick={() => void perform(removeBlock)} type="button">
                Remove block
              </button>
            ) : (
              <button className="button" disabled={busy} onClick={() => void perform(makeBlock)} type="button">
                Make block
              </button>
            )}
            <button
              className="button button--danger"
              disabled={busy}
              onClick={() => void perform(() => onDelete(task.id,task.revision))}
              type="button"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="task-meta">
          <span className="pill">{task.section_name ?? 'Inbox'}</span>
          <span className={`pill ${task.priority === 'urgent' ? 'pill--urgent' : ''}`}>{task.priority}</span>
          {recurrenceLabel && <span className="pill pill--recurring">{recurrenceLabel}</span>}
          <span className={`pill ${isTimeBlock ? 'pill--block' : ''}`}>{isTimeBlock ? 'block' : task.type}</span>
          <span className="pill">{task.start_time ?? 'no time'}</span>
          {task.end_time && <span className="pill">to {task.end_time}</span>}
          {durationLabel && <span className="pill">{durationLabel}</span>}
          {task.date && (
            <span className="pill">
              {!isDone && task.status !== 'cancelled' && isBeforeToday(task.date)
                ? `overdue ${formatDateKey(task.date)}`
                : formatDateKey(task.date)}
            </span>
          )}
        </div>

        {(!readonly || isEditing) && (
          <div className="task-editor">
            <SectionPicker
              sections={sections}
              value={isEditing ? sectionId : task.section_id}
              onChange={(v) =>
                isEditing ? setSectionId(v) : void perform(() => onUpdate(task.id, { section_id: v }))
              }
            />
            <label className="form-label">{(isEditing ? status : effectiveStatus(task,todayKey())) === 'postponed' ? 'Return on' : 'Task date'}<input
              className="field"
              onChange={(event) => {
                const v = event.target.value
                if (isEditing) setDate(v)
                else void perform(() => onUpdate(task.id, { date: v || null }))
              }}
              type="date"
              value={isEditing ? date : (task.date ?? '')}
            /></label>
            <select
              className="select"
              aria-label="Task priority"
              onChange={(event) => {
                const v = event.target.value as TaskPriority
                if (isEditing) setPriority(v)
                else void perform(() => onUpdate(task.id, { priority: v }))
              }}
              value={isEditing ? priority : task.priority}
            >
              {priorities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        )}

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
              Start {type === 'time_block' ? '*' : ''}
              <input
                className="field"
                onChange={(event) => setStartTime(event.target.value)}
                type="time"
                value={startTime}
              />
            </label>
            <label className="form-label">
              End {type === 'time_block' ? '*' : ''}
              <input
                className="field"
                onChange={(event) => setEndTime(event.target.value)}
                type="time"
                value={endTime}
              />
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
              <select
                className="select"
                onChange={(event) => setType(event.target.value as TaskType)}
                value={type}
              >
                {taskTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
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
              <label className="form-label">
                Weekdays
                <input
                  className="field"
                  onChange={(event) => setRecurrenceDays(event.target.value)}
                  placeholder="1,3,5 for Mon, Wed, Fri"
                  value={recurrenceDays}
                />
              </label>
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
            {type === 'time_block' && (
              <div className="form-label">
                Presets
                <div className="inline-actions">
                  {durationPresets.map((minutes) => (
                    <button
                      className="button"
                      key={minutes}
                      onClick={() => applyDurationPreset(minutes)}
                      type="button"
                    >
                      {minutes}m
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              className="button button--primary"
              disabled={busy}
              onClick={() => void perform(saveDetails)}
              type="button"
            >
              Save details
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
