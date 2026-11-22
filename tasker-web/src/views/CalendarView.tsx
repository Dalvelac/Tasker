import { effectiveStatus } from '../../shared/planner'
import { todayKey } from '../lib/dates'
import { viewUrl, followLink } from '../app/routes'
import { useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { SectionPicker } from '../components/SectionPicker'
import { TaskForm } from '../components/TaskForm'
import type { Section } from '../features/sections/types'
import type { Task, TaskInput, TaskPriority, TaskStatus } from '../features/tasks/types'
import { sortTasks } from '../features/tasks/utils'
import { addMonths, formatDateKey, formatMonthLabel, getMonthCalendarDays, monthKey } from '../lib/dates'

type CalendarViewProps = {
  selectedDate: string | null
  month: string
  onSelect: (date: string | null, month: string) => void
  sections: Section[]
  tasks: Task[]
  onCreateTask: (input: TaskInput) => Promise<void>
}

const statuses: Array<'all' | TaskStatus> = ['all', 'pending', 'in_progress', 'done', 'cancelled', 'postponed']
const priorities: Array<'all' | TaskPriority> = ['all', 'low', 'normal', 'high', 'urgent']

export function CalendarView({ sections, tasks, onCreateTask, selectedDate, month, onSelect }: CalendarViewProps) {
  const [sectionId, setSectionId] = useState<number | null>(null)
  const [status, setStatus] = useState<'all' | TaskStatus>('all')
  const [priority, setPriority] = useState<'all' | TaskPriority>('all')
  const calendarDays = getMonthCalendarDays(month)
  const currentMonth = monthKey()
  const visibleTasks = tasks.filter((task) => {
    if (!task.date) return false
    if (sectionId !== null && (task.section_id ?? -1) !== sectionId) return false
    if (status !== 'all' && effectiveStatus(task, todayKey()) !== status) return false
    if (priority !== 'all' && task.priority !== priority) return false
    return true
  })
  const selectedTasks = selectedDate ? sortTasks(visibleTasks.filter((task) => task.date === selectedDate)) : []

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="view-eyebrow">Calendar</p>
          <h2 className="view-title">Calendar View</h2>
          <p className="view-description">Month view with section colors, day summaries and quick creation.</p>
        </div>
      </div>

      <div className="calendar-monthbar card card--pad">
        <div>
          <p className="view-eyebrow">Viewing month</p>
          <h3 className="calendar-monthbar__title">{formatMonthLabel(month)}</h3>
          <p className="calendar-monthbar__meta">Current month: {formatMonthLabel(currentMonth)}</p>
        </div>
        <div className="inline-actions">
          <button className="button" onClick={() => onSelect(null, addMonths(month, -1))} type="button">
            Previous
          </button>
          <button className="button button--primary" onClick={() => onSelect(null, currentMonth)} type="button">
            Current month
          </button>
          <button className="button" onClick={() => onSelect(null, addMonths(month, 1))} type="button">
            Next
          </button>
        </div>
      </div>

      <div className="calendar-toolbar card card--pad">
        <SectionPicker filter sections={sections} value={sectionId} onChange={setSectionId} />
        <select
          aria-label="Filter by status"
          className="select"
          onChange={(event) => setStatus(event.target.value as TaskStatus | 'all')}
          value={status}
        >
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item === 'all' ? 'all statuses' : item}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by priority"
          className="select"
          onChange={(event) => setPriority(event.target.value as TaskPriority | 'all')}
          value={priority}
        >
          {priorities.map((item) => (
            <option key={item} value={item}>
              {item === 'all' ? 'all priorities' : item}
            </option>
          ))}
        </select>
      </div>

      <div className="calendar-layout">
        <div className="card calendar-card">
          <div className="calendar-weekdays">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {calendarDays.map((day) => {
              const dayTasks = sortTasks(visibleTasks.filter((task) => task.date === day.key))

              return (
                <button
                  className={`calendar-day ${day.isCurrentMonth ? '' : 'is-muted'} ${day.isToday ? 'is-today' : ''} ${
                    selectedDate === day.key ? 'is-selected' : ''
                  }`}
                  aria-label={day.key}
                  aria-pressed={selectedDate === day.key}
                  key={day.key}
                  onClick={() => onSelect(day.key, day.key.slice(0, 7))}
                  type="button"
                >
                  <span className="calendar-day__number">{day.day}</span>
                  <span className="calendar-day__count">{dayTasks.length}</span>
                  <span className="calendar-day__tasks">
                    {dayTasks.slice(0, 3).map((task) => (
                      <span
                        className={`calendar-task ${task.type === 'time_block' ? 'is-time-block' : ''}`}
                        key={task.id}
                      >
                        <span style={{ background: task.section_color ?? '#9CA3AF' }} />
                        {task.type === 'time_block' ? 'block ' : ''}
                        {task.start_time ? `${task.start_time} ` : ''}
                        {task.title}
                      </span>
                    ))}
                    {dayTasks.length > 3 && <span className="calendar-more">+{dayTasks.length - 3} more</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <aside className="card card--pad">
          <h3 className="card-title">
            {selectedDate ? `Create on ${formatDateKey(selectedDate)}` : 'Select a day'}
          </h3>
          {selectedDate ? (
            <TaskForm
              compact
              defaults={{ date: selectedDate }}
              sections={sections}
              submitLabel="Add task"
              onSubmit={(input) => onCreateTask({ ...input, date: selectedDate })}
            />
          ) : (
            <EmptyState title="No day selected" detail="Click a calendar day to create a dated task." />
          )}

          <h3 className="card-title" style={{ marginTop: 20 }}>
            Day summary
          </h3>
          <div className="task-list">
            {selectedTasks.length === 0 ? (
              <EmptyState title="No tasks" detail="This day has no visible tasks for the current filters." />
            ) : (
              selectedTasks.map((task) => (
                <div className={`mini-task ${task.type === 'time_block' ? 'is-time-block' : ''}`} key={task.id}>
                  <span style={{ background: task.section_color ?? '#9CA3AF' }} />
                  <a
                    href={viewUrl('calendar', { date: selectedDate, task: task.id })}
                    onClick={(event) =>
                      followLink(event, viewUrl('calendar', { date: selectedDate, task: task.id }))
                    }
                  >
                    {task.title}
                  </a>
                  <em>
                    {task.type === 'time_block' ? 'block ' : ''}
                    {task.start_time ?? 'no time'}
                    {task.end_time ? `-${task.end_time}` : ''}
                  </em>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}
