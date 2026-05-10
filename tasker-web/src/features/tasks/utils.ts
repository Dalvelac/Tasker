import { addDays, formatShortDate, todayKey } from '../../lib/dates'
import type { Task } from './types'

const priorityWeight = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
}

export function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    const timeA = a.start_time ?? '99:99'
    const timeB = b.start_time ?? '99:99'

    if (timeA !== timeB) return timeA.localeCompare(timeB)
    if (a.priority !== b.priority) return priorityWeight[a.priority] - priorityWeight[b.priority]
    return b.id - a.id
  })
}

export function groupPlannerTasks(tasks: Task[]) {
  const today = todayKey()
  const labels = [
    { key: today, title: `Hoy - ${formatShortDate(today)}` },
    { key: addDays(today, 1), title: `Manana - ${formatShortDate(addDays(today, 1))}` },
    { key: addDays(today, 2), title: `Proximos dias - ${formatShortDate(addDays(today, 2))}` },
    { key: addDays(today, 7), title: 'Esta semana' },
  ]

  return labels.map((label, index) => {
    const next = labels[index + 1]?.key
    const items = tasks.filter((task) => {
      if (!task.date) return false
      if (!next) return task.date >= label.key && task.date <= label.key
      return index < 2 ? task.date === label.key : task.date >= label.key && task.date < next
    })

    return {
      ...label,
      items: sortTasks(items),
    }
  })
}
