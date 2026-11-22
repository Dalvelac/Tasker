import { useEffect, useRef, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { QuickAddModal } from '../components/QuickAddModal'
import { RecurrenceModal } from '../components/RecurrenceModal'
import { SearchModal } from '../components/SearchModal'
import { ShortcutsOverlay } from '../components/ShortcutsOverlay'
import { TaskDetail } from '../components/TaskDetail'
import { createSection, deleteSection, listSections } from '../features/sections/api'
import {
  defaultShortcuts,
  getShortcutLabel,
  loadShortcuts,
  saveShortcuts,
  type ShortcutAction,
} from '../features/shortcuts'
import { getStatsOverview } from '../features/stats/api'
import { createNotebookActions } from '../features/notebooks/actions'
import { createTask, deleteTask, listTasks, undoChange, updateTask, type Mutation } from '../features/tasks/api'
import type { Task, TaskInput } from '../features/tasks/types'
import { CalendarView } from '../views/CalendarView'
import { DashboardView } from '../views/DashboardView'
import { InboxView } from '../views/InboxView'
import { ObsidianImportView } from '../views/ObsidianImportView'
import { OverdueView } from '../views/OverdueView'
import { PlanMyDayView } from '../views/PlanMyDayView'
import { PomodoroView } from '../views/PomodoroView'
import { SectionsView } from '../views/SectionsView'
import { ShortcutsView } from '../views/ShortcutsView'
import { StackedPlannerView } from '../views/StackedPlannerView'
import { TodayView } from '../views/TodayView'
import { UnscheduledView } from '../views/UnscheduledView'
import { UpcomingView } from '../views/UpcomingView'
import { navigationShortcuts, type ViewId } from './navigation'
import { navigate, useRoute, viewUrl } from './routes'
import { addDays, monthKey, todayKey } from '../lib/dates'
import { useResource } from '../lib/useResource'
import { isActionable } from '../../shared/planner'

const loadTasks = () => listTasks({ includeDone: true, summary: true, kind: 'planner' })
const loadNotes = () => listTasks({ includeDone: true, summary: true, kind: 'vault' })
const loadStats = () => getStatsOverview(120)
type UndoItem = { label: string; token: string }
type Overlay = 'add' | 'search' | 'shortcuts' | number | null
function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || !!target.closest('input,select,textarea'))
}
function dateParam(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().startsWith(value) ? value : null
}
export default function App() {
  const { view, params } = useRoute()
  const openView = (id: ViewId) => navigate(viewUrl(id))
  const taskData = useResource(loadTasks)
  const sectionData = useResource(listSections)
  const noteData = useResource(loadNotes, view === 'obsidian')
  const statsData = useResource(loadStats, view === 'dashboard')
  const tasks = taskData.value ?? [],
    notes = noteData.value ?? [],
    sections = sectionData.value ?? []
  const [error, setError] = useState<string | null>(null)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [showCompleted, setShowCompleted] = useState(true)
  const [shortcuts, setShortcuts] = useState(loadShortcuts)
  const [listening, setListening] = useState<ShortcutAction | null>(null)
  const [undo, setUndo] = useState<UndoItem[]>([])
  const undoBusy = useRef(false)
  const [undoing, setUndoing] = useState(false)
  const [, tick] = useState(0)
  const today = todayKey()
  const lastDay = useRef(today)
  const closed = () => setOverlay(null)
  useEffect(() => {
    const update = () => tick((value) => value + 1)
    const timer = setInterval(update, 30000)
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])
  const refreshSections = sectionData.refresh
  const refreshStats = statsData.refresh
  useEffect(() => {
    if (lastDay.current === today) return
    lastDay.current = today
    void refreshSections()
    if (view === 'dashboard') void refreshStats()
  }, [today, view, refreshSections, refreshStats])

  async function refreshVault() {
    await Promise.all([sectionData.refresh(), noteData.refresh()])
  }
  const notebook = createNotebookActions({ refresh: refreshVault, sections, tasks: notes, setError })
  async function run<T>(action: () => Promise<T>, refresh: () => Promise<unknown>) {
    let result: T
    setError(null)
    try {
      result = await action()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the change')
      throw cause
    }
    await refresh()
    return result
  }
  function remember(result: Mutation, label: string) {
    const token = result.undoToken
    if (token)
      setUndo((current) => [...current.filter((item) => item.token !== token).slice(-9), { token, label }])
  }
  const find = (id: number) => tasks.find((t) => t.id === id) ?? notes.find((t) => t.id === id)
  async function refreshPlanner() {
    await Promise.all([
      taskData.refresh(),
      sectionData.refresh(),
      ...(view === 'dashboard' ? [statsData.refresh()] : []),
    ])
  }
  async function refreshMutation(record: Task | undefined, input?: TaskInput) {
    if (input?.kind || record?.kind === 'review') {
      await Promise.all([refreshPlanner(), noteData.refresh()])
      return
    }
    if (record?.kind === 'note') {
      await noteData.refresh()
      if (!input) await refreshPlanner()
      else if (input.section_id !== undefined) await sectionData.refresh()
      return
    }
    if (input && Object.keys(input).every((key) => ['title', 'notes', 'expectedRevision'].includes(key))) {
      await taskData.refresh()
      return
    }
    await refreshPlanner()
  }
  function createPlannerTask(input: TaskInput) {
    return run(async () => {
      const result = await createTask(input)
      remember(result, 'create ' + input.title)
      return result.id
    }, refreshPlanner)
  }
  const actions = {
    onCreateTask: async (input: TaskInput) => {
      await createPlannerTask(input)
    },
    onDeleteTask: (id: number, revision?: number) => {
      const record = find(id)
      return run(
        async () =>
          remember(await deleteTask(id, revision ?? record?.revision), 'delete ' + (record?.title ?? 'task')),
        () => refreshMutation(record),
      )
    },
    onToggleTask: (id: number, seen?: Task) => {
      const record = seen ?? find(id)
      if (!record) return Promise.reject(new Error('Task is unavailable'))
      return run(
        async () =>
          remember(
            await updateTask(id, {
              status: record.status === 'done' ? 'pending' : 'done',
              expectedRevision: record.revision,
            }),
            'change status of ' + record.title,
          ),
        refreshPlanner,
      )
    },
    onUpdateTask: (id: number, input: TaskInput) => {
      const record = find(id)
      return run(
        async () =>
          remember(
            await updateTask(id, { expectedRevision: record?.revision, ...input }),
            'edit ' + (record?.title ?? 'task'),
          ),
        () => refreshMutation(record, input),
      )
    },
  }
  async function undoLast() {
    const item = undo.at(-1)
    if (!item || undoBusy.current) return
    undoBusy.current = true
    setUndoing(true)
    try {
      await run(
        async () => {
          await undoChange(item.token)
          setUndo((current) => current.filter((entry) => entry.token !== item.token))
        },
        () => Promise.all([refreshPlanner(), ...(view === 'obsidian' ? [noteData.refresh()] : [])]),
      )
    } catch {
      /* The error and original undo entry remain visible. */
    } finally {
      undoBusy.current = false
      setUndoing(false)
    }
  }
  const hovered = useRef<number | null>(null)
  useEffect(() => {
    const hover = (event: Event) => {
      hovered.current = (event as CustomEvent<number | null>).detail
    }
    window.addEventListener('tasker:hover-task', hover)
    return () => window.removeEventListener('tasker:hover-task', hover)
  }, [])
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.repeat ||
        overlay !== null ||
        document.querySelector('dialog[open]') ||
        isTyping(event.target)
      )
        return
      const key = getShortcutLabel(event)
      if (listening && view === 'shortcuts') return
      const target = event.target instanceof HTMLElement ? event.target : null
      const focused = target?.closest<HTMLElement>('[data-task-id]')
      const id = focused ? Number(focused.dataset.taskId) : hovered.current
      const actual =
        id && (focused || document.querySelector('[data-task-id="' + id + '"]:hover')) ? find(id) : null
      const item = navigationShortcuts.find((entry) => entry.key === key)
      const action = (Object.keys(shortcuts) as ShortcutAction[]).find((action) => shortcuts[action] === key)
      if (item) {
        event.preventDefault()
        openView(item.item.id)
        return
      }
      if (!action) return
      if (
        [
          'configureRecurrence',
          'completeHovered',
          'moveHoveredToday',
          'moveHoveredTomorrow',
          'deleteHovered',
        ].includes(action) &&
        !actual
      )
        return
      if (key === 'Space' && target?.closest('button,a')) return
      event.preventDefault()
      switch (action) {
        case 'quickAdd':
          setOverlay('add')
          break
        case 'search':
          setOverlay('search')
          break
        case 'showShortcuts':
          setOverlay('shortcuts')
          break
        case 'planMyDay':
          openView('plan')
          break
        case 'undo':
          void undoLast()
          break
        case 'toggleCompleted':
          setShowCompleted((v) => !v)
          break
        case 'configureRecurrence':
          setOverlay(actual!.id)
          break
        case 'completeHovered':
          void actions.onToggleTask(actual!.id).catch(() => {})
          break
        case 'moveHoveredToday':
        case 'moveHoveredTomorrow':
          void actions
            .onUpdateTask(actual!.id, { date: action === 'moveHoveredToday' ? today : addDays(today, 1) })
            .catch(() => {})
          break
        case 'deleteHovered':
          void actions.onDeleteTask(actual!.id).catch(() => {})
          break
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  })
  function configure(action: ShortcutAction, keys: string) {
    if (
      navigationShortcuts.some((entry) => entry.key === keys) ||
      Object.entries(shortcuts).some(([name, key]) => name !== action && key === keys)
    ) {
      setError('That shortcut is already assigned. Choose another combination.')
      return
    }
    const next = { ...shortcuts, [action]: keys }
    setShortcuts(next)
    saveShortcuts(next)
    setListening(null)
    setError(null)
  }
  const eligible = tasks.filter((task) => isActionable(task, today) || task.status === 'done')
  const visible = showCompleted ? eligible : eligible.filter((task) => task.status !== 'done')
  const common = { ...actions, sections, tasks: visible }
  const selected = dateParam(params.get('date'))
  const month = params.get('month')
  const detail = Number(params.get('task'))
  function render() {
    if (view === 'focus') return <PomodoroView />
    if (view === 'shortcuts')
      return (
        <ShortcutsView
          shortcuts={shortcuts}
          listeningAction={listening}
          onListen={setListening}
          onShortcutChange={configure}
          onReset={() => {
            setShortcuts(defaultShortcuts)
            saveShortcuts(defaultShortcuts)
            setListening(null)
          }}
        />
      )
    if (view === 'obsidian')
      return noteData.value && sectionData.value ? (
        <ObsidianImportView
          sections={sections}
          tasks={notes}
          noteId={Number(params.get('note')) || null}
          vaultId={params.has('vault') ? Number(params.get('vault')) : null}
          onCreateObsidianNote={notebook.createNote}
          onCreateObsidianVault={notebook.createVault}
          onDeleteTask={actions.onDeleteTask}
          onUpdateTask={actions.onUpdateTask}
          onCreateTask={createPlannerTask}
          onImportObsidianNotes={notebook.importNotes}
          onImportObsidianNotesIntoSection={notebook.importNotesIntoSection}
          onRenameObsidianVault={notebook.renameVault}
        />
      ) : (
        !noteData.error && !sectionData.error && <p role="status">Loading vault…</p>
      )
    if (view === 'sections')
      return (
        sectionData.value && (
          <SectionsView
            sections={sections}
            onCreateSection={(input) =>
              run(async () => {
                await createSection(input)
              }, sectionData.refresh)
            }
            onDeleteSection={(id) =>
              run(
                async () => {
                  await deleteSection(id)
                },
                () => Promise.all([refreshPlanner(), noteData.refresh()]),
              )
            }
            onImportObsidianNotes={notebook.importNotes}
          />
        )
      )
    if (!taskData.value) return taskData.error ? null : <p role="status">Loading tasks…</p>
    switch (view) {
      case 'today':
        return (
          <TodayView
            {...common}
            tasks={eligible}
            showCompleted={showCompleted}
            onOpenPlan={() => openView('plan')}
          />
        )
      case 'plan':
        return <PlanMyDayView {...common} />
      case 'planner':
        return <StackedPlannerView {...common} />
      case 'calendar':
        return (
          <CalendarView
            {...common}
            tasks={tasks}
            selectedDate={selected}
            month={selected?.slice(0, 7) ?? (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : monthKey())}
            onSelect={(date, month) => navigate(viewUrl('calendar', { date, month }))}
          />
        )
      case 'upcoming':
        return <UpcomingView {...common} />
      case 'overdue':
        return <OverdueView {...common} />
      case 'inbox':
        return <InboxView {...common} />
      case 'unscheduled':
        return (
          <UnscheduledView
            {...common}
            postponed={tasks.filter((task) => task.status === 'postponed' && !isActionable(task, today))}
          />
        )
      default:
        return <DashboardView {...common} stats={statsData.value} statsError={!!statsData.error} />
    }
  }
  const recurrence = typeof overlay === 'number' ? find(overlay) : null
  const sources = [
    { name: 'Tasks', ...taskData },
    { name: 'Sections', ...sectionData },
    ...(view === 'dashboard' ? [{ name: 'Statistics', ...statsData }] : []),
    ...(view === 'obsidian' ? [{ name: 'Notes', ...noteData }] : []),
  ]
  return (
    <AppShell activeView={view} onNavigate={openView}>
      <div className="hotkey-status">
        <button className="button" onClick={() => setOverlay('search')}>
          Search
        </button>
        <button className="button button--primary" onClick={() => setOverlay('add')}>
          Quick add
        </button>
        <button className="button button--ghost" onClick={undoLast} disabled={!undo.length || undoing}>
          {undoing ? 'Undoing…' : undo.length ? 'Undo ' + undo.at(-1)!.label : 'Undo'}
        </button>
      </div>
      {error && (
        <p role="alert" className="card card--pad form-error">
          {error}
        </p>
      )}
      {sources.map(
        (source) =>
          source.error && (
            <p role="alert" className="card card--pad" key={source.name}>
              {source.name} could not refresh. {source.error}{' '}
              <button className="button" onClick={source.refresh}>
                Retry {source.name.toLowerCase()}
              </button>
            </p>
          ),
      )}
      {render()}
      {detail > 0 && (
        <TaskDetail
          key={detail}
          id={detail}
          revision={find(detail)?.revision}
          sections={sections}
          onUpdate={actions.onUpdateTask}
          onToggle={actions.onToggleTask}
          onDelete={actions.onDeleteTask}
          onClose={() => {
            const next = new URLSearchParams(params)
            next.delete('task')
            navigate(viewUrl(view, Object.fromEntries(next)), true)
          }}
        />
      )}
      {overlay === 'add' && (
        <QuickAddModal sections={sections} onClose={closed} onCreateTask={actions.onCreateTask} />
      )}
      {overlay === 'search' && (
        <SearchModal tasks={[...tasks, ...notes.filter((n) => n.kind === 'note')]} onClose={closed} />
      )}
      {overlay === 'shortcuts' && <ShortcutsOverlay shortcuts={shortcuts} onClose={closed} />}
      {recurrence && <RecurrenceModal task={recurrence} onClose={closed} onUpdateTask={actions.onUpdateTask} />}
    </AppShell>
  )
}
