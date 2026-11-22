import { Dialog } from './Dialog'
import { navigationShortcuts } from '../app/navigation'
import { shortcutDefinitions, type ShortcutMap } from '../features/shortcuts'

type ShortcutsOverlayProps = {
  shortcuts: ShortcutMap
  onClose: () => void
}

export function ShortcutsOverlay({ shortcuts, onClose }: ShortcutsOverlayProps) {
  return (
    <Dialog label="Keyboard shortcuts" onClose={onClose} wide>
      <div className="modal-header">
        <div>
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
        <ShortcutGroup title="Navigation" items={navigationShortcuts.map(({ item, key }) => [key, item.label])} />
        <ShortcutGroup
          title="Hovered task"
          items={shortcutDefinitions
            .filter((shortcut) => shortcut.group === 'Hovered task')
            .map((shortcut) => [shortcuts[shortcut.action], shortcut.description])}
        />
      </div>
    </Dialog>
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
