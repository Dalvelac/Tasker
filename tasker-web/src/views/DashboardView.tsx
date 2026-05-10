import { EmptyState } from '../components/EmptyState'
import { TaskCard } from '../components/TaskCard'
import { TaskForm } from '../components/TaskForm'
import type { Section } from '../features/sections/types'
import type { Task, TaskInput } from '../features/tasks/types'
import { sortTasks } from '../features/tasks/utils'
import { todayKey } from '../lib/dates'

type DashboardViewProps = {
  sections: Section[]
  tasks: Task[]
  onCreateTask: (input: TaskInput) => Promise<void>
  onDeleteTask: (id: number) => Promise<void>
  onToggleTask: (id: number) => Promise<void>
  onUpdateTask: (id: number, input: TaskInput) => Promise<void>
}

export function DashboardView({
  sections,
  tasks,
  onCreateTask,
  onDeleteTask,
  onToggleTask,
  onUpdateTask,
}: DashboardViewProps) {
  const today = todayKey()
  const todayTasks = sortTasks(tasks.filter((task) => task.date === today))
  const completedToday = todayTasks.filter((task) => task.status === 'done').length
  const inboxCount = tasks.filter((task) => task.section_id === null && task.status !== 'done').length
  const unscheduledCount = tasks.filter((task) => task.date === null && task.status !== 'done').length
  const urgentCount = tasks.filter((task) => task.priority === 'urgent' && task.status !== 'done').length
  const nextTask = todayTasks.find((task) => task.status !== 'done' && task.start_time)

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="view-eyebrow">Dashboard</p>
          <h2 className="view-title">Today command surface</h2>
          <p className="view-description">A compact cockpit for the tasks that matter today.</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="card stat">
          <div className="stat__value">
            {completedToday}/{todayTasks.length}
          </div>
          <div className="stat__label">today progress</div>
        </div>
        <div className="card stat">
          <div className="stat__value">{inboxCount}</div>
          <div className="stat__label">inbox</div>
        </div>
        <div className="card stat">
          <div className="stat__value">{unscheduledCount}</div>
          <div className="stat__label">unscheduled</div>
        </div>
        <div className="card stat">
          <div className="stat__value">{urgentCount}</div>
          <div className="stat__label">urgent</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card card--pad">
          <h3 className="card-title">Today</h3>
          <div className="task-list">
            {todayTasks.length === 0 ? (
              <EmptyState title="No tasks today" detail="Add something for today or pull one from Unscheduled." />
            ) : (
              todayTasks.map((task) => (
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

        <aside className="card card--pad">
          <h3 className="card-title">Quick capture</h3>
          <TaskForm compact sections={sections} submitLabel="Add to inbox" onSubmit={onCreateTask} />

          <h3 className="card-title" style={{ marginTop: 20 }}>
            Next task
          </h3>
          {nextTask ? (
            <p className="view-description">
              <span className="pill">{nextTask.start_time}</span> {nextTask.title}
            </p>
          ) : (
            <p className="view-description">No timed task is queued for today.</p>
          )}
        </aside>
      </div>
    </section>
  )
}
