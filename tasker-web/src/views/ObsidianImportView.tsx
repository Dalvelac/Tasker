import { ObsidianDropzone } from '../components/ObsidianDropzone'
import type { ObsidianImport } from '../features/import/obsidian'
import type { Section } from '../features/sections/types'

type ObsidianImportViewProps = {
  sections: Section[]
  onImportObsidianNotes: (input: ObsidianImport) => Promise<void>
}

export function ObsidianImportView({ sections, onImportObsidianNotes }: ObsidianImportViewProps) {
  const importedSections = sections.filter((section) => section.description?.includes('Imported from Obsidian'))

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="view-eyebrow">Obsidian</p>
          <h2 className="view-title">Import Markdown notes</h2>
          <p className="view-description">Drop an Obsidian ZIP or select multiple .md files to create an ordered section.</p>
        </div>
      </div>

      <div className="obsidian-import-layout">
        <ObsidianDropzone onImport={onImportObsidianNotes} />

        <div className="task-list">
          {importedSections.map((section) => (
            <article className="task-card" key={section.id}>
              <span className="task-card__accent" style={{ background: section.color }} />
              <div className="task-card__main">
                <h3 className="task-card__title">{section.name}</h3>
                <div className="task-meta">
                  <span className="pill">{section.pending_count} notes</span>
                  <span className="pill">Markdown</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
