export type ViewId =
  | 'dashboard'
  | 'today'
  | 'planner'
  | 'plan'
  | 'focus'
  | 'calendar'
  | 'upcoming'
  | 'overdue'
  | 'inbox'
  | 'unscheduled'
  | 'obsidian'
  | 'sections'
  | 'shortcuts'

export type NavigationItem = {
  id: ViewId
  label: string
  icon: string
}

export type NavigationGroup = {
  id: string
  label: string
  items: NavigationItem[]
}

export const navigationGroups: NavigationGroup[] = [
  {
    id: 'daily',
    label: 'Daily',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: '⌂' },
      { id: 'today', label: 'Today', icon: '◉' },
      { id: 'plan', label: 'Plan My Day', icon: '✦' },
      { id: 'focus', label: 'Focus Timer', icon: '◌' },
    ],
  },
  {
    id: 'planning',
    label: 'Planning',
    items: [
      { id: 'planner', label: 'Stacked Planner', icon: '▤' },
      { id: 'calendar', label: 'Calendar', icon: '□' },
      { id: 'upcoming', label: 'Next 7 Days', icon: '↗' },
      { id: 'overdue', label: 'Overdue', icon: '!' },
    ],
  },
  {
    id: 'organize',
    label: 'Organize',
    items: [
      { id: 'inbox', label: 'Inbox', icon: '↓' },
      { id: 'unscheduled', label: 'Unscheduled', icon: '◇' },
      { id: 'obsidian', label: 'Obsidian Import', icon: 'MD' },
      { id: 'sections', label: 'Sections', icon: '⬡' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [{ id: 'shortcuts', label: 'Shortcuts', icon: '⌘' }],
  },
]

export const navigationItems = navigationGroups.flatMap((group) => group.items)
