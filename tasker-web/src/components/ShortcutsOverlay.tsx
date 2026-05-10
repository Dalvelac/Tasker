import { navigationItems } from '../app/navigation'
import { shortcutDefinitions, type ShortcutMap } from '../features/shortcuts'

type ShortcutsOverlayProps = {
  shortcuts: ShortcutMap
  onClose: () => void
}

export function ShortcutsOverlay({ shortcuts, onClose }: ShortcutsOverlayProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        aria-label="Keyboard shortcuts"
        aria-modal="true"
        className="modal-panel modal-panel--wide"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="modal-header">
          <div>
            <p className="view-eyebrow">?</p>
            <h2 className="modal-title">Shortcuts</h2>
          </div>
          <button className="button" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="shortcut-grid">
          <ShortcutGroup
            title="Global"
            items={shortcutDefinitions
              .filter((shortcut) => shortcut.group === 'Global')
              .map((shortcut) => [shortcuts[shortcut.action], shortcut.description])}
          />
          <ShortcutGroup
            title="Navigation"
            items={navigationItems.map((item, index) => [String((index + 1) % 10 || 0), item.label])}
          />
          <ShortcutGroup
            title="Hovered task"
            items={shortcutDefinitions
              .filter((shortcut) => shortcut.group === 'Hovered task')
              .map((shortcut) => [shortcuts[shortcut.action], shortcut.description])}
          />
        </div>
      </div>
    </div>
  )
}

function ShortcutGroup({ title, items }: { title: string; items: string[][] }) {
  return (
    <section className="shortcut-group">
      <h3 className="card-title">{title}</h3>
      <div className="shortcut-list">
        {items.map(([keys, label]) => (
          <div className="shortcut-row" key={`${keys}-${label}`}>
            <kbd>{keys}</kbd>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
