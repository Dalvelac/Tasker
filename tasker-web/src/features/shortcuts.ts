export type ShortcutAction =
  | 'showShortcuts'
  | 'quickAdd'
  | 'planMyDay'
  | 'search'
  | 'configureRecurrence'
  | 'undo'
  | 'toggleCompleted'
  | 'completeHovered'
  | 'moveHoveredToday'
  | 'moveHoveredTomorrow'
  | 'deleteHovered'

export type ShortcutDefinition = {
  action: ShortcutAction
  description: string
  group: 'Global' | 'Hovered task'
  locked?: boolean
}

export type ShortcutMap = Record<ShortcutAction, string>

export const shortcutDefinitions: ShortcutDefinition[] = [
  { action: 'showShortcuts', description: 'Show all shortcuts', group: 'Global' },
  { action: 'quickAdd', description: 'Quick add new task', group: 'Global' },
  { action: 'planMyDay', description: 'Open Plan My Day', group: 'Global' },
  { action: 'search', description: 'Search', group: 'Global' },
  { action: 'configureRecurrence', description: 'Configure recurrence for hovered task', group: 'Global' },
  { action: 'undo', description: 'Undo last task action', group: 'Global' },
  { action: 'toggleCompleted', description: 'Show/hide completed tasks', group: 'Global' },
  { action: 'completeHovered', description: 'Complete/reopen hovered task', group: 'Hovered task' },
  { action: 'moveHoveredToday', description: 'Move hovered task to today', group: 'Hovered task' },
  { action: 'moveHoveredTomorrow', description: 'Move hovered task to tomorrow', group: 'Hovered task' },
  { action: 'deleteHovered', description: 'Delete hovered task', group: 'Hovered task' },
]

export const defaultShortcuts: ShortcutMap = {
  showShortcuts: '?',
  quickAdd: 'Ctrl+Shift+A',
  planMyDay: 'Ctrl+Shift+P',
  search: 'Ctrl+K',
  configureRecurrence: 'Ctrl+R',
  undo: 'Ctrl+Z',
  toggleCompleted: 'V',
  completeHovered: 'Space',
  moveHoveredToday: 'H',
  moveHoveredTomorrow: 'M',
  deleteHovered: 'Delete',
}

export const shortcutStorageKey = 'tasker.shortcuts.v1'

export function getShortcutLabel(event: KeyboardEvent | React.KeyboardEvent) {
  const parts: string[] = []

  if (event.ctrlKey) parts.push('Ctrl')
  if (event.metaKey) parts.push('Meta')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')

  const key = event.code === 'Space' ? 'Space' : event.key.length === 1 ? event.key.toUpperCase() : event.key

  if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
    parts.push(key)
  }

  return parts.join('+')
}

export function loadShortcuts() {
  try {
    const raw = localStorage.getItem(shortcutStorageKey)
    if (!raw) return defaultShortcuts
    const trimmedRaw = raw.trim()
    if (!trimmedRaw.startsWith('{')) {
      localStorage.removeItem(shortcutStorageKey)
      return defaultShortcuts
    }

    return { ...defaultShortcuts, ...(JSON.parse(trimmedRaw) as Partial<ShortcutMap>) }
  } catch {
    localStorage.removeItem(shortcutStorageKey)
    return defaultShortcuts
  }
}

export function saveShortcuts(shortcuts: ShortcutMap) {
  localStorage.setItem(shortcutStorageKey, JSON.stringify(shortcuts))
}
