import { useCallback } from 'react'
import { getTask } from '../features/tasks/api'
import { useResource } from '../lib/useResource'
import { TaskCard } from './TaskCard'
import { Dialog } from './Dialog'

type Props = Omit<React.ComponentProps<typeof TaskCard>, 'task'> & {
  id: number
  revision?: number
  onClose: () => void
}
export function TaskDetail({ id, revision, onClose, ...actions }: Props) {
  const load = useCallback(() => getTask(id), [id])
  const data = useResource(load)
  const record = data.value
  return (
    <Dialog wide label="Task details" onClose={onClose}>
      <div className="modal-header">
        <h2>Task details</h2>
        <button className="button" onClick={onClose}>
          Close
        </button>
      </div>
      {data.error && (
        <p role="alert">
          {data.error}{' '}
          <button className="button" onClick={data.refresh}>
            Retry
          </button>
        </p>
      )}
      {record ? (
        <TaskCard
          task={record}
          {...actions}
          onUpdate={async (id, input) => {
            await actions.onUpdate(id, {expectedRevision:record.revision,...input})
            await data.refresh()
          }}
          onDelete={async (id) => {
            await actions.onDelete(id,record.revision)
            onClose()
          }}
          onToggle={async (id) => {
            await actions.onToggle(id,record)
            await data.refresh()
          }}
        />
      ) : (
        !data.error && <p role="status">Loading task…</p>
      )}
      {record && revision !== undefined && record.revision !== revision && (
        <button className="button" onClick={data.refresh}>
          Load latest version
        </button>
      )}
    </Dialog>
  )
}
