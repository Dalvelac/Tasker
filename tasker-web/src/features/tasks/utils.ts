import { addDays, formatDateKey, formatShortDate, isBeforeToday, todayKey } from '../../lib/dates'
import type { DayPeriod, Task } from './types'

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
    { key: today, title: `Hoy - ${formatDateKey(today)}` },
    { key: addDays(today, 1), title: `Manana - ${formatDateKey(addDays(today, 1))}` },
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

export const periodLabels: Record<DayPeriod, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  night: 'Night',
}

export const dayPeriods = Object.keys(periodLabels) as DayPeriod[]

export function getPlanCandidates(tasks: Task[], dateKey = todayKey()) {
  return {
    overdue: sortTasks(tasks.filter((task) => isBeforeToday(task.date) && task.status !== 'done')),
    unscheduled: sortTasks(tasks.filter((task) => task.date === null && task.status !== 'done')),
    todayUnplanned: sortTasks(
      tasks.filter((task) => task.date === dateKey && task.day_period === null && task.status !== 'done'),
    ),
  }
}

export function getTasksByPeriod(tasks: Task[], dateKey = todayKey()) {
  return dayPeriods.reduce(
    (groups, period) => ({
      ...groups,
      [period]: sortTasks(tasks.filter((task) => task.date === dateKey && task.day_period === period)),
    }),
    {} as Record<DayPeriod, Task[]>,
  )
}
