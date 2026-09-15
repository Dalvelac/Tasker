import { useState } from 'react'
import { ObsidianDropzone } from '../../../components/ObsidianDropzone'
import type { ObsidianImport } from '../../import/obsidian'
import type { Section } from '../../sections/types'

interface NotebookSidebarProps {
  activeSectionId: number | null
  noteCounts: Map<number, number>
  sections: Section[]
  onCreate: (name: string) => Promise<void>
  onImport: (input: ObsidianImport) => Promise<string | void>
  onSelect: (section: Section) => void
}

export function NotebookSidebar({ activeSectionId, noteCounts, sections, onCreate, onImport, onSelect }: NotebookSidebarProps) {
  const [name, setName] = useState('')

  async function createNotebook() {
    const nextName = name.trim()
    if (!nextName) return
    await onCreate(nextName)
    setName('')
  }

  return (
    <aside className="obsidian-vault__folders" aria-label="Markdown folders">
      <ObsidianDropzone compact buttonLabel="New folder" description="Drop a ZIP or .md files to create a folder." onImport={onImport} title="Import" />
      <div className="obsidian-vault__quick-create">
        <input className="field" onChange={(event) => setName(event.target.value)} onKeyDown={(event) => {
          if (event.key === 'Enter') void createNotebook()
        }} placeholder="New import name" value={name} />
        <button className="button button--primary" onClick={createNotebook} type="button">Create</button>
      </div>
      <div className="obsidian-vault__section-list">
        <p className="obsidian-vault__label">Folders</p>
        {sections.length === 0 ? <p className="obsidian-vault__empty">No Markdown folders yet.</p> : sections.map((section) => (
          <button className={`obsidian-vault__folder ${activeSectionId === section.id ? 'is-active' : ''}`} key={section.id} onClick={() => onSelect(section)} type="button">
            <span className="obsidian-vault__folder-accent" style={{ background: section.color }} />
            <span><strong>{section.name}</strong><small>{noteCounts.get(section.id) ?? 0} notes</small></span>
          </button>
        ))}
      </div>
    </aside>
  )
}
