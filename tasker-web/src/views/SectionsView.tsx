import { useState, type CSSProperties, type FormEvent } from 'react'
import { ObsidianDropzone } from '../components/ObsidianDropzone'
import type { ObsidianImport } from '../features/import/obsidian'
import type { Section, SectionInput } from '../features/sections/types'

type SectionsViewProps = {
  sections: Section[]
  onCreateSection: (input: SectionInput) => Promise<void>
  onDeleteSection: (id: number) => Promise<void>
  onImportObsidianNotes: (input: ObsidianImport) => Promise<void>
}

const defaultColors = ['#60A5FA', '#A78BFA', '#22C55E', '#F472B6', '#F59E0B', '#38BDF8', '#FB7185']

export function SectionsView({ sections, onCreateSection, onDeleteSection, onImportObsidianNotes }: SectionsViewProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(defaultColors[0])
  const [description, setDescription] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!name.trim()) return

    await onCreateSection({
      name: name.trim(),
      color,
      description: description.trim() || null,
    })

    setName('')
    setDescription('')
  }

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="view-eyebrow">Sections</p>
          <h2 className="view-title">Areas and projects</h2>
          <p className="view-description">Use small color accents to filter the planner without turning the UI noisy.</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="section-grid">
          {sections.map((section) => (
            <article
              className="card section-card"
              key={section.id}
              style={{ '--section-color': section.color } as CSSProperties}
            >
              <h3 className="section-card__name">{section.name}</h3>
              <p className="section-card__meta">{section.pending_count} pending</p>
              {section.description && <p className="view-description">{section.description}</p>}
              <button className="button button--danger" onClick={() => onDeleteSection(section.id)} type="button">
                Delete
              </button>
            </article>
          ))}
        </div>

        <aside className="sections-panel">
          <div className="card card--pad">
            <h3 className="card-title">New section</h3>
            <form className="form-grid" onSubmit={handleSubmit}>
              <label className="form-label">
                Name
                <input className="field" onChange={(event) => setName(event.target.value)} value={name} />
              </label>
              <label className="form-label">
                Color
                <input className="field" onChange={(event) => setColor(event.target.value)} type="color" value={color} />
              </label>
              <label className="form-label">
                Description
                <textarea
                  className="textarea"
                  onChange={(event) => setDescription(event.target.value)}
                  value={description}
                />
              </label>
              <button className="button button--primary" type="submit">
                Create section
              </button>
            </form>
          </div>

          <ObsidianDropzone onImport={onImportObsidianNotes} />
        </aside>
      </div>
    </section>
  )
}
