export type ViewId = 'dashboard' | 'today' | 'planner' | 'inbox' | 'unscheduled' | 'sections'

export const navigationItems: Array<{ id: ViewId; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: 'DB' },
  { id: 'today', label: 'Today', icon: 'TD' },
  { id: 'planner', label: 'Stacked Planner', icon: 'SP' },
  { id: 'inbox', label: 'Inbox', icon: 'IN' },
  { id: 'unscheduled', label: 'Unscheduled', icon: 'UN' },
  { id: 'sections', label: 'Sections', icon: 'SC' },
]
