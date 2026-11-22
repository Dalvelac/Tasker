export function isActionable(task: { kind?: string; status: string; date: string | null }, today: string) {
  if (task.kind === 'note') return false
  return task.status === 'pending' || task.status === 'in_progress'
    || (task.status === 'postponed' && task.date !== null && task.date <= today)
}

export function effectiveStatus<S extends string>(task: { status: S; date: string | null }, today: string) {
  return task.status === 'postponed' && task.date && task.date <= today ? 'pending' : task.status
}
