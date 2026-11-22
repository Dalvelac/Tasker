import { EmptyState } from '../components/EmptyState'
import { SectionPicker } from '../components/SectionPicker'
import { TaskCard } from '../components/TaskCard'
import type { Section } from '../features/sections/types'
import type { Task, TaskInput } from '../features/tasks/types'
import { sortTasks } from '../features/tasks/utils'
import { addDays, todayKey } from '../lib/dates'

type UnscheduledViewProps = {
  postponed: Task[]
  sections: Section[]
  tasks: Task[]
  onDeleteTask: (id: number) => Promise<void>
  onToggleTask: (id: number) => Promise<void>
  onUpdateTask: (id: number, input: TaskInput) => Promise<void>
}

export function UnscheduledView({
  sections,
  postponed,
  tasks,
  onDeleteTask,
  onToggleTask,
  onUpdateTask,
}: UnscheduledViewProps) {
  const unscheduled = sortTasks(tasks.filter((task) => task.date === null && task.status !== 'done'))

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="view-eyebrow">Unscheduled</p>
          <h2 className="view-title">Tasks without a day</h2>
          <p className="view-description">Assign a date quickly or move tasks into a section.</p>
        </div>
      </div>

      <div className="card card--pad">
        <div className="task-list">
          {unscheduled.length === 0 ? (
            <EmptyState title="Nothing floating" detail="All pending tasks have a date." />
          ) : (
            unscheduled.map((task) => (
              <div className="task-list" key={task.id}>
                <TaskCard
                  sections={sections}
                  task={task}
                  onDelete={onDeleteTask}
                  onToggle={onToggleTask}
                  onUpdate={onUpdateTask}
                />
                <div className="inline-actions">
                  <button
                    className="button"
                    onClick={() => void onUpdateTask(task.id, { date: todayKey() }).catch(() => {})}
                    type="button"
                  >
                    Move today
                  </button>
                  <button
                    className="button"
                    onClick={() => void onUpdateTask(task.id, { date: addDays(todayKey(), 1) }).catch(() => {})}
                    type="button"
                  >
                    Move tomorrow
                  </button>
                  <SectionPicker
                    sections={sections}
                    value={task.section_id}
                    onChange={(sectionId) => void onUpdateTask(task.id, { section_id: sectionId }).catch(() => {})}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {postponed.length > 0 && (
        <section className="card card--pad">
          <h3>Postponed</h3>
          {postponed.map((task) => (
            <div key={task.id}>
              <TaskCard
                task={task}
                sections={sections}
                onUpdate={onUpdateTask}
                onToggle={onToggleTask}
                onDelete={onDeleteTask}
              />
              <p>{task.date ? 'Returns on ' + task.date : 'Choose a return date to schedule this task.'}</p>
            </div>
          ))}
        </section>
      )}
    </section>
  )
}
