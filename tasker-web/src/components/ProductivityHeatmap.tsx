import type { HeatmapDay } from '../features/stats/types'
import { addDays, formatDateKey } from '../lib/dates'

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

export function ProductivityHeatmap({ days, from, to }: ProductivityHeatmapProps) {
  const completedByDate = new Map(days.map((day) => [day.date, day.completed]))
  const cells: Array<{ date: string; completed: number; intensity: number }> = []
  let cursor = from

  while (cursor <= to) {
    const completed = completedByDate.get(cursor) ?? 0
    cells.push({
      date: cursor,
      completed,
      intensity: getIntensity(completed),
    })
    cursor = addDays(cursor, 1)
  }

  return (
    <div className="heatmap" aria-label="Productivity heatmap">
      <div className="heatmap__grid">
        {cells.map((cell) => (
          <span
            aria-label={`${formatDateKey(cell.date)}: ${cell.completed} completed`}
            className={`heatmap__cell heatmap__cell--${cell.intensity}`}
            key={cell.date}
            title={`${formatDateKey(cell.date)} - ${cell.completed} completed`}
          />
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
