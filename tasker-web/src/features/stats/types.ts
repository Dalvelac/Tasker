export type HeatmapDay = {
  date: string
  completed: number
}

export type SectionStat = {
  section_id: number | null
  section_name: string | null
  section_color: string | null
  completed: number
  pending: number
}

export type StatsOverview = {
  range: {
    from: string
    to: string
    days: number
  }
  heatmap: HeatmapDay[]
  sections: SectionStat[]
  totals: {
    completed_today: number
    completed_week: number
    pending_total: number
    current_streak: number
    top_section: SectionStat | null
  }
}
