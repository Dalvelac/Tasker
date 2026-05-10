export type ViewId =
  | 'dashboard'
  | 'today'
  | 'planner'
  | 'plan'
  | 'calendar'
  | 'upcoming'
  | 'overdue'
  | 'inbox'
  | 'unscheduled'
  | 'sections'

export const navigationItems: Array<{ id: ViewId; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: 'DB' },
  { id: 'today', label: 'Today', icon: 'TD' },
  { id: 'plan', label: 'Plan My Day', icon: 'PM' },
  { id: 'planner', label: 'Stacked Planner', icon: 'SP' },
  { id: 'calendar', label: 'Calendar', icon: 'CA' },
  { id: 'upcoming', label: 'Next 7 Days', icon: 'N7' },
  { id: 'overdue', label: 'Overdue', icon: 'OD' },
  { id: 'inbox', label: 'Inbox', icon: 'IN' },
  { id: 'unscheduled', label: 'Unscheduled', icon: 'UN' },
  { id: 'sections', label: 'Sections', icon: 'SC' },
]
