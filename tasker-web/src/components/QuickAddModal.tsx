import { useEffect, useRef } from 'react'
import type { Section } from '../features/sections/types'
import type { TaskInput } from '../features/tasks/types'
import { TaskForm } from './TaskForm'

type QuickAddModalProps = {
  sections: Section[]
  onClose: () => void
  onCreateTask: (input: TaskInput) => Promise<void>
}

export function QuickAddModal({ sections, onClose, onCreateTask }: QuickAddModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    panelRef.current?.querySelector<HTMLInputElement>('input')?.focus()
  }, [])

  async function handleSubmit(input: TaskInput) {
    await onCreateTask(input)
    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        aria-label="Quick add task"
        aria-modal="true"
        className="modal-panel"
        onMouseDown={(event) => event.stopPropagation()}
        ref={panelRef}
        role="dialog"
      >
        <div className="modal-header">
          <div>
            <p className="view-eyebrow">Ctrl Shift A</p>
            <h2 className="modal-title">Quick add</h2>
          </div>
          <button className="button" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <TaskForm compact sections={sections} submitLabel="Add task" onSubmit={handleSubmit} />
      </div>
    </div>
  )
}
