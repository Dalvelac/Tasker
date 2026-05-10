import { EmptyState } from '../components/EmptyState'
import { ProductivityHeatmap } from '../components/ProductivityHeatmap'
import { TaskCard } from '../components/TaskCard'
import { TaskForm } from '../components/TaskForm'
import type { Section } from '../features/sections/types'
import type { StatsOverview } from '../features/stats/types'
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
  stats: StatsOverview | null
}

export function DashboardView({
  sections,
  tasks,
  onCreateTask,
  onDeleteTask,
  onToggleTask,
  onUpdateTask,
  stats,
}: DashboardViewProps) {
  const today = todayKey()
  const todayTasks = sortTasks(tasks.filter((task) => task.date === today))
  const completedToday = todayTasks.filter((task) => task.status === 'done').length
  const inboxCount = tasks.filter((task) => task.section_id === null && task.status !== 'done').length
  const unscheduledCount = tasks.filter((task) => task.date === null && task.status !== 'done').length
  const urgentCount = tasks.filter((task) => task.priority === 'urgent' && task.status !== 'done').length
  const nextTask = todayTasks.find((task) => task.status !== 'done' && task.start_time)
  const pendingSections = stats?.sections.filter((section) => section.pending > 0).slice(0, 6) ?? []

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="view-eyebrow">Dashboard</p>
          <h2 className="view-title">Personal operating system</h2>
          <p className="view-description">Momentum, completion history and the tasks that need attention.</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="card stat">
          <div className="stat__value">{stats?.totals.completed_today ?? completedToday}</div>
          <div className="stat__label">completed today</div>
        </div>
        <div className="card stat">
          <div className="stat__value">{stats?.totals.completed_week ?? 0}</div>
          <div className="stat__label">completed this week</div>
        </div>
        <div className="card stat">
          <div className="stat__value">{stats?.totals.current_streak ?? 0}</div>
          <div className="stat__label">day streak</div>
        </div>
        <div className="card stat">
          <div className="stat__value">{stats?.totals.pending_total ?? tasks.filter((task) => task.status !== 'done').length}</div>
          <div className="stat__label">pending total</div>
        </div>
      </div>

      <div className="card card--pad">
        <div className="day-group__title">
          <span>Productivity heatmap</span>
          <span>{stats?.range.days ?? 180} days</span>
        </div>
        {stats ? (
          <ProductivityHeatmap days={stats.heatmap} from={stats.range.from} to={stats.range.to} />
        ) : (
          <EmptyState title="Stats loading" detail="Completion history will appear here." />
        )}
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
            Focus stats
          </h3>
          <div className="task-list">
            <div className="mini-task">
              <span style={{ background: stats?.totals.top_section?.section_color ?? '#9CA3AF' }} />
              <strong>{stats?.totals.top_section?.section_name ?? 'Inbox'}</strong>
              <em>top section</em>
            </div>
            <div className="mini-task">
              <span style={{ background: '#F43F5E' }} />
              <strong>{urgentCount}</strong>
              <em>urgent</em>
            </div>
            <div className="mini-task">
              <span style={{ background: '#9CA3AF' }} />
              <strong>{inboxCount + unscheduledCount}</strong>
              <em>loose tasks</em>
            </div>
          </div>

          <h3 className="card-title" style={{ marginTop: 20 }}>
            Pending by section
          </h3>
          <div className="task-list">
            {pendingSections.length === 0 ? (
              <EmptyState title="No section pressure" detail="No pending tasks grouped by section." />
            ) : (
              pendingSections.map((section) => (
                <div className="mini-task" key={section.section_id ?? 'inbox'}>
                  <span style={{ background: section.section_color ?? '#9CA3AF' }} />
                  <strong>{section.section_name ?? 'Inbox'}</strong>
                  <em>{section.pending} pending</em>
                </div>
              ))
            )}
          </div>

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
