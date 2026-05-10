import { useState, type DragEvent } from 'react'
import { EmptyState } from '../components/EmptyState'
import { TaskCard } from '../components/TaskCard'
import type { Section } from '../features/sections/types'
import type { DayPeriod, Task, TaskInput } from '../features/tasks/types'
import {
  dayPeriods,
  getPeriodDefaultTimeRange,
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
          onClick={() => onAssignPeriod(period)}
          type="button"
        >
          {periodLabels[period]}
        </button>
      ))}
      {onClearPeriod && (
        <button className="button" onClick={onClearPeriod} type="button">
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
      onDrop={dropZone ? (event) => onDropTask(event, dropZone) : undefined}
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
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export function PlanMyDayView({
  sections,
  tasks,
  onDeleteTask,
  onToggleTask,
  onUpdateTask,
}: PlanMyDayViewProps) {
  const today = todayKey()
  const [activeDropZone, setActiveDropZone] = useState<DropZone | null>(null)
  const candidates = getPlanCandidates(tasks, today)
  const periodTasks = getTasksByPeriod(tasks, today)

  async function assignPeriod(task: Task, period: DayPeriod) {
    const { start, end } = getPeriodDefaultTimeRange(period)
    await onUpdateTask(task.id, {
      date: today,
      day_period: period,
      start_time: start,
      end_time: end,
    })
  }

  async function clearPeriod(task: Task) {
    await onUpdateTask(task.id, {
      date: today,
      day_period: null,
      start_time: null,
      end_time: null,
      duration_minutes: null,
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

    if (zone === 'unscheduled') {
      await onUpdateTask(taskId, {
        date: null,
        day_period: null,
        start_time: null,
        end_time: null,
        duration_minutes: null,
      })
      return
    }

    const { start, end } = getPeriodDefaultTimeRange(zone)
    await onUpdateTask(taskId, {
      date: today,
      day_period: zone,
      start_time: start,
      end_time: end,
    })
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

      <div className="plan-layout">
        <div className="card card--pad plan-panel">
          <h3 className="card-title">Candidates</h3>
          <CandidateGroup
            activeDropZone={activeDropZone}
            sections={sections}
            tasks={candidates.overdue}
            title="Overdue"
            onAssignPeriod={assignPeriod}
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
                onDrop={(event) => handleDropTask(event, period)}
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
