import type { Section } from '../features/sections/types'

type SectionPickerProps = {
  sections: Section[]
  value: number | null
  onChange: (sectionId: number | null) => void
}

export function SectionPicker({ sections, value, onChange }: SectionPickerProps) {
  return (
    <select
      className="select"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
    >
      <option value="">Inbox</option>
      {sections.map((section) => (
        <option key={section.id} value={section.id}>
          {section.name}
        </option>
      ))}
    </select>
  )
}
