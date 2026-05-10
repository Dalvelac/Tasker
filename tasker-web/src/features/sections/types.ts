export type Section = {
  id: number
  name: string
  slug: string
  color: string
  icon: string | null
  description: string | null
  pending_count: number
  created_at: string
  updated_at: string
}

export type SectionInput = {
  name: string
  color: string
  icon?: string | null
  description?: string | null
}
