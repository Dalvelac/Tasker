import { apiRequest, buildQuery } from '../../lib/api'
import type { StatsOverview } from './types'

export function getStatsOverview(days = 180) {
  return apiRequest<StatsOverview>(`/api/stats/overview${buildQuery({ days })}`)
}
