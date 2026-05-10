import { EmptyState } from '../components/EmptyState'
import { TaskCard } from '../components/TaskCard'
import { TaskForm } from '../components/TaskForm'
import type { Section } from '../features/sections/types'
import type { Task, TaskInput } from '../features/tasks/types'
import { dayPeriods, getTasksByPeriod, periodLabels, sortTasks } from '../features/tasks/utils'
import { formatDateKey, isBeforeToday, todayKey } from '../lib/dates'

type TodayViewProps = {
  sections: Section[]
  tasks: Task[]
  onCreateTask: (input: TaskInput) => Promise<void>
  onDeleteTask: (id: number) => Promise<void>
  onToggleTask: (id: number) => Promise<void>
  onUpdateTask: (id: number, input: TaskInput) => Promise<void>
  onOpenPlan: () => void
}

function getCurrentBlock(tasks: Task[]) {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  return tasks.find((task) => {
    if (!task.start_time || !task.end_time || task.status === 'done') return false

    const [startHour, startMinute] = task.start_time.split(':').map(Number)
    const [endHour, endMinute] = task.end_time.split(':').map(Number)
    const startMinutes = startHour * 60 + startMinute
    const endMinutes = endHour * 60 + endMinute

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes
  })
}

export function TodayView({
  sections,
  tasks,
  onCreateTask,
  onDeleteTask,
  onToggleTask,
  onUpdateTask,
  onOpenPlan,
}: TodayViewProps) {
  const today = todayKey()
  const todayTasks = sortTasks(tasks.filter((task) => task.date === today))
  const overdue = sortTasks(tasks.filter((task) => isBeforeToday(task.date) && task.status !== 'done'))
  const urgent = sortTasks(tasks.filter((task) => task.priority === 'urgent' && task.status !== 'done'))
  const completed = todayTasks.filter((task) => task.status === 'done').length
  const nextTask = todayTasks.find((task) => task.status !== 'done' && task.start_time)
  const currentBlock = getCurrentBlock(todayTasks)
  const periodTasks = getTasksByPeriod(tasks, today)
  const unplannedToday = sortTasks(
    todayTasks.filter((task) => task.day_period === null && task.status !== 'done'),
  )
  const activeSections = sections
    .map((section) => ({
      section,
      count: todayTasks.filter((task) => task.section_id === section.id && task.status !== 'done').length,
    }))
    .filter((item) => item.count > 0)

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="view-eyebrow">{formatDateKey(today)}</p>
          <h2 className="view-title">Today Command Center</h2>
          <p className="view-description">
            Progress {completed}/{todayTasks.length}. Next: {nextTask ? `${nextTask.start_time} ${nextTask.title}` : 'none'}
          </p>
        </div>
        <button className="button button--primary" onClick={onOpenPlan} type="button">
          Plan My Day
        </button>
      </div>

      <div className="stat-grid">
        <div className="card stat">
          <div className="stat__value">
            {completed}/{todayTasks.length}
          </div>
          <div className="stat__label">completed today</div>
        </div>
        <div className="card stat">
          <div className="stat__value">{overdue.length}</div>
          <div className="stat__label">overdue</div>
        </div>
        <div className="card stat">
          <div className="stat__value">{urgent.length}</div>
          <div className="stat__label">urgent open</div>
        </div>
        <div className="card stat">
          <div className="stat__value">{activeSections.length}</div>
          <div className="stat__label">active sections</div>
        </div>
      </div>

      <div className="command-grid">
        <div className="card card--pad command-card">
          <h3 className="card-title">Current block</h3>
          {currentBlock ? (
            <div className="command-focus">
              <span className="pill">{currentBlock.start_time} to {currentBlock.end_time}</span>
              <strong>{currentBlock.title}</strong>
              <span>{currentBlock.section_name ?? 'Inbox'}</span>
            </div>
          ) : (
            <p className="view-description">No active timed block right now.</p>
          )}
        </div>

        <div className="card card--pad command-card">
          <h3 className="card-title">Next task</h3>
          {nextTask ? (
            <div className="command-focus">
              <span className="pill">{nextTask.start_time ?? 'sin hora'}</span>
              <strong>{nextTask.title}</strong>
              <span>{nextTask.section_name ?? 'Inbox'}</span>
            </div>
          ) : (
            <p className="view-description">No timed task is queued.</p>
          )}
        </div>

        <div className="card card--pad command-card">
          <h3 className="card-title">Active sections</h3>
          <div className="section-chips">
            {activeSections.length === 0 ? (
              <span className="pill">none</span>
            ) : (
              activeSections.map(({ section, count }) => (
                <span className="pill section-chip" key={section.id}>
                  <span style={{ background: section.color }} />
                  {section.name} {count}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="content-grid">
        <div className="plan-blocks">
          {dayPeriods.map((period) => (
            <div className="card card--pad plan-block" key={period}>
              <div className="day-group__title">
                <span>{periodLabels[period]}</span>
                <span>{periodTasks[period].filter((task) => task.status !== 'done').length} open</span>
              </div>
              <div className="task-list">
                {periodTasks[period].length === 0 ? (
                  <EmptyState title="No tasks yet" detail={`Use Plan My Day to fill ${periodLabels[period]}.`} />
                ) : (
                  periodTasks[period].map((task) => (
                    <TaskCard
                      key={task.id}
                      sections={sections}
                      task={task}
                      onDelete={onDeleteTask}
                      onToggle={onToggleTask}
                      onUpdate={onUpdateTask}
                    />
                  ))
                )}
              </div>
            </div>
          ))}

          <div className="card card--pad">
            <div className="day-group__title">
              <span>Today unplanned</span>
              <span>{unplannedToday.length}</span>
            </div>
            <div className="task-list">
              {unplannedToday.length === 0 ? (
                <EmptyState title="Everything is blocked" detail="All open tasks for today are in a day period." />
              ) : (
                unplannedToday.map((task) => (
                  <TaskCard
                    key={task.id}
                    sections={sections}
                    task={task}
                    onDelete={onDeleteTask}
                    onToggle={onToggleTask}
                    onUpdate={onUpdateTask}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <aside className="card card--pad">
          <h3 className="card-title">Add for today</h3>
          <TaskForm
            compact
            defaults={{ date: today }}
            sections={sections}
            submitLabel="Add today"
            onSubmit={(input) => onCreateTask({ ...input, date: today })}
          />

          <h3 className="card-title" style={{ marginTop: 20 }}>
            Urgent
          </h3>
          <div className="task-list">
            {urgent.slice(0, 3).map((task) => (
              <TaskCard
                key={task.id}
                sections={sections}
                task={task}
                onDelete={onDeleteTask}
                onToggle={onToggleTask}
                onUpdate={onUpdateTask}
              />
            ))}
            {urgent.length === 0 && <EmptyState title="No urgent tasks" detail="Nothing is marked urgent." />}
          </div>

          <h3 className="card-title" style={{ marginTop: 20 }}>
            Overdue
          </h3>
          <div className="task-list">
            {overdue.slice(0, 4).map((task) => (
              <TaskCard
                key={task.id}
                sections={sections}
                task={task}
                onDelete={onDeleteTask}
                onToggle={onToggleTask}
                onUpdate={onUpdateTask}
              />
            ))}
            {overdue.length === 0 && <EmptyState title="No overdue tasks" detail="Nice. Nothing is trailing behind." />}
          </div>
        </aside>
      </div>
    </section>
  )
}
