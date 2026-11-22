import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getTask } from '../../tasks/api'
import type { Task, TaskInput } from '../../tasks/types'
import { useResource } from '../../../lib/useResource'
import { beforeNavigation, followLink, viewUrl, type NavigationIntent } from '../../../app/routes'
import { Dialog } from '../../../components/Dialog'
import { NotebookEditor } from './NotebookEditor'
import { fileName, normalizePath, notePath } from '../utils'

type Props = {
  summary: Task
  startEditing: boolean
  onEditorOpened: () => void
  onUpdate: (id: number, input: TaskInput) => Promise<void>
  onDelete: (id: number, revision?: number) => Promise<void>
  onCreateTask: (input: TaskInput) => Promise<number>
  onRemoved: () => void
}
type Draft = { body: string; path: string; revision: number }
function recover(id: number): Draft | null {
  try {
    const draft = JSON.parse(sessionStorage.getItem('tasker.draft.' + id) || 'null')
    return draft &&
      typeof draft.body === 'string' &&
      typeof draft.path === 'string' &&
      Number.isInteger(draft.revision)
      ? draft
      : null
  } catch {
    return null
  }
}

export function NoteRecord({ summary, ...actions }: Props) {
  const fetchNote = useCallback(() => getTask(summary.id), [summary.id])
  const { value, error, refresh } = useResource(fetchNote)
  useEffect(() => {
    if (value && value.revision < summary.revision) void refresh()
  }, [summary.revision, value, refresh])
  if (!value)
    return (
      <div role={error ? 'alert' : 'status'}>
        {error ?? 'Loading note…'}{' '}
        {error && (
          <button className="button" onClick={refresh}>
            Retry
          </button>
        )}
      </div>
    )
  return (
    <>
      {error && (
        <p role="alert">
          Could not refresh this note. {error}{' '}
          <button className="button" onClick={refresh}>
            Retry
          </button>
        </p>
      )}
      <Editor note={value} {...actions} />
    </>
  )
}

