import { useEffect, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { createSection, deleteSection, listSections } from '../features/sections/api'
import type { Section, SectionInput } from '../features/sections/types'
import { createTask, deleteTask, listTasks, toggleTask, updateTask } from '../features/tasks/api'
import type { Task, TaskInput } from '../features/tasks/types'
import { DashboardView } from '../views/DashboardView'
import { InboxView } from '../views/InboxView'
import { SectionsView } from '../views/SectionsView'
import { StackedPlannerView } from '../views/StackedPlannerView'
import { TodayView } from '../views/TodayView'
import { UnscheduledView } from '../views/UnscheduledView'
import type { ViewId } from './navigation'

export default function App() {
  const [activeView, setActiveView] = useState<ViewId>('dashboard')
  const [sections, setSections] = useState<Section[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function refresh() {
    const [nextSections, nextTasks] = await Promise.all([listSections(), listTasks({ includeDone: true })])
    setSections(nextSections)
    setTasks(nextTasks)
  }

  async function runAction(action: () => Promise<void>) {
    try {
      setError(null)
      await action()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  useEffect(() => {
    // Initial API hydration belongs here because Pages Functions are the source of truth.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not load Tasker')
      })
      .finally(() => setIsLoading(false))
  }, [])

  const commonTaskProps = {
    sections,
    tasks,
    onCreateTask: (input: TaskInput) => runAction(() => createTask(input).then(() => undefined)),
    onDeleteTask: (id: number) => runAction(() => deleteTask(id).then(() => undefined)),
    onToggleTask: (id: number) => runAction(() => toggleTask(id).then(() => undefined)),
    onUpdateTask: (id: number, input: TaskInput) => runAction(() => updateTask(id, input).then(() => undefined)),
  }

  function renderView() {
    if (isLoading) {
      return (
        <section className="view">
          <div className="card card--pad">Loading Tasker...</div>
        </section>
      )
    }

    if (activeView === 'today') return <TodayView {...commonTaskProps} />
    if (activeView === 'planner') {
      return (
        <StackedPlannerView
          sections={sections}
          tasks={tasks}
          onDeleteTask={commonTaskProps.onDeleteTask}
          onToggleTask={commonTaskProps.onToggleTask}
          onUpdateTask={commonTaskProps.onUpdateTask}
        />
      )
    }
    if (activeView === 'inbox') return <InboxView {...commonTaskProps} />
    if (activeView === 'unscheduled') {
      return (
        <UnscheduledView
          sections={sections}
          tasks={tasks}
          onDeleteTask={commonTaskProps.onDeleteTask}
          onToggleTask={commonTaskProps.onToggleTask}
          onUpdateTask={commonTaskProps.onUpdateTask}
        />
      )
    }
    if (activeView === 'sections') {
      return (
        <SectionsView
          sections={sections}
          onCreateSection={(input: SectionInput) => runAction(() => createSection(input).then(() => undefined))}
          onDeleteSection={(id: number) => runAction(() => deleteSection(id).then(() => undefined))}
        />
      )
    }

    return <DashboardView {...commonTaskProps} />
  }

  return (
    <AppShell activeView={activeView} onNavigate={setActiveView}>
      {error && <div className="card card--pad">{error}</div>}
      {renderView()}
    </AppShell>
  )
}
