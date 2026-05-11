import { useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { SectionPicker } from '../components/SectionPicker'
import { TaskCard } from '../components/TaskCard'
import type { Section } from '../features/sections/types'
import type { Task, TaskInput } from '../features/tasks/types'
import { groupPlannerTasks } from '../features/tasks/utils'

type StackedPlannerViewProps = {
  sections: Section[]
  tasks: Task[]
  onDeleteTask: (id: number) => Promise<void>
  onToggleTask: (id: number) => Promise<void>
  onUpdateTask: (id: number, input: TaskInput) => Promise<void>
}

export function StackedPlannerView({
  sections,
  tasks,
  onDeleteTask,
  onToggleTask,
  onUpdateTask,
}: StackedPlannerViewProps) {
  const [sectionId, setSectionId] = useState<number | null>(null)
  const [showDone, setShowDone] = useState(false)
  const filtered = tasks.filter((task) => {
    if (sectionId && task.section_id !== sectionId) return false
    if (!showDone && task.status === 'done') return false
    return Boolean(task.date)
  })
  const groups = groupPlannerTasks(filtered)

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="view-eyebrow">Planner</p>
          <h2 className="view-title">Stacked Planner</h2>
          <p className="view-description">Grouped by day, ordered by time and priority.</p>
        </div>
        <div className="inline-actions">
          <SectionPicker sections={sections} value={sectionId} onChange={setSectionId} />
          <button className="button" onClick={() => setShowDone((value) => !value)} type="button">
            {showDone ? 'Hide done' : 'Show done'}
          </button>
        </div>
      </div>

      {groups.map((group) => (
        <div className="card card--pad day-group" key={group.title}>
          <div className="day-group__title">
            <span>{group.title}</span>
            <span>{group.items.length} tasks</span>
          </div>
          {group.days ? (
            <div className="planner-subdays">
              {group.days.map((day) => (
                <section className="planner-subday" key={day.key}>
                  <div className="planner-subday__title">
                    <span>{day.title}</span>
                    <span>{day.items.length} tasks</span>
                  </div>
                  {day.items.length === 0 ? (
                    <EmptyState title="Nothing scheduled" detail="This day is open." />
                  ) : (
                    <div className="task-list">
                      {day.items.map((task) => (
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
                </section>
              ))}
            </div>
          ) : group.items.length === 0 ? (
            <EmptyState title="Nothing scheduled" detail="This day is open." />
          ) : (
            <div className="task-list">
              {group.items.map((task) => (
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
      ))}
    </section>
  )
}
