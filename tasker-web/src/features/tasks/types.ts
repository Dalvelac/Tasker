export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled' | 'postponed'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TaskType = 'task' | 'event' | 'time_block'
export type DayPeriod = 'morning' | 'afternoon' | 'night'
export type RecurrenceType = 'daily' | 'weekly' | 'monthly'

export type Task = {
  id: number
  title: string
  notes: string | null
  section_id: number | null
  date: string | null
  due_date: string | null
  start_time: string | null
  end_time: string | null
  duration_minutes: number | null
  priority: TaskPriority
  status: TaskStatus
  type: TaskType
  is_all_day: number
  day_period: DayPeriod | null
  recurrence_rule: string | null
  recurrence_type: RecurrenceType | null
  recurrence_interval: number | null
  recurrence_days: string | null
  recurrence_until: string | null
  parent_task_id: number | null
  completed_at: string | null
  created_at: string
  updated_at: string
  section_name: string | null
  section_slug: string | null
  section_color: string | null
  section_icon: string | null
}

export type TaskInput = {
  title?: string
  notes?: string | null
  section_id?: number | null
  date?: string | null
  start_time?: string | null
  end_time?: string | null
  duration_minutes?: number | null
  priority?: TaskPriority
  status?: TaskStatus
  type?: TaskType
  is_all_day?: boolean | number
  day_period?: DayPeriod | null
  recurrence_type?: RecurrenceType | null
  recurrence_interval?: number | null
  recurrence_until?: string | null
}

export type TaskFilters = {
  sectionId?: number | null
  status?: TaskStatus
  priority?: TaskPriority
  date?: string
  from?: string
  to?: string
  inbox?: boolean
  unscheduled?: boolean
  includeDone?: boolean
}
