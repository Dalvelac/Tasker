import { Fragment, type ReactNode } from 'react'

type MarkdownPreviewProps = {
  value: string
}

function leadingFence(line: string) {
  return line.match(/^\s*(```+|~~~+)\s*([A-Za-z0-9_+.#-]*)\s*$/)
}

function closingFence(line: string, marker: string, markerLength: number) {
  const escapedMarker = marker === '`' ? '`' : '~'
  return new RegExp(`^\\s*${escapedMarker}{${markerLength},}\\s*$`).test(line)
}

function splitTableRow(line: string) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  const cells: string[] = []
  let cell = ''
  let escaped = false

  for (const char of trimmed) {
    if (escaped) {
      cell += char
      escaped = false
    } else if (char === '\\') {
      escaped = true
    } else if (char === '|') {
      cells.push(cell.trim())
      cell = ''
    } else {
      cell += char
    }
  }

  cells.push(cell.trim())
  return cells
}

function isTableSeparator(line: string) {
  return splitTableRow(line).every((cell) => /^:?-{2,}:?$/.test(cell.trim()))
}

function isTableStart(lines: string[], index: number) {
  return lines[index]?.includes('|') && Boolean(lines[index + 1]?.includes('|')) && isTableSeparator(lines[index + 1])
}

function inlineMarkdown(text: string) {
  const cleanText = text.replace(/%%.*?%%/g, '')
  const nodes: ReactNode[] = []
  const pattern =
    /(`+[^`]+`+|!\[\[([^\]]+)\]\]|\[\[([^\]]+)\]\]|\[([^\]]+)\]\(([^)]+)\)|==([^=]+)==|~~([^~]+)~~|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_)/g
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(cleanText))) {
    if (match.index > cursor) nodes.push(cleanText.slice(cursor, match.index))

    const token = match[0]
    const key = `${match.index}-${token}`

    if (token.startsWith('`')) {
      const fenceSize = token.match(/^`+/)?.[0].length ?? 1
      nodes.push(<code key={key}>{token.slice(fenceSize, -fenceSize)}</code>)
    } else if (match[2]) {
      nodes.push(
        <span className="markdown-preview__embed" key={key}>
          {match[2]}
        </span>,
      )
    } else if (match[3]) {
      const [target, alias] = match[3].split('|')
      nodes.push(
        <span className="markdown-preview__wikilink" key={key}>
          {alias || target}
        </span>,
      )
    } else if (match[4] && match[5]) {
      nodes.push(
        <a href={match[5]} key={key} rel="noreferrer" target={match[5].startsWith('http') ? '_blank' : undefined}>
          {inlineMarkdown(match[4])}
        </a>,
      )
    } else if (match[6]) {
      nodes.push(<mark key={key}>{inlineMarkdown(match[6])}</mark>)
    } else if (match[7]) {
      nodes.push(<del key={key}>{inlineMarkdown(match[7])}</del>)
    } else if (match[8] || match[9]) {
      nodes.push(<strong key={key}>{inlineMarkdown(match[8] ?? match[9])}</strong>)
    } else {
      nodes.push(<em key={key}>{inlineMarkdown(match[10] ?? match[11])}</em>)
    }

    cursor = match.index + token.length
  }

  if (cursor < cleanText.length) nodes.push(cleanText.slice(cursor))
  return nodes
}

function headingNode(level: number, key: string, children: ReactNode) {
  if (level === 1) return <h1 key={key}>{children}</h1>
  if (level === 2) return <h2 key={key}>{children}</h2>
  if (level === 3) return <h3 key={key}>{children}</h3>
  if (level === 4) return <h4 key={key}>{children}</h4>
  if (level === 5) return <h5 key={key}>{children}</h5>
  return <h6 key={key}>{children}</h6>
}

function renderLineBreakLines(lines: string[]) {
  return lines.map((line, lineIndex) => (
    <Fragment key={`${line}-${lineIndex}`}>
      {inlineMarkdown(line)}
      {lineIndex < lines.length - 1 && <br />}
    </Fragment>
  ))
}

export function MarkdownPreview({ value }: MarkdownPreviewProps) {
  const lines = value.replace(/\r\n?/g, '\n').split('\n')
  const nodes: ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]

    if (!line.trim()) {
      index += 1
      continue
    }

    const fence = leadingFence(line)
    if (fence) {
      const marker = fence[1][0]
      const markerLength = fence[1].length
      const language = fence[2]
      const codeLines: string[] = []
      index += 1

      while (index < lines.length && !closingFence(lines[index], marker, markerLength)) {
        codeLines.push(lines[index])
        index += 1
      }

      nodes.push(
        <div className="markdown-preview__code-block" key={`code-${index}`}>
          {language && <span className="markdown-preview__code-language">{language}</span>}
          <pre>
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>,
      )
      index += 1
      continue
    }

    if (/^( {4}|\t)/.test(line)) {
      const codeLines: string[] = []

      while (index < lines.length && (/^( {4}|\t)/.test(lines[index]) || !lines[index].trim())) {
        codeLines.push(lines[index].replace(/^( {4}|\t)/, ''))
        index += 1
      }

      nodes.push(
        <div className="markdown-preview__code-block" key={`indented-code-${index}`}>
          <pre>
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>,
      )
      continue
    }

    if (isTableStart(lines, index)) {
      const headers = splitTableRow(lines[index])
      const rows: string[][] = []
      index += 2

      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]))
        index += 1
      }

      nodes.push(
        <div className="markdown-preview__table-wrap" key={`table-${index}`}>
          <table>
            <thead>
              <tr>
                {headers.map((header, headerIndex) => (
                  <th key={`${header}-${headerIndex}`}>{inlineMarkdown(header)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {headers.map((_, cellIndex) => (
                    <td key={`cell-${rowIndex}-${cellIndex}`}>{inlineMarkdown(row[cellIndex] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      nodes.push(headingNode(heading[1].length, `heading-${index}`, inlineMarkdown(heading[2])))
      index += 1
      continue
    }

    if (/^[-*_](\s*[-*_]){2,}\s*$/.test(line)) {
      nodes.push(<hr key={`hr-${index}`} />)
      index += 1
      continue
    }

    const listMatch = line.match(/^(\s*)([-*+]|\d+[.)])\s+(\[[^\]]\]\s+)?(.+)$/)
    if (listMatch) {
      const ordered = /\d+[.)]/.test(listMatch[2])
      const items: ReactNode[] = []

      while (index < lines.length) {
        const itemMatch = lines[index].match(/^(\s*)([-*+]|\d+[.)])\s+(\[[^\]]\]\s+)?(.+)$/)
        if (!itemMatch || /\d+[.)]/.test(itemMatch[2]) !== ordered) break

        const taskMarker = itemMatch[3]?.trim()
        const isTask = Boolean(taskMarker)
        const checked = taskMarker ? !/\[\s\]/.test(taskMarker) : false

        items.push(
          <li className={isTask ? 'markdown-preview__task' : undefined} key={`item-${index}`}>
            {isTask && <input checked={checked} readOnly type="checkbox" />}
            {inlineMarkdown(itemMatch[4])}
          </li>,
        )
        index += 1
      }

      const ListTag = ordered ? 'ol' : 'ul'
      nodes.push(<ListTag key={`list-${index}`}>{items}</ListTag>)
      continue
    }

    if (line.startsWith('>')) {
      const quoteLines: string[] = []

      while (index < lines.length && lines[index].startsWith('>')) {
        quoteLines.push(lines[index].replace(/^>\s?/, ''))
        index += 1
      }

      const callout = quoteLines[0]?.match(/^\[!(\w+)\]([+-])?\s*(.*)$/)
      if (callout) {
        nodes.push(
          <div className={`markdown-preview__callout markdown-preview__callout--${callout[1].toLowerCase()}`} key={`callout-${index}`}>
            <div className="markdown-preview__callout-title">
              <span>{callout[1]}</span>
              {inlineMarkdown(callout[3] || callout[1])}
            </div>
            {quoteLines.length > 1 && <div className="markdown-preview__callout-body">{renderLineBreakLines(quoteLines.slice(1))}</div>}
          </div>,
        )
      } else {
        nodes.push(<blockquote key={`quote-${index}`}>{renderLineBreakLines(quoteLines)}</blockquote>)
      }
      continue
    }

    const paragraphLines = [line]
    index += 1

    while (
      index < lines.length &&
      lines[index].trim() &&
      !leadingFence(lines[index]) &&
      !/^(#{1,6})\s+/.test(lines[index]) &&
      !isTableStart(lines, index) &&
      !/^(\s*)([-*+]|\d+[.)])\s+/.test(lines[index]) &&
      !lines[index].startsWith('>')
    ) {
      paragraphLines.push(lines[index])
      index += 1
    }

    nodes.push(<p key={`paragraph-${index}`}>{renderLineBreakLines(paragraphLines)}</p>)
  }

  return <div className="markdown-preview">{nodes}</div>
}
