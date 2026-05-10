import { EmptyState } from '../components/EmptyState'
import { TaskCard } from '../components/TaskCard'
import { TaskForm } from '../components/TaskForm'
import type { Section } from '../features/sections/types'
import type { Task, TaskInput } from '../features/tasks/types'
import { sortTasks } from '../features/tasks/utils'
import { isBeforeToday, todayKey } from '../lib/dates'

type TodayViewProps = {
  sections: Section[]
  tasks: Task[]
  onCreateTask: (input: TaskInput) => Promise<void>
  onDeleteTask: (id: number) => Promise<void>
  onToggleTask: (id: number) => Promise<void>
  onUpdateTask: (id: number, input: TaskInput) => Promise<void>
}

export function TodayView({ sections, tasks, onCreateTask, onDeleteTask, onToggleTask, onUpdateTask }: TodayViewProps) {
  const today = todayKey()
  const todayTasks = sortTasks(tasks.filter((task) => task.date === today))
  const overdue = sortTasks(tasks.filter((task) => isBeforeToday(task.date) && task.status !== 'done'))
  const completed = todayTasks.filter((task) => task.status === 'done').length
  const nextTask = todayTasks.find((task) => task.status !== 'done' && task.start_time)

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="view-eyebrow">{today}</p>
          <h2 className="view-title">Today Command Center</h2>
          <p className="view-description">
            Progress {completed}/{todayTasks.length}. Next: {nextTask ? `${nextTask.start_time} ${nextTask.title}` : 'none'}
          </p>
        </div>
      </div>

      <div className="content-grid">
        <div className="card card--pad">
          <h3 className="card-title">Tasks for today</h3>
          <div className="task-list">
            {todayTasks.length === 0 ? (
              <EmptyState title="Today is clear" detail="Create a task directly for today." />
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
          <h3 className="card-title">Add for today</h3>
          <TaskForm
            compact
            defaults={{ date: today }}
            sections={sections}
            submitLabel="Add today"
            onSubmit={(input) => onCreateTask({ ...input, date: today })}
          />

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
