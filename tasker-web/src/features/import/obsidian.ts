export type ImportedMarkdownNote = {
  title: string
  content: string
  path: string
}

export type ObsidianImport = {
  sectionName: string
  notes: ImportedMarkdownNote[]
}

type ZipEntry = {
  path: string
  compression: number
  compressedSize: number
  uncompressedSize: number
  localHeaderOffset: number
}

const textDecoder = new TextDecoder()

function readUint16(view: DataView, offset: number) {
  return view.getUint16(offset, true)
}

function readUint32(view: DataView, offset: number) {
  return view.getUint32(offset, true)
}

function decodeBytes(bytes: Uint8Array) {
  return textDecoder.decode(bytes)
}

function naturalCompare(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
}

function cleanPath(path: string) {
  return path.replace(/\\/g, '/').replace(/^\/+/, '')
}

function fileTitle(path: string) {
  const name = cleanPath(path).split('/').pop() ?? path
  return name.replace(/\.md$/i, '').trim() || 'Untitled note'
}

function commonRoot(paths: string[]) {
  const roots = new Set(
    paths
      .map(cleanPath)
      .map((path) => path.split('/'))
      .filter((parts) => parts.length > 1)
      .map((parts) => parts[0]),
  )

  return roots.size === 1 ? [...roots][0] : null
}

function stripCommonRoot(path: string, root: string | null) {
  const normalized = cleanPath(path)
  return root && normalized.startsWith(`${root}/`) ? normalized.slice(root.length + 1) : normalized
}

function sectionNameFromFiles(files: File[]) {
  const pathRoots = files
    .map((file) => cleanPath(file.webkitRelativePath || file.name).split('/'))
    .filter((parts) => parts.length > 1)
    .map((parts) => parts[0])

  const roots = new Set(pathRoots)
  if (roots.size === 1) return [...roots][0]

  if (files.length === 1) return fileTitle(files[0].name)
  return `Obsidian import ${new Date().toLocaleDateString()}`
}

async function inflateRaw(bytes: Uint8Array) {
  if (!('DecompressionStream' in window)) {
    throw new Error('This browser cannot unzip compressed files. Drop the .md files directly instead.')
  }

  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function findEndOfCentralDirectory(view: DataView) {
  const minimumOffset = Math.max(0, view.byteLength - 0x10000 - 22)

  for (let offset = view.byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (readUint32(view, offset) === 0x06054b50) {
      return offset
    }
  }

  throw new Error('Could not read this ZIP file.')
}

function readZipEntries(buffer: ArrayBuffer) {
  const view = new DataView(buffer)
  const eocdOffset = findEndOfCentralDirectory(view)
  const entryCount = readUint16(view, eocdOffset + 10)
  let offset = readUint32(view, eocdOffset + 16)
  const entries: ZipEntry[] = []

  for (let index = 0; index < entryCount; index += 1) {
    if (readUint32(view, offset) !== 0x02014b50) {
      throw new Error('Could not read the ZIP directory.')
    }

    const compression = readUint16(view, offset + 10)
    const compressedSize = readUint32(view, offset + 20)
    const uncompressedSize = readUint32(view, offset + 24)
    const fileNameLength = readUint16(view, offset + 28)
    const extraLength = readUint16(view, offset + 30)
    const commentLength = readUint16(view, offset + 32)
    const localHeaderOffset = readUint32(view, offset + 42)
    const nameBytes = new Uint8Array(buffer, offset + 46, fileNameLength)
    const path = cleanPath(decodeBytes(nameBytes))

    if (path && !path.endsWith('/')) {
      entries.push({ path, compression, compressedSize, uncompressedSize, localHeaderOffset })
    }

    offset += 46 + fileNameLength + extraLength + commentLength
  }

  return entries
}

async function readZipEntry(buffer: ArrayBuffer, entry: ZipEntry) {
  const view = new DataView(buffer)
  const offset = entry.localHeaderOffset

  if (readUint32(view, offset) !== 0x04034b50) {
    throw new Error(`Could not read "${entry.path}" inside the ZIP.`)
  }

  const fileNameLength = readUint16(view, offset + 26)
  const extraLength = readUint16(view, offset + 28)
  const dataOffset = offset + 30 + fileNameLength + extraLength
  const compressedBytes = new Uint8Array(buffer, dataOffset, entry.compressedSize)

  if (entry.compression === 0) {
    return textDecoder.decode(compressedBytes)
  }

  if (entry.compression === 8) {
    const inflated = await inflateRaw(compressedBytes)
    if (entry.uncompressedSize > 0 && inflated.byteLength !== entry.uncompressedSize) {
      throw new Error(`"${entry.path}" could not be decompressed correctly.`)
    }
    return textDecoder.decode(inflated)
  }

  throw new Error(`"${entry.path}" uses a ZIP compression method that is not supported.`)
}

export async function parseObsidianImport(files: File[]): Promise<ObsidianImport> {
  const usableFiles = files.filter((file) => file.name.toLowerCase().endsWith('.md') || file.name.toLowerCase().endsWith('.zip'))

  if (usableFiles.length === 0) {
    throw new Error('Drop a .zip file or one or more .md files.')
  }

  const zipFiles = usableFiles.filter((file) => file.name.toLowerCase().endsWith('.zip'))
  if (zipFiles.length > 1 || (zipFiles.length === 1 && usableFiles.length > 1)) {
    throw new Error('Drop one ZIP at a time, or drop Markdown files directly.')
  }

  if (zipFiles.length === 1) {
    const zipFile = zipFiles[0]
    const buffer = await zipFile.arrayBuffer()
    const entries = readZipEntries(buffer).filter((entry) => entry.path.toLowerCase().endsWith('.md'))

    if (entries.length === 0) {
      throw new Error('This ZIP does not contain Markdown notes.')
    }

    const root = commonRoot(entries.map((entry) => entry.path))
    const sortedEntries = [...entries].sort((left, right) =>
      naturalCompare(stripCommonRoot(left.path, root), stripCommonRoot(right.path, root)),
    )

    const notes = await Promise.all(
      sortedEntries.map(async (entry) => ({
        title: fileTitle(stripCommonRoot(entry.path, root)),
        content: await readZipEntry(buffer, entry),
        path: stripCommonRoot(entry.path, root),
      })),
    )

    return {
      sectionName: root ?? fileTitle(zipFile.name),
      notes,
    }
  }

  const markdownFiles = usableFiles.filter((file) => file.name.toLowerCase().endsWith('.md'))
  const sortedFiles = [...markdownFiles].sort((left, right) =>
    naturalCompare(left.webkitRelativePath || left.name, right.webkitRelativePath || right.name),
  )

  const notes = await Promise.all(
    sortedFiles.map(async (file) => ({
      title: fileTitle(file.webkitRelativePath || file.name),
      content: await file.text(),
      path: file.webkitRelativePath || file.name,
    })),
  )

  return {
    sectionName: sectionNameFromFiles(markdownFiles),
    notes,
  }
}
