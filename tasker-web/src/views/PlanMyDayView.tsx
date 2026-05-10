import { EmptyState } from '../components/EmptyState'
import { TaskCard } from '../components/TaskCard'
import type { Section } from '../features/sections/types'
import type { DayPeriod, Task, TaskInput } from '../features/tasks/types'
import { dayPeriods, getPlanCandidates, getTasksByPeriod, periodLabels } from '../features/tasks/utils'
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
  onAssignPeriod: (task: Task, period: DayPeriod) => Promise<void>
  onDeleteTask: (id: number) => Promise<void>
  onToggleTask: (id: number) => Promise<void>
  onUpdateTask: (id: number, input: TaskInput) => Promise<void>
}

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
  onAssignPeriod,
  onDeleteTask,
  onToggleTask,
  onUpdateTask,
}: CandidateGroupProps) {
  return (
    <div className="plan-group">
      <div className="day-group__title">
        <span>{title}</span>
        <span>{tasks.length}</span>
      </div>
      <div className="task-list">
        {tasks.length === 0 ? (
          <EmptyState title="Clear" detail="No tasks in this lane." />
        ) : (
          tasks.map((task) => (
            <div className="task-list" key={task.id}>
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
    </div>
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
  const candidates = getPlanCandidates(tasks, today)
  const periodTasks = getTasksByPeriod(tasks, today)

  async function assignPeriod(task: Task, period: DayPeriod) {
    await onUpdateTask(task.id, { date: today, day_period: period })
  }

  async function clearPeriod(task: Task) {
    await onUpdateTask(task.id, { date: today, day_period: null })
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
            sections={sections}
            tasks={candidates.overdue}
            title="Overdue"
            onAssignPeriod={assignPeriod}
            onDeleteTask={onDeleteTask}
            onToggleTask={onToggleTask}
            onUpdateTask={onUpdateTask}
          />
          <CandidateGroup
            sections={sections}
            tasks={candidates.unscheduled}
            title="Unscheduled"
            onAssignPeriod={assignPeriod}
            onDeleteTask={onDeleteTask}
            onToggleTask={onToggleTask}
            onUpdateTask={onUpdateTask}
          />
          <CandidateGroup
            sections={sections}
            tasks={candidates.todayUnplanned}
            title="Today unplanned"
            onAssignPeriod={assignPeriod}
            onDeleteTask={onDeleteTask}
            onToggleTask={onToggleTask}
            onUpdateTask={onUpdateTask}
          />
        </div>

        <div className="plan-blocks">
          {dayPeriods.map((period) => {
            const openCount = periodTasks[period].filter((task) => task.status !== 'done').length

            return (
              <div className="card card--pad plan-block" key={period}>
                <div className="day-group__title">
                  <span>{periodLabels[period]}</span>
                  <span>{openCount} open</span>
                </div>
                <div className="task-list">
                  {periodTasks[period].length === 0 ? (
                    <EmptyState title="No tasks yet" detail={`Assign tasks to ${periodLabels[period]}.`} />
                  ) : (
                    periodTasks[period].map((task) => (
                      <div className="task-list" key={task.id}>
                        <TaskCard
                          sections={sections}
                          task={task}
                          onDelete={onDeleteTask}
                          onToggle={onToggleTask}
                          onUpdate={onUpdateTask}
                        />
                        <PeriodButtons
                          activePeriod={period}
                          onAssignPeriod={(nextPeriod) => assignPeriod(task, nextPeriod)}
                          onClearPeriod={() => clearPeriod(task)}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
