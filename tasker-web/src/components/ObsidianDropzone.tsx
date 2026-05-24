import { useRef, useState, type DragEvent } from 'react'
import { parseObsidianImport, type ObsidianImport } from '../features/import/obsidian'

type ObsidianDropzoneProps = {
  onImport: (input: ObsidianImport) => Promise<void>
}

export function ObsidianDropzone({ onImport }: ObsidianDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function importFiles(files: File[]) {
    if (files.length === 0 || isImporting) return

    setIsImporting(true)
    setMessage(null)

    try {
      const parsed = await parseObsidianImport(files)
      await onImport(parsed)
      setMessage(`Imported ${parsed.notes.length} notes into "${parsed.sectionName}".`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not import these notes.')
    } finally {
      setIsImporting(false)
      setIsDragging(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDragging(true)
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragging(false)
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    void importFiles([...event.dataTransfer.files])
  }

  return (
    <div
      className={`obsidian-dropzone ${isDragging ? 'is-dragging' : ''}`}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        accept=".zip,.md,text/markdown,text/x-markdown"
        className="visually-hidden"
        multiple
        onChange={(event) => void importFiles(Array.from(event.target.files ?? []))}
        type="file"
      />
      <div>
        <h3 className="card-title">Obsidian notes</h3>
        <p className="view-description">Drop one ZIP or several .md files. A new section will be created automatically.</p>
      </div>
      <button className="button" disabled={isImporting} onClick={() => inputRef.current?.click()} type="button">
        {isImporting ? 'Importing...' : 'Choose files'}
      </button>
      {message && <p className="obsidian-dropzone__message">{message}</p>}
    </div>
  )
}