function Editor({
  note,
  startEditing,
  onEditorOpened,
  onUpdate,
  onDelete,
  onCreateTask,
  onRemoved,
}: Omit<Props, 'summary'> & { note: Task }) {
  const [draft, setDraft] = useState<Draft | null>(
    () =>
      recover(note.id) ??
      (startEditing ? { body: note.notes ?? '', path: notePath(note), revision: note.revision } : null),
  )
  useEffect(() => {
    if (startEditing) onEditorOpened()
  }, [startEditing, onEditorOpened])
  const [fullscreen, setFullscreen] = useState(false)
  const [pending, setPending] = useState<NavigationIntent | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState<number | null>(null)
  const createKey = useRef<string | null>(null)
  const savingRef = useRef(false)
  const dirty = !!draft && (draft.body !== (note.notes ?? '') || draft.path !== notePath(note))
  function edit(next: Draft | null) {
    setDraft(next)
    try {
      if (next) sessionStorage.setItem('tasker.draft.' + note.id, JSON.stringify(next))
      else sessionStorage.removeItem('tasker.draft.' + note.id)
    } catch {
      /* Navigation protection also works when session storage is unavailable. */
    }
  }
  function begin() {
    if (!draft) edit({ body: note.notes ?? '', path: notePath(note), revision: note.revision })
  }
  async function attempt(action: () => Promise<void>) {
    if (savingRef.current) return false
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      await action()
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the change')
      return false
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }
  async function save() {
    if (!draft) return true
    const changed: TaskInput = { expectedRevision: draft.revision }
    if (draft.body !== (note.notes ?? '')) changed.notes = draft.body || null
    if (draft.path !== notePath(note)) {
      changed.source_path = normalizePath(draft.path)
      changed.title = fileName(changed.source_path).replace(/\.md$/i, '')
    }
    return attempt(async () => {
      if (Object.keys(changed).length > 1) await onUpdate(note.id, changed)
      edit(null)
    })
  }
  useLayoutEffect(() => {
    function guard(event: Event) {
      if (savingRef.current) {
        event.preventDefault()
        ;(event as CustomEvent<NavigationIntent>).detail.cancel()
        return
      }
      if (!dirty) return
      event.preventDefault()
      const intent = (event as CustomEvent<NavigationIntent>).detail
      setPending(intent)
    }
    function unload(event: BeforeUnloadEvent) {
      if (dirty) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    function keys(event: KeyboardEvent) {
      if (draft && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void save()
      } else if (fullscreen && event.key === 'Escape' && !document.querySelector('dialog[open]'))
        setFullscreen(false)
    }
    window.addEventListener('tasker:before-navigation', guard)
    window.addEventListener('beforeunload', unload)
    window.addEventListener('keydown', keys)
    return () => {
      window.removeEventListener('tasker:before-navigation', guard)
      window.removeEventListener('beforeunload', unload)
      window.removeEventListener('keydown', keys)
    }
  })
  function download() {
    const url = URL.createObjectURL(
      new Blob([draft?.body ?? note.notes ?? ''], { type: 'text/markdown;charset=utf-8' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = fileName(draft?.path ?? notePath(note))
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  function finish() {
    const intent = pending
    setPending(null)
    intent?.proceed()
  }
  function stay() {
    pending?.cancel()
    setPending(null)
  }
  return (
    <div className="note-record">
      {note.kind === 'review' ? (
        <section className="card card--pad">
          <strong>Review this imported entry</strong>
          <p>Its original import also contained tasks. Choose where this entry belongs.</p>
          <button
            className="button"
            onClick={() =>
              beforeNavigation(
                () =>
                  void attempt(async () => {
                    await onUpdate(note.id, { kind: 'task', expectedRevision: note.revision })
                    onRemoved()
                  }),
              )
            }
          >
            Keep as task
          </button>
          <button
            className="button"
            onClick={() =>
              beforeNavigation(
                () =>
                  void attempt(() =>
                    onUpdate(note.id, {
                      kind: 'note',
                      source_path: notePath(note),
                      expectedRevision: note.revision,
                    }),
                  ),
              )
            }
          >
            Keep as note
          </button>
        </section>
      ) : (
        <div className="inline-actions">
          <button
            className="button"
            disabled={saving}
            onClick={() =>
              void attempt(async () => {
                createKey.current ??= crypto.randomUUID()
                const id = await onCreateTask({
                  title: note.title,
                  linked_note_id: note.id,
                  section_id: note.section_id,
                  requestKey: createKey.current,
                })
                createKey.current = null
                setCreated(id)
              })
            }
          >
            Create task from note
          </button>
          {created && (
            <span role="status">
              Task created.{' '}
              <a
                href={viewUrl('dashboard', { task: created })}
                onClick={(event) => followLink(event, viewUrl('dashboard', { task: created }))}
              >
                Open task
              </a>
            </span>
          )}
        </div>
      )}
      <NotebookEditor
        draft={draft?.body ?? ''}
        isDirty={dirty}
        isEditing={!!draft}
        isFullscreen={fullscreen}
        note={note}
        pathDraft={draft?.path ?? notePath(note)}
        busy={saving}
        onCancel={() => beforeNavigation(() => edit(null))}
        onDraftChange={(body) => {
          if (draft) edit({ ...draft, body })
        }}
        onEdit={begin}
        onFullscreenToggle={() => setFullscreen(!fullscreen)}
        onPathChange={(path) => {
          if (draft) edit({ ...draft, path })
        }}
        onDownload={download}
        onSave={() => void save()}
        onDelete={() =>
          beforeNavigation(() => {
            if (window.confirm('Delete ' + fileName(notePath(note)) + '?'))
              void attempt(async () => {
                await onDelete(note.id, note.revision)
                edit(null)
                onRemoved()
              })
          })
        }
      />
      {error && !pending && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {pending && (
        <Dialog label="Unsaved note" onClose={stay}>
          <h2>Save your changes to {fileName(notePath(note))}?</h2>
          {error && <p role="alert">{error}</p>}
          <div className="inline-actions">
            <button
              className="button button--primary"
              disabled={saving}
              onClick={async () => {
                if (await save()) finish()
              }}
            >
              Save and continue
            </button>
            <button
              className="button"
              disabled={saving}
              onClick={() => {
                edit(null)
                finish()
              }}
            >
              Discard changes
            </button>
            <button className="button" data-initial-focus onClick={stay}>
              Stay here
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}
