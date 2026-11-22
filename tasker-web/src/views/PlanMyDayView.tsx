import { Dialog } from '../components/Dialog'
import { useState, type DragEvent } from 'react'
import { EmptyState } from '../components/EmptyState'
import { TaskCard } from '../components/TaskCard'
import type { Section } from '../features/sections/types'
import type { DayPeriod, Task, TaskInput } from '../features/tasks/types'
import {
  dayPeriods,
  getEffectiveDayPeriod,
  getPlanCandidates,
  getTasksByPeriod,
  periodLabels,
} from '../features/tasks/utils'
import { formatDateKey, todayKey } from '../lib/dates'

type PlanMyDayViewProps = {
  sections: Section[]
  tasks: Task[]
  onDeleteTask: (id: number) => Promise<void>
  onToggleTask: (id: number) => Promise<void>
  onUpdateTask: (id: number, input: TaskInput) => Promise<void>
}

type CandidateGroupProps = {
  title: string
  tasks: Task[]
  sections: Section[]
  dropZone?: DropZone
  activeDropZone: DropZone | null
  onAssignPeriod: (task: Task, period: DayPeriod) => Promise<void>
  onUnschedule: (task: Task) => Promise<void>
  onDropTask: (event: DragEvent<HTMLElement>, zone: DropZone) => Promise<void>
  onDragStart: (event: DragEvent<HTMLElement>, task: Task) => void
  onDragEnd: () => void
  onDragEnterZone: (zone: DropZone) => void
  onDragLeaveZone: () => void
  onDeleteTask: (id: number) => Promise<void>
  onToggleTask: (id: number) => Promise<void>
  onUpdateTask: (id: number, input: TaskInput) => Promise<void>
}

type DropZone = DayPeriod | 'unscheduled'

function PeriodButtons({
  activePeriod,
  onAssignPeriod,
  onClearPeriod,
}: {
  activePeriod?: DayPeriod | null
  onAssignPeriod: (period: DayPeriod) => Promise<void>
  onClearPeriod?: () => Promise<void>
}) {
  return (
    <div className="period-actions">
      {dayPeriods.map((period) => (
        <button
          className={`button ${activePeriod === period ? 'button--primary' : ''}`}
          key={period}
          aria-pressed={period===activePeriod}
          onClick={() => void onAssignPeriod(period).catch(() => {})}
          type="button"
        >
          {periodLabels[period]}
        </button>
      ))}
      {onClearPeriod && (
        <button className="button" onClick={() => void onClearPeriod().catch(() => {})} type="button">
          Unblock
        </button>
      )}
    </div>
  )
}

