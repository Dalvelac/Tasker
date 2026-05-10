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

export function isBeforeToday(dateKey: string | null) {
  return Boolean(dateKey && dateKey < todayKey())
}
