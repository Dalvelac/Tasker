import { EmptyState } from '../components/EmptyState'
import { TaskCard } from '../components/TaskCard'
import { TaskForm } from '../components/TaskForm'
import type { Section } from '../features/sections/types'
import type { Task, TaskInput } from '../features/tasks/types'
import { sortTasks } from '../features/tasks/utils'

type InboxViewProps = {
  sections: Section[]
  tasks: Task[]
  onCreateTask: (input: TaskInput) => Promise<void>
  onDeleteTask: (id: number) => Promise<void>
  onToggleTask: (id: number) => Promise<void>
  onUpdateTask: (id: number, input: TaskInput) => Promise<void>
}

export function InboxView({ sections, tasks, onCreateTask, onDeleteTask, onToggleTask, onUpdateTask }: InboxViewProps) {
  const inboxTasks = sortTasks(tasks.filter((task) => task.section_id === null && task.status !== 'done'))

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="view-eyebrow">Inbox</p>
          <h2 className="view-title">Quick capture</h2>
          <p className="view-description">{inboxTasks.length} pending tasks without a final section.</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="card card--pad">
          <h3 className="card-title">Inbox tasks</h3>
          <div className="task-list">
            {inboxTasks.length === 0 ? (
              <EmptyState title="Inbox is empty" detail="Capture loose tasks here before organizing them." />
            ) : (
              inboxTasks.map((task) => (
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
          <h3 className="card-title">Capture</h3>
          <TaskForm compact sections={sections} submitLabel="Add to inbox" onSubmit={onCreateTask} />
        </aside>
      </div>
    </section>
  )
}
