import { Fragment, type ReactNode } from 'react'

type MarkdownPreviewProps = {
  value: string
}

function inlineMarkdown(text: string) {
  const nodes: ReactNode[] = []
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text))) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index))

    const token = match[0]
    const key = `${match.index}-${token}`

    if (token.startsWith('`')) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>)
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>)
    }

    cursor = match.index + token.length
  }

  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

function headingNode(level: number, key: string, children: ReactNode) {
  if (level === 1) return <h1 key={key}>{children}</h1>
  if (level === 2) return <h2 key={key}>{children}</h2>
  if (level === 3) return <h3 key={key}>{children}</h3>
  return <h4 key={key}>{children}</h4>
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

    const fence = line.match(/^```(.*)$/)
    if (fence) {
      const codeLines: string[] = []
      index += 1

      while (index < lines.length && !lines[index].startsWith('```')) {
        codeLines.push(lines[index])
        index += 1
      }

      nodes.push(
        <pre key={`code-${index}`}>
          <code>{codeLines.join('\n')}</code>
        </pre>,
      )
      index += 1
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      const level = heading[1].length
      nodes.push(headingNode(level, `heading-${index}`, inlineMarkdown(heading[2])))
      index += 1
      continue
    }

    if (/^[-*_]{3,}\s*$/.test(line)) {
      nodes.push(<hr key={`hr-${index}`} />)
      index += 1
      continue
    }

    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/)
    if (listMatch) {
      const ordered = /\d+\./.test(listMatch[2])
      const items: ReactNode[] = []

      while (index < lines.length) {
        const itemMatch = lines[index].match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/)
        if (!itemMatch || /\d+\./.test(itemMatch[2]) !== ordered) break
        items.push(<li key={`item-${index}`}>{inlineMarkdown(itemMatch[3])}</li>)
        index += 1
      }

      const ListTag = ordered ? 'ol' : 'ul'
      nodes.push(<ListTag key={`list-${index}`}>{items}</ListTag>)
      continue
    }

    if (line.startsWith('> ')) {
      const quoteLines: string[] = []

      while (index < lines.length && lines[index].startsWith('> ')) {
        quoteLines.push(lines[index].slice(2))
        index += 1
      }

      nodes.push(
        <blockquote key={`quote-${index}`}>
          {quoteLines.map((quoteLine, quoteIndex) => (
            <Fragment key={`${quoteLine}-${quoteIndex}`}>
              {inlineMarkdown(quoteLine)}
              {quoteIndex < quoteLines.length - 1 && <br />}
            </Fragment>
          ))}
        </blockquote>,
      )
      continue
    }

    const paragraphLines = [line]
    index += 1

    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^```/.test(lines[index]) &&
      !/^(#{1,6})\s+/.test(lines[index]) &&
      !/^(\s*)([-*+]|\d+\.)\s+/.test(lines[index]) &&
      !lines[index].startsWith('> ')
    ) {
      paragraphLines.push(lines[index])
      index += 1
    }

    nodes.push(
      <p key={`paragraph-${index}`}>
        {paragraphLines.map((paragraphLine, paragraphIndex) => (
          <Fragment key={`${paragraphLine}-${paragraphIndex}`}>
            {inlineMarkdown(paragraphLine)}
            {paragraphIndex < paragraphLines.length - 1 && <br />}
          </Fragment>
        ))}
      </p>,
    )
  }

  return <div className="markdown-preview">{nodes}</div>
}
