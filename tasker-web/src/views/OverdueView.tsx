import { EmptyState } from '../components/EmptyState'
import { TaskCard } from '../components/TaskCard'
import type { Section } from '../features/sections/types'
import type { Task, TaskInput } from '../features/tasks/types'
import { sortTasks } from '../features/tasks/utils'
import { addDays, isBeforeToday, todayKey } from '../lib/dates'

type OverdueViewProps = {
  sections: Section[]
  tasks: Task[]
  onDeleteTask: (id: number) => Promise<void>
  onToggleTask: (id: number) => Promise<void>
  onUpdateTask: (id: number, input: TaskInput) => Promise<void>
}

export function OverdueView({ sections, tasks, onDeleteTask, onToggleTask, onUpdateTask }: OverdueViewProps) {
  const overdue = sortTasks(tasks.filter((task) => isBeforeToday(task.date) && task.status !== 'done'))

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="view-eyebrow">Overdue</p>
          <h2 className="view-title">Recovery queue</h2>
          <p className="view-description">Move old commitments back into a realistic date.</p>
        </div>
      </div>

      <div className="card card--pad">
        <div className="task-list">
          {overdue.length === 0 ? (
            <EmptyState title="No overdue tasks" detail="Everything with a date is current." />
          ) : (
            overdue.map((task) => (
              <div className="task-list" key={task.id}>
                <TaskCard
                  sections={sections}
                  task={task}
                  onDelete={onDeleteTask}
                  onToggle={onToggleTask}
                  onUpdate={onUpdateTask}
                />
                <div className="inline-actions">
                  <button className="button" onClick={() => onUpdateTask(task.id, { date: todayKey() })} type="button">
                    Move today
                  </button>
                  <button
                    className="button"
                    onClick={() => onUpdateTask(task.id, { date: addDays(todayKey(), 1) })}
                    type="button"
                  >
                    Move tomorrow
                  </button>
                  <button
                    className="button button--danger"
                    onClick={() => onUpdateTask(task.id, { status: 'cancelled' })}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
