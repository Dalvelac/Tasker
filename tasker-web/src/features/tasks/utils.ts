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

export function getTaskDurationMinutes(task: Pick<Task, 'start_time' | 'end_time' | 'duration_minutes'>) {
  if (task.start_time && task.end_time) {
    const [startHour, startMinute] = task.start_time.split(':').map(Number)
    const [endHour, endMinute] = task.end_time.split(':').map(Number)
    const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute)

    return minutes > 0 ? minutes : task.duration_minutes
  }

  return task.duration_minutes
}

export function formatDuration(minutes: number | null) {
  if (!minutes) {
    return null
  }

  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60

  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`
}

export function addMinutesToTime(startTime: string, minutes: number) {
  const [hour, minute] = startTime.split(':').map(Number)
  const total = hour * 60 + minute + minutes
  const nextHour = Math.floor(total / 60) % 24
  const nextMinute = total % 60

  return `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`
}

export function getTimelineTasks(tasks: Task[]) {
  return sortTasks(
    tasks.filter((task) => task.start_time && (task.type === 'time_block' || task.end_time || task.duration_minutes)),
  )
}

export function groupPlannerTasks(tasks: Task[]) {
  const today = todayKey()
  const labels = [
    { key: today, title: `Today - ${formatDateKey(today)}` },
    { key: addDays(today, 1), title: `Tomorrow - ${formatDateKey(addDays(today, 1))}` },
    { key: addDays(today, 2), title: `Upcoming days - ${formatShortDate(addDays(today, 2))}` },
    { key: addDays(today, 7), title: 'This week' },
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

const weekdayLabels: Record<string, string> = {
  '1': 'Mon',
  '2': 'Tue',
  '3': 'Wed',
  '4': 'Thu',
  '5': 'Fri',
  '6': 'Sat',
  '0': 'Sun',
}

export function getTaskWeekday(dateKey: string | null) {
  if (!dateKey) return null
  return String(new Date(`${dateKey}T00:00:00`).getDay())
}

export function normalizeRecurrenceDays(days: string | null, dateKey: string | null) {
  if (days) return days
  return getTaskWeekday(dateKey)
}

export function formatRecurrenceLabel(
  task: Pick<Task, 'recurrence_type' | 'recurrence_interval' | 'recurrence_days' | 'recurrence_until' | 'date'>,
) {
  if (!task.recurrence_type) return null

  const interval = task.recurrence_interval && task.recurrence_interval > 0 ? task.recurrence_interval : 1
  let label: string

  if (task.recurrence_type === 'daily') {
    label = interval === 1 ? 'Every day' : `Every ${interval} days`
  } else if (task.recurrence_type === 'weekly') {
    const days = normalizeRecurrenceDays(task.recurrence_days, task.date)
      ?.split(',')
      .map((day) => weekdayLabels[day])
      .filter(Boolean)
      .join(', ')
    label = `${interval === 1 ? 'Every week' : `Every ${interval} weeks`}${days ? ` on ${days}` : ''}`
  } else {
    label = interval === 1 ? 'Every month' : `Every ${interval} months`
  }

  return task.recurrence_until ? `${label} until ${task.recurrence_until}` : label
}

export const periodLabels: Record<DayPeriod, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  night: 'Night',
}

export const periodTimeRanges: Record<DayPeriod, { end: string; start: string }> = {
  morning: { start: '06:00', end: '07:00' },
  afternoon: { start: '12:00', end: '13:00' },
  night: { start: '21:00', end: '22:00' },
}

export const dayPeriods = Object.keys(periodLabels) as DayPeriod[]

export function inferDayPeriodFromTime(startTime: string | null): DayPeriod | null {
  if (!startTime) {
    return null
  }

  const [hour] = startTime.split(':').map(Number)

  if (hour >= 6 && hour < 12) {
    return 'morning'
  }

  if (hour >= 12 && hour < 21) {
    return 'afternoon'
  }

  return 'night'
}

export function getEffectiveDayPeriod(task: Task) {
  return task.day_period ?? inferDayPeriodFromTime(task.start_time)
}

export function getPeriodDefaultTimeRange(period: DayPeriod) {
  return periodTimeRanges[period]
}

export function getPlanCandidates(tasks: Task[], dateKey = todayKey()) {
  return {
    overdue: sortTasks(tasks.filter((task) => isBeforeToday(task.date) && task.status !== 'done')),
    unscheduled: sortTasks(tasks.filter((task) => task.date === null && task.status !== 'done')),
    todayUnplanned: sortTasks(
      tasks.filter((task) => task.date === dateKey && getEffectiveDayPeriod(task) === null && task.status !== 'done'),
    ),
  }
}

export function getTasksByPeriod(tasks: Task[], dateKey = todayKey()) {
  return dayPeriods.reduce(
    (groups, period) => ({
      ...groups,
      [period]: sortTasks(tasks.filter((task) => task.date === dateKey && getEffectiveDayPeriod(task) === period)),
    }),
    {} as Record<DayPeriod, Task[]>,
  )
}
