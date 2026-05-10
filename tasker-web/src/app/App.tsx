import { useEffect, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { QuickAddModal } from '../components/QuickAddModal'
import { RecurrenceModal } from '../components/RecurrenceModal'
import { SearchModal } from '../components/SearchModal'
import { ShortcutsOverlay } from '../components/ShortcutsOverlay'
import { createSection, deleteSection, listSections } from '../features/sections/api'
import type { Section, SectionInput } from '../features/sections/types'
import {
  defaultShortcuts,
  getShortcutLabel,
  loadShortcuts,
  saveShortcuts,
  type ShortcutAction,
  type ShortcutMap,
} from '../features/shortcuts'
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
import { ShortcutsView } from '../views/ShortcutsView'
import { StackedPlannerView } from '../views/StackedPlannerView'
import { TodayView } from '../views/TodayView'
import { UnscheduledView } from '../views/UnscheduledView'
import { UpcomingView } from '../views/UpcomingView'
import { navigationItems, type ViewId } from './navigation'
import { addDays, todayKey } from '../lib/dates'

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
}

type UndoItem = {
  label: string
  run: () => Promise<void>
}

function taskToInput(task: Task): TaskInput {
  return {
    title: task.title,
    notes: task.notes,
    section_id: task.section_id,
    date: task.date,
    start_time: task.start_time,
    end_time: task.end_time,
    duration_minutes: task.duration_minutes,
    priority: task.priority,
    status: task.status,
    type: task.type,
    is_all_day: task.is_all_day,
    day_period: task.day_period,
    recurrence_type: task.recurrence_type,
    recurrence_interval: task.recurrence_interval,
    recurrence_days: task.recurrence_days,
    recurrence_until: task.recurrence_until,
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<ViewId>('dashboard')
  const [sections, setSections] = useState<Section[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<StatsOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hoveredTaskId, setHoveredTaskId] = useState<number | null>(null)
  const [showCompleted, setShowCompleted] = useState(true)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  const [recurrenceTaskId, setRecurrenceTaskId] = useState<number | null>(null)
  const [shortcuts, setShortcuts] = useState<ShortcutMap>(() => loadShortcuts())
  const [listeningAction, setListeningAction] = useState<ShortcutAction | null>(null)
  const [undoStack, setUndoStack] = useState<UndoItem[]>([])
  const [lastUndoLabel, setLastUndoLabel] = useState<string | null>(null)

  async function refresh() {
    const [nextSections, nextTasks, nextStats] = await Promise.all([
      listSections(),
      listTasks({ includeDone: true }),
      getStatsOverview(120),
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

  function pushUndo(item: UndoItem) {
    setUndoStack((current) => [...current.slice(-9), item])
    setLastUndoLabel(item.label)
  }

  async function undoLastAction() {
    const item = undoStack.at(-1)
    if (!item) return

    setUndoStack((current) => current.slice(0, -1))
    await runAction(item.run)
    setLastUndoLabel(`Undid ${item.label}`)
  }

  function updateShortcut(action: ShortcutAction, keys: string) {
    const nextShortcuts = { ...shortcuts, [action]: keys }
    setShortcuts(nextShortcuts)
    saveShortcuts(nextShortcuts)
    setListeningAction(null)
  }

  function resetShortcuts() {
    setShortcuts(defaultShortcuts)
    saveShortcuts(defaultShortcuts)
    setListeningAction(null)
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

  useEffect(() => {
    function handleHoverTask(event: Event) {
      const detail = (event as CustomEvent<number | null>).detail
      setHoveredTaskId(detail ?? null)
    }

    window.addEventListener('tasker:hover-task', handleHoverTask)
    return () => window.removeEventListener('tasker:hover-task', handleHoverTask)
  }, [])

  const commonTaskProps = {
    sections,
    tasks: showCompleted ? tasks : tasks.filter((task) => task.status !== 'done'),
    onCreateTask: (input: TaskInput) =>
      runAction(async () => {
        const result = await createTask(input)
        pushUndo({
          label: `create "${input.title ?? 'task'}"`,
          run: () => deleteTask(result.id).then(() => undefined),
        })
      }),
    onDeleteTask: (id: number) =>
      runAction(async () => {
        const task = tasks.find((item) => item.id === id)
        await deleteTask(id)
        if (task) {
          pushUndo({
            label: `delete "${task.title}"`,
            run: () => createTask(taskToInput(task)).then(() => undefined),
          })
        }
      }),
    onToggleTask: (id: number) =>
      runAction(async () => {
        const task = tasks.find((item) => item.id === id)
        await toggleTask(id)
        if (task) {
          pushUndo({
            label: `toggle "${task.title}"`,
            run: () => updateTask(id, { status: task.status }).then(() => undefined),
          })
        }
      }),
    onUpdateTask: (id: number, input: TaskInput) =>
      runAction(async () => {
        const task = tasks.find((item) => item.id === id)
        await updateTask(id, input)
        if (task) {
          pushUndo({
            label: `edit "${task.title}"`,
            run: () => updateTask(id, taskToInput(task)).then(() => undefined),
          })
        }
      }),
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return

      const shortcut = getShortcutLabel(event)
      const hoveredTask = hoveredTaskId ? tasks.find((task) => task.id === hoveredTaskId) : null

      if (shortcut === shortcuts.showShortcuts) {
        event.preventDefault()
        setIsShortcutsOpen((value) => !value)
        return
      }

      if (shortcut === shortcuts.quickAdd) {
        event.preventDefault()
        setIsQuickAddOpen(true)
        return
      }

      if (shortcut === shortcuts.planMyDay) {
        event.preventDefault()
        setActiveView('plan')
        return
      }

      if (shortcut === shortcuts.search) {
        event.preventDefault()
        setIsSearchOpen(true)
        return
      }

      if (shortcut === shortcuts.configureRecurrence) {
        event.preventDefault()
        if (hoveredTask) setRecurrenceTaskId(hoveredTask.id)
        return
      }

      if (shortcut === shortcuts.undo) {
        event.preventDefault()
        void undoLastAction()
        return
      }

      if (!event.ctrlKey && !event.metaKey && /^[0-9]$/.test(event.key)) {
        const itemIndex = event.key === '0' ? 9 : Number(event.key) - 1
        const item = navigationItems[itemIndex]
        if (item) {
          event.preventDefault()
          setActiveView(item.id)
        }
        return
      }

      if (shortcut === shortcuts.toggleCompleted) {
        event.preventDefault()
        setShowCompleted((value) => !value)
        return
      }

      if (!hoveredTask) return

      if (shortcut === shortcuts.completeHovered) {
        event.preventDefault()
        void commonTaskProps.onToggleTask(hoveredTask.id)
        return
      }

      if (shortcut === shortcuts.moveHoveredToday) {
        event.preventDefault()
        void commonTaskProps.onUpdateTask(hoveredTask.id, { date: todayKey() })
        return
      }

      if (shortcut === shortcuts.moveHoveredTomorrow) {
        event.preventDefault()
        void commonTaskProps.onUpdateTask(hoveredTask.id, { date: addDays(todayKey(), 1) })
        return
      }

      if (shortcut === shortcuts.deleteHovered) {
        event.preventDefault()
        void commonTaskProps.onDeleteTask(hoveredTask.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

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
    if (activeView === 'shortcuts') {
      return (
        <ShortcutsView
          listeningAction={listeningAction}
          shortcuts={shortcuts}
          onListen={setListeningAction}
          onReset={resetShortcuts}
          onShortcutChange={updateShortcut}
        />
      )
    }

    return <DashboardView {...commonTaskProps} stats={stats} />
  }

  const recurrenceTask = recurrenceTaskId ? tasks.find((task) => task.id === recurrenceTaskId) : null

  return (
    <AppShell activeView={activeView} onNavigate={setActiveView}>
      <div className="hotkey-status">
        <button className="button button--ghost" disabled={undoStack.length === 0} onClick={undoLastAction} type="button">
          {shortcuts.undo} undo{lastUndoLabel ? ` · ${lastUndoLabel}` : ''}
        </button>
      </div>
      {error && <div className="card card--pad">{error}</div>}
      {renderView()}
      {isQuickAddOpen && (
        <QuickAddModal
          sections={sections}
          onClose={() => setIsQuickAddOpen(false)}
          onCreateTask={commonTaskProps.onCreateTask}
        />
      )}
      {isSearchOpen && <SearchModal tasks={tasks} onClose={() => setIsSearchOpen(false)} />}
      {isShortcutsOpen && <ShortcutsOverlay shortcuts={shortcuts} onClose={() => setIsShortcutsOpen(false)} />}
      {recurrenceTask && (
        <RecurrenceModal
          task={recurrenceTask}
          onClose={() => setRecurrenceTaskId(null)}
          onUpdateTask={commonTaskProps.onUpdateTask}
        />
      )}
    </AppShell>
  )
}
