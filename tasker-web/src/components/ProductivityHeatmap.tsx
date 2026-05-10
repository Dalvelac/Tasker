import type { HeatmapDay } from '../features/stats/types'
import { formatDateKey, formatMonthLabel, toDateKey } from '../lib/dates'

type ProductivityHeatmapProps = {
  days: HeatmapDay[]
  from: string
  to: string
}

function getIntensity(count: number) {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count === 3) return 3
  return 4
}

function getMondayIndex(date: Date) {
  return (date.getDay() + 6) % 7
}

function getMonthKeys(to: string) {
  const end = new Date(`${to}T00:00:00`)
  const firstMonth = new Date(end.getFullYear(), end.getMonth() - 2, 1)

  return Array.from({ length: 3 }, (_, index) => {
    const monthDate = new Date(firstMonth)
    monthDate.setMonth(firstMonth.getMonth() + index)
    return toDateKey(monthDate).slice(0, 7)
  })
}

function getMonthCells(month: string, to: string, completedByDate: Map<string, number>) {
  const first = new Date(`${month}-01T00:00:00`)
  const nextMonth = new Date(first)
  nextMonth.setMonth(first.getMonth() + 1)
  const last = new Date(nextMonth)
  last.setDate(0)

  const finalDay = to.startsWith(month) ? new Date(`${to}T00:00:00`) : last
  const cells: Array<{
    column: number
    completed: number
    date: string
    day: number
    intensity: number
    row: number
  }> = []
  const cursor = new Date(first)

  while (cursor <= finalDay) {
    const date = toDateKey(cursor)
    const completed = completedByDate.get(date) ?? 0
    const offset = first.getDay() === 0 ? 6 : first.getDay() - 1
    const dayIndex = cursor.getDate() + offset - 1

    cells.push({
      column: Math.floor(dayIndex / 7) + 1,
      completed,
      date,
      day: cursor.getDate(),
      intensity: getIntensity(completed),
      row: getMondayIndex(cursor) + 1,
    })

    cursor.setDate(cursor.getDate() + 1)
  }

  return {
    cells,
    columns: Math.max(...cells.map((cell) => cell.column), 1),
    month,
  }
}

export function ProductivityHeatmap({ days, to }: ProductivityHeatmapProps) {
  const completedByDate = new Map(days.map((day) => [day.date, day.completed]))
  const months = getMonthKeys(to).map((month) => getMonthCells(month, to, completedByDate))

  return (
    <div className="heatmap" aria-label="Productivity heatmap">
      <div className="heatmap__months">
        {months.map((month) => (
          <div className="heatmap__month" key={month.month}>
            <span className="heatmap__month-label">{formatMonthLabel(month.month)}</span>
            <div className="heatmap__month-grid" style={{ gridTemplateColumns: `repeat(${month.columns}, 12px)` }}>
              {month.cells.map((cell) => (
                <span
                  aria-label={`${formatDateKey(cell.date)}: ${cell.completed} completed`}
                  className={`heatmap__cell heatmap__cell--${cell.intensity}`}
                  key={cell.date}
                  style={{ gridColumn: cell.column, gridRow: cell.row }}
                  title={`${formatDateKey(cell.date)} - ${cell.completed} completed`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="heatmap__legend">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span className={`heatmap__cell heatmap__cell--${level}`} key={level} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
