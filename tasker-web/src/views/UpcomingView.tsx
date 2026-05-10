import { EmptyState } from '../components/EmptyState'
import { TaskCard } from '../components/TaskCard'
import type { Section } from '../features/sections/types'
import type { Task, TaskInput } from '../features/tasks/types'
import { sortTasks } from '../features/tasks/utils'
import { addDays, formatShortDate, todayKey } from '../lib/dates'

type UpcomingViewProps = {
  sections: Section[]
  tasks: Task[]
  onDeleteTask: (id: number) => Promise<void>
  onToggleTask: (id: number) => Promise<void>
  onUpdateTask: (id: number, input: TaskInput) => Promise<void>
}

export function UpcomingView({ sections, tasks, onDeleteTask, onToggleTask, onUpdateTask }: UpcomingViewProps) {
  const today = todayKey()
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index))

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="view-eyebrow">Next 7</p>
          <h2 className="view-title">Upcoming week</h2>
          <p className="view-description">A tighter weekly planning lane than the full calendar.</p>
        </div>
      </div>

      {days.map((day) => {
        const dayTasks = sortTasks(tasks.filter((task) => task.date === day && task.status !== 'done'))

        return (
          <div className="card card--pad day-group" key={day}>
            <div className="day-group__title">
              <span>{formatShortDate(day)}</span>
              <span>{dayTasks.length} open</span>
            </div>
            {dayTasks.length === 0 ? (
              <EmptyState title="Open lane" detail="Nothing scheduled here yet." />
            ) : (
              <div className="task-list">
                {dayTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    sections={sections}
                    task={task}
                    onDelete={onDeleteTask}
                    onToggle={onToggleTask}
                    onUpdate={onUpdateTask}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
