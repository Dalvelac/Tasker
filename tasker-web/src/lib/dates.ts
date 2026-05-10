export function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayKey() {
  return toDateKey(new Date())
}

export function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export function formatShortDate(dateKey: string) {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${dateKey}T00:00:00`))
}

export function formatMonthLabel(monthKey: string) {
  return new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${monthKey}-01T00:00:00`))
}

export function isBeforeToday(dateKey: string | null) {
  return Boolean(dateKey && dateKey < todayKey())
}

export function monthKey(date = new Date()) {
  return toDateKey(date).slice(0, 7)
}

export function addMonths(month: string, amount: number) {
  const date = new Date(`${month}-01T00:00:00`)
  date.setMonth(date.getMonth() + amount)
  return toDateKey(date).slice(0, 7)
}

export function getMonthCalendarDays(month: string) {
  const first = new Date(`${month}-01T00:00:00`)
  const start = new Date(first)
  const mondayOffset = (first.getDay() + 6) % 7
  start.setDate(first.getDate() - mondayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const key = toDateKey(date)

    return {
      key,
      day: date.getDate(),
      isCurrentMonth: key.startsWith(month),
      isToday: key === todayKey(),
    }
  })
}