function CandidateGroup({
  title,
  tasks,
  sections,
  dropZone,
  activeDropZone,
  onAssignPeriod,
  onUnschedule,
  onDropTask,
  onDragStart,
  onDragEnd,
  onDragEnterZone,
  onDragLeaveZone,
  onDeleteTask,
  onToggleTask,
  onUpdateTask,
}: CandidateGroupProps) {
  const isActiveDropZone = dropZone && activeDropZone === dropZone

  return (
    <section
      className={`plan-group plan-drop-zone ${isActiveDropZone ? 'is-drop-target' : ''}`}
      onDragLeave={dropZone ? onDragLeaveZone : undefined}
      onDragOver={dropZone ? (event) => event.preventDefault() : undefined}
      onDragEnter={dropZone ? () => onDragEnterZone(dropZone) : undefined}
      onDrop={dropZone ? (event) => void onDropTask(event, dropZone).catch(() => {}) : undefined}
    >
      <div className="day-group__title">
        <span>{title}</span>
        <span>{tasks.length}</span>
      </div>
      <div className="task-list">
        {tasks.length === 0 ? (
          <EmptyState title="Clear" detail="No tasks in this lane." />
        ) : (
          tasks.map((task) => (
            <div
              className="task-list plan-draggable"
              draggable
              key={task.id}
              onDragEnd={onDragEnd}
              onDragStart={(event) => onDragStart(event, task)}
            >
              <span className="drag-handle">Drag task</span>
              <TaskCard
                sections={sections}
                task={task}
                onDelete={onDeleteTask}
                onToggle={onToggleTask}
                onUpdate={onUpdateTask}
              />
              <PeriodButtons onAssignPeriod={(period) => onAssignPeriod(task, period)} />
              {task.date && (
                <button className="button" onClick={() => void onUnschedule(task).catch(() => {})}>
                  Move to Unscheduled
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export function PlanMyDayView({ sections, tasks, onDeleteTask, onToggleTask, onUpdateTask }: PlanMyDayViewProps) {
  const today = todayKey()
  const [activeDropZone, setActiveDropZone] = useState<DropZone | null>(null)
  const candidates = getPlanCandidates(tasks, today)
  const periodTasks = getTasksByPeriod(tasks, today)

  async function assignPeriod(task: Task, period: DayPeriod) {
    if (task.start_time && getEffectiveDayPeriod({ ...task, day_period: null }) !== period) {
      setMoveError('')
      setMove({ task, period })
      return
    }
    await onUpdateTask(task.id, { date: today, day_period: period })
  }

  const [move, setMove] = useState<{ task: Task; period: DayPeriod } | null>(null)
  const [moveError, setMoveError] = useState('')
  const [moving, setMoving] = useState(false)
  async function saveMove(input: TaskInput) {
    if (!move || moving) return
    setMoving(true)
    setMoveError('')
    try {
      await onUpdateTask(move.task.id, {
        date: today,
        day_period: move.period,
        expectedRevision: move.task.revision,
        ...input,
      })
      setMove(null)
    } catch (cause) {
      setMoveError(cause instanceof Error ? cause.message : 'Could not move this task')
    } finally {
      setMoving(false)
    }
  }
  async function clearPeriod(task: Task, date: string | null = today) {
    await onUpdateTask(task.id, {
      date,
      day_period: null,
      start_time: null,
      end_time: null,
      type: task.type === 'time_block' ? 'task' : task.type,
    })
  }

  function handleDragStart(event: DragEvent<HTMLElement>, task: Task) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(task.id))
  }

  function handleDragEnd() {
    setActiveDropZone(null)
  }

  function handleDragEnterZone(zone: DropZone) {
    setActiveDropZone(zone)
  }

  function handleDragLeaveZone() {
    setActiveDropZone(null)
  }

  async function handleDropTask(event: DragEvent<HTMLElement>, zone: DropZone) {
    event.preventDefault()
    setActiveDropZone(null)

    const taskId = Number(event.dataTransfer.getData('text/plain'))

    if (!Number.isInteger(taskId)) {
      return
    }

    const task = tasks.find((item) => item.id === taskId)
    if (!task) return
    if (zone === 'unscheduled') await clearPeriod(task, null)
    else await assignPeriod(task, zone)
  }

  function renderDraggableTask(task: Task, activePeriod?: DayPeriod) {
    return (
      <div
        className="task-list plan-draggable"
        draggable
        key={task.id}
        onDragEnd={handleDragEnd}
        onDragStart={(event) => handleDragStart(event, task)}
      >
        <span className="drag-handle">Drag task</span>
        <TaskCard
          sections={sections}
          task={task}
          onDelete={onDeleteTask}
          onToggle={onToggleTask}
          onUpdate={onUpdateTask}
        />
        <button className="button" onClick={() => void clearPeriod(task, null).catch(() => {})}>
          Move to Unscheduled
        </button>
        <PeriodButtons
          activePeriod={activePeriod}
          onAssignPeriod={(nextPeriod) => assignPeriod(task, nextPeriod)}
          onClearPeriod={activePeriod ? () => clearPeriod(task) : undefined}
        />
      </div>
    )
  }

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="view-eyebrow">{formatDateKey(today)}</p>
          <h2 className="view-title">Plan My Day</h2>
          <p className="view-description">Pull overdue, unscheduled and loose tasks into a realistic day plan.</p>
        </div>
      </div>

      {move && (
        <Dialog label="Move timed work" onClose={() => setMove(null)}>
          {moveError && <p role="alert">{moveError}</p>}
          <h2>Move to {periodLabels[move.period]}</h2>
          <form
            className="form-grid"
            onSubmit={async (event) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              const start = String(form.get('start')),
                end = String(form.get('end'))
              if (getEffectiveDayPeriod({ ...move.task, start_time: start, day_period: null }) !== move.period) {
                const field = event.currentTarget.elements.namedItem('start') as HTMLInputElement
                field.setCustomValidity('Choose a start time in ' + periodLabels[move.period])
                field.reportValidity()
                return
              }
              await saveMove({ start_time: start, end_time: end || null })
            }}
          >
            <label>
              Start
              <input
                required
                className="field"
                type="time"
                name="start"
                onChange={(e) => e.currentTarget.setCustomValidity('')}
              />
            </label>
            <label>
              End
              <input required={move.task.type === 'time_block'} className="field" type="time" name="end" />
            </label>
            <button className="button" disabled={moving} type="submit">
              Save times
            </button>
            <button
              className="button"
              type="button"
              disabled={moving}
              onClick={() =>
                void saveMove({
                  start_time: null,
                  end_time: null,
                  type: move.task.type === 'time_block' ? 'task' : move.task.type,
                })
              }
            >
              Move as untimed work
            </button>
            <button className="button" type="button" onClick={() => setMove(null)}>
              Cancel
            </button>
          </form>
        </Dialog>
      )}
      <div className="plan-layout">
        <div className="card card--pad plan-panel">
          <h3 className="card-title">Candidates</h3>
          <CandidateGroup
            activeDropZone={activeDropZone}
            sections={sections}
            tasks={candidates.overdue}
            title="Overdue"
            onAssignPeriod={assignPeriod}
            onUnschedule={(task) => clearPeriod(task, null)}
            onDragEnd={handleDragEnd}
            onDragEnterZone={handleDragEnterZone}
            onDragLeaveZone={handleDragLeaveZone}
            onDragStart={handleDragStart}
            onDropTask={handleDropTask}
            onDeleteTask={onDeleteTask}
            onToggleTask={onToggleTask}
            onUpdateTask={onUpdateTask}
          />
          <CandidateGroup
            activeDropZone={activeDropZone}
            dropZone="unscheduled"
            sections={sections}
            tasks={candidates.unscheduled}
            title="Unscheduled"
            onAssignPeriod={assignPeriod}
            onUnschedule={(task) => clearPeriod(task, null)}
            onDragEnd={handleDragEnd}
            onDragEnterZone={handleDragEnterZone}
            onDragLeaveZone={handleDragLeaveZone}
            onDragStart={handleDragStart}
            onDropTask={handleDropTask}
            onDeleteTask={onDeleteTask}
            onToggleTask={onToggleTask}
            onUpdateTask={onUpdateTask}
          />
          <CandidateGroup
            activeDropZone={activeDropZone}
            sections={sections}
            tasks={candidates.todayUnplanned}
            title="Today unplanned"
            onAssignPeriod={assignPeriod}
            onUnschedule={(task) => clearPeriod(task, null)}
            onDragEnd={handleDragEnd}
            onDragEnterZone={handleDragEnterZone}
            onDragLeaveZone={handleDragLeaveZone}
            onDragStart={handleDragStart}
            onDropTask={handleDropTask}
            onDeleteTask={onDeleteTask}
            onToggleTask={onToggleTask}
            onUpdateTask={onUpdateTask}
          />
        </div>

        <div className="plan-blocks">
          {dayPeriods.map((period) => {
            const openCount = periodTasks[period].filter((task) => task.status !== 'done').length

            return (
              <section
                className={`card card--pad plan-block plan-drop-zone ${
                  activeDropZone === period ? 'is-drop-target' : ''
                }`}
                key={period}
                onDragEnter={() => handleDragEnterZone(period)}
                onDragLeave={handleDragLeaveZone}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => void handleDropTask(event, period).catch(() => {})}
              >
                <div className="day-group__title">
                  <span>{periodLabels[period]}</span>
                  <span>{openCount} open</span>
                </div>
                <div className="task-list">
                  {periodTasks[period].length === 0 ? (
                    <EmptyState title="No tasks yet" detail={`Assign tasks to ${periodLabels[period]}.`} />
                  ) : (
                    periodTasks[period].map((task) => renderDraggableTask(task, period))
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </section>
  )
}
