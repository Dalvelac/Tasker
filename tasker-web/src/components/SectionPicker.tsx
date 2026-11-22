import type { Section } from '../features/sections/types'

type SectionPickerProps = {
  sections: Section[]
  filter?: boolean
  value: number | null
  onChange: (sectionId: number | null) => void
}

export function SectionPicker({ sections, value, onChange, filter = false }: SectionPickerProps) {
  return (
    <select
      aria-label={filter ? 'Filter by section' : 'Section'}
      className="select"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
    >
      <option value="">{filter ? 'All sections' : 'Inbox'}</option>
      {filter && <option value="-1">Inbox</option>}
      {sections.map((section) => (
        <option key={section.id} value={section.id}>
          {section.name}
        </option>
      ))}
    </select>
  )
}
