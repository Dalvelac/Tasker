import { useEffect, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { createSection, deleteSection, listSections } from '../features/sections/api'
import type { Section, SectionInput } from '../features/sections/types'
import { getStatsOverview } from '../features/stats/api'
import type { StatsOverview } from '../features/stats/types'
import { createTask, deleteTask, listTasks, toggleTask, updateTask } from '../features/tasks/api'
import type { Task, TaskInput } from '../features/tasks/types'
import { CalendarView } from '../views/CalendarView'
import { DashboardView } from '../views/DashboardView'
import { InboxView } from '../views/InboxView'
import { OverdueView } from '../views/OverdueView'
import { PlanMyDayView } from '../views/PlanMyDayView'
import { SectionsView } from '../views/SectionsView'
import { StackedPlannerView } from '../views/StackedPlannerView'
import { TodayView } from '../views/TodayView'
import { UnscheduledView } from '../views/UnscheduledView'
import { UpcomingView } from '../views/UpcomingView'
import type { ViewId } from './navigation'

export default function App() {
  const [activeView, setActiveView] = useState<ViewId>('dashboard')
  const [sections, setSections] = useState<Section[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<StatsOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function refresh() {
    const [nextSections, nextTasks, nextStats] = await Promise.all([
      listSections(),
      listTasks({ includeDone: true }),
      getStatsOverview(),
    ])
    setSections(nextSections)
    setTasks(nextTasks)
    setStats(nextStats)
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

    if (activeView === 'today') return <TodayView {...commonTaskProps} onOpenPlan={() => setActiveView('plan')} />
    if (activeView === 'plan') {
      return (
        <PlanMyDayView
          sections={sections}
          tasks={tasks}
          onDeleteTask={commonTaskProps.onDeleteTask}
          onToggleTask={commonTaskProps.onToggleTask}
          onUpdateTask={commonTaskProps.onUpdateTask}
        />
      )
    }
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
    if (activeView === 'calendar') {
      return <CalendarView sections={sections} tasks={tasks} onCreateTask={commonTaskProps.onCreateTask} />
    }
    if (activeView === 'upcoming') {
      return (
        <UpcomingView
          sections={sections}
          tasks={tasks}
          onDeleteTask={commonTaskProps.onDeleteTask}
          onToggleTask={commonTaskProps.onToggleTask}
          onUpdateTask={commonTaskProps.onUpdateTask}
        />
      )
    }
    if (activeView === 'overdue') {
      return (
        <OverdueView
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

    return <DashboardView {...commonTaskProps} stats={stats} />
  }

  return (
    <AppShell activeView={activeView} onNavigate={setActiveView}>
      {error && <div className="card card--pad">{error}</div>}
      {renderView()}
    </AppShell>
  )
}
