import { useRef, useState, type DragEvent } from 'react'
import { parseObsidianImport, type ImportProgress, type ObsidianImport } from '../features/import/obsidian'

type ObsidianDropzoneProps = {
  title?: string
  description?: string
  buttonLabel?: string
  destinationKey?: string
  compact?: boolean
  onImport: (input: ObsidianImport) => Promise<string | void>
}

export function ObsidianDropzone({
  title = 'Obsidian notes',
  description = 'Drop one ZIP or several .md files. A new section will be created automatically.',
  buttonLabel = 'Choose files',
  compact = false,
  destinationKey = 'new',
  onImport,
}: ObsidianDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const checkpoints = useRef(new Map<string, ImportProgress>())
  const [retryFiles, setRetryFiles] = useState<File[]>([])
  async function importFiles(files: File[]) {
    if (files.length === 0 || isImporting) return

    setIsImporting(true)
    setMessage(null)

    try {
      const parsed = await parseObsidianImport(files)
      const bytes = new TextEncoder().encode(JSON.stringify([parsed.sectionName, parsed.notes]))
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (n) =>
        n.toString(16).padStart(2, '0'),
      ).join('')
      const key = 'tasker.import.' + destinationKey + '.' + digest
      let progress: ImportProgress = checkpoints.current.get(key) ?? {
        completed: [],
        requestKey: crypto.randomUUID(),
      }
      try {
        progress = JSON.parse(sessionStorage.getItem(key) || 'null') ?? progress
      } catch {
        /* Use in-memory progress. */
      }
      parsed.progress = progress
      parsed.onProgress = (next) => {
        checkpoints.current.set(key, next)
        try {
          sessionStorage.setItem(key, JSON.stringify(next))
        } catch {
          /* The current import can continue. */
        }
        setMessage(
          `${next.completed.length} of ${parsed.notes.length} files saved in ${next.sectionName ?? title}.`,
        )
      }
      parsed.onProgress(progress)
      setRetryFiles(files)
      let nextMessage
      try {
        nextMessage = await onImport(parsed)
      } catch (cause) {
        const pending = parsed.notes
          .filter((_, index) => !progress.completed.includes(index))
          .map((note) => note.path)
        throw new Error(
          `${cause instanceof Error ? cause.message : 'Import interrupted'}. ${progress.completed.length} of ${parsed.notes.length} saved. Remaining: ${pending.join(', ')}`,
          { cause },
        )
      }
      checkpoints.current.delete(key)
      setRetryFiles([])
      try {
        sessionStorage.removeItem(key)
      } catch {
        /* No persistent checkpoint. */
      }
      setMessage(nextMessage ?? `Imported ${parsed.notes.length} notes into "${parsed.sectionName}".`)
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
      className={`obsidian-dropzone ${compact ? 'obsidian-dropzone--compact' : ''} ${isDragging ? 'is-dragging' : ''}`}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        aria-label={buttonLabel}
        accept=".zip,.md,text/markdown,text/x-markdown"
        className="visually-hidden"
        multiple
        onChange={(event) => void importFiles(Array.from(event.target.files ?? []))}
        type="file"
      />
      <div>
        <h3 className="card-title">{title}</h3>
        <p className="view-description">{description}</p>
      </div>
      <button className="button" disabled={isImporting} onClick={() => inputRef.current?.click()} type="button">
        {isImporting ? 'Importing...' : buttonLabel}
      </button>
      {retryFiles.length > 0 && !isImporting && (
        <button className="button" onClick={() => void importFiles(retryFiles)}>
          Retry remaining files
        </button>
      )}
      {message && (
        <p role="status" className="obsidian-dropzone__message">
          {message}
        </p>
      )}
    </div>
  )
}
