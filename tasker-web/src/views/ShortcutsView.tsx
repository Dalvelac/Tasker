import type { KeyboardEvent } from 'react'
import { navigationItems } from '../app/navigation'
import {
  defaultShortcuts,
  getShortcutLabel,
  shortcutDefinitions,
  type ShortcutAction,
  type ShortcutMap,
} from '../features/shortcuts'

type ShortcutsViewProps = {
  listeningAction: ShortcutAction | null
  shortcuts: ShortcutMap
  onListen: (action: ShortcutAction) => void
  onReset: () => void
  onShortcutChange: (action: ShortcutAction, keys: string) => void
}

export function ShortcutsView({
  listeningAction,
  shortcuts,
  onListen,
  onReset,
  onShortcutChange,
}: ShortcutsViewProps) {
  function handleCapture(event: KeyboardEvent<HTMLButtonElement>, action: ShortcutAction) {
    if (listeningAction !== action) return

    event.preventDefault()
    const nextShortcut = getShortcutLabel(event)
    if (nextShortcut) onShortcutChange(action, nextShortcut)
  }

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="view-eyebrow">Keyboard control</p>
          <h2 className="view-title">Shortcuts</h2>
          <p className="view-description">Click a shortcut, press a new combination, and Tasker will remember it.</p>
        </div>
        <button className="button" onClick={onReset} type="button">
          Reset defaults
        </button>
      </div>

      <div className="shortcut-grid">
        {(['Global', 'Hovered task'] as const).map((group) => (
          <ShortcutSection
            group={group}
            key={group}
            listeningAction={listeningAction}
            shortcuts={shortcuts}
            onCapture={handleCapture}
            onListen={onListen}
          />
        ))}
        <section className="card card--pad shortcut-group">
          <h3 className="card-title">Navigation</h3>
          <div className="shortcut-list">
            {navigationItems.map((item, index) => (
              <div className="shortcut-row" key={item.id}>
                <kbd>{String((index + 1) % 10 || 0)}</kbd>
                <span>{item.icon} {item.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}

function ShortcutSection({
  group,
  listeningAction,
  shortcuts,
  onCapture,
  onListen,
}: {
  group: 'Global' | 'Hovered task'
  listeningAction: ShortcutAction | null
  shortcuts: ShortcutMap
  onCapture: (event: KeyboardEvent<HTMLButtonElement>, action: ShortcutAction) => void
  onListen: (action: ShortcutAction) => void
}) {
  return (
    <section className="card card--pad shortcut-group">
      <h3 className="card-title">{group}</h3>
      <div className="shortcut-list">
        {shortcutDefinitions
          .filter((shortcut) => shortcut.group === group)
          .map((shortcut) => (
            <button
              className={`shortcut-row shortcut-row--button ${
                listeningAction === shortcut.action ? 'is-listening' : ''
              }`}
              key={shortcut.action}
              onClick={() => onListen(shortcut.action)}
              onKeyDown={(event) => onCapture(event, shortcut.action)}
              type="button"
            >
              <kbd>{listeningAction === shortcut.action ? 'listening...' : shortcuts[shortcut.action]}</kbd>
              <span>{shortcut.description}</span>
            </button>
          ))}
      </div>
      {group === 'Global' && (
        <p className="view-description">Default undo shortcut: {defaultShortcuts.undo}</p>
      )}
    </section>
  )
}
