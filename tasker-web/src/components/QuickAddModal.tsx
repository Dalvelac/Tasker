import { Dialog } from './Dialog'
import type { Section } from '../features/sections/types'
import type { TaskInput } from '../features/tasks/types'
import { TaskForm } from './TaskForm'

type QuickAddModalProps = {
  sections: Section[]
  onClose: () => void
  onCreateTask: (input: TaskInput) => Promise<void>
}

export function QuickAddModal({ sections, onClose, onCreateTask }: QuickAddModalProps) {
  async function handleSubmit(input: TaskInput) {
    await onCreateTask(input)
    onClose()
  }

  return (
    <Dialog label="Quick add task" onClose={onClose}>
      <div className="modal-header">
        <div>
          <h2 className="modal-title">Quick add</h2>
        </div>
        <button className="button" onClick={onClose} type="button">
          Close
        </button>
      </div>
      <TaskForm compact sections={sections} submitLabel="Add task" onSubmit={handleSubmit} />
    </Dialog>
  )
}
