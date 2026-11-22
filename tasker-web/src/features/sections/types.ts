export type Section = {
  is_vault: number
  note_count: number
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
  is_vault?: boolean
  requestKey?: string
  name: string
  color: string
  icon?: string | null
  description?: string | null
}
