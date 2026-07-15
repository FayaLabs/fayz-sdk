import * as React from 'react'
import { cn } from '../utils/cn'

/**
 * Minimal markdown renderer — builds React elements directly (no HTML string,
 * no dangerouslySetInnerHTML), so untrusted content is safe by construction.
 * Supports the subset content docs actually use: h1–h3, ---, blockquote,
 * ul/ol, paragraphs, and inline **bold** / *italic* / `code`.
 */

const INLINE_TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split(INLINE_TOKEN).map((part, i) => {
    const key = `${keyPrefix}-${i}`
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      )
    }
    return part === '' ? null : <React.Fragment key={key}>{part}</React.Fragment>
  })
}

type Block =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'hr' }
  | { type: 'blockquote'; lines: string[] }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'p'; lines: string[] }

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    if (trimmed === '') { i++; continue }
    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed)
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length as 1 | 2 | 3, text: heading[2] })
      i++
      continue
    }
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }
    if (trimmed.startsWith('>')) {
      const quote: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quote.push(lines[i].trim().replace(/^>\s?/, ''))
        i++
      }
      blocks.push({ type: 'blockquote', lines: quote })
      continue
    }
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''))
        i++
      }
      blocks.push({ type: 'ul', items })
      continue
    }
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ''))
        i++
      }
      blocks.push({ type: 'ol', items })
      continue
    }
    const para: string[] = []
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,3}\s|>|[-*]\s|\d+[.)]\s|-{3,}$|\*{3,}$)/.test(lines[i].trim())) {
      para.push(lines[i].trim())
      i++
    }
    blocks.push({ type: 'p', lines: para })
  }
  return blocks
}

const HEADING_CLASS: Record<1 | 2 | 3, string> = {
  1: 'text-xl font-semibold tracking-tight',
  2: 'text-base font-semibold tracking-tight',
  3: 'text-sm font-semibold',
}

export function renderMarkdown(source: string): React.ReactNode {
  const blocks = parseBlocks(source)
  return blocks.map((block, bi) => {
    const key = `md-${bi}`
    switch (block.type) {
      case 'heading': {
        const Tag = (`h${block.level}`) as 'h1' | 'h2' | 'h3'
        return (
          <Tag key={key} className={HEADING_CLASS[block.level]}>
            {renderInline(block.text, key)}
          </Tag>
        )
      }
      case 'hr':
        return <hr key={key} className="border-border" />
      case 'blockquote':
        return (
          <blockquote key={key} className="border-l-2 border-border pl-3 text-muted-foreground">
            {block.lines.map((l, li) => (
              <p key={`${key}-${li}`}>{renderInline(l, `${key}-${li}`)}</p>
            ))}
          </blockquote>
        )
      case 'ul':
        return (
          <ul key={key} className="list-disc space-y-1 pl-5">
            {block.items.map((item, li) => (
              <li key={`${key}-${li}`}>{renderInline(item, `${key}-${li}`)}</li>
            ))}
          </ul>
        )
      case 'ol':
        return (
          <ol key={key} className="list-decimal space-y-1 pl-5">
            {block.items.map((item, li) => (
              <li key={`${key}-${li}`}>{renderInline(item, `${key}-${li}`)}</li>
            ))}
          </ol>
        )
      case 'p':
        return (
          <p key={key}>
            {block.lines.map((l, li) => (
              <React.Fragment key={`${key}-${li}`}>
                {li > 0 && <br />}
                {renderInline(l, `${key}-${li}`)}
              </React.Fragment>
            ))}
          </p>
        )
    }
  })
}

export interface MarkdownProps {
  source: string
  className?: string
}

/** Rendered markdown block — spacing tuned for script/brief documents. */
export function Markdown({ source, className }: MarkdownProps) {
  return (
    <div className={cn('space-y-3 text-sm leading-relaxed text-foreground', className)}>
      {renderMarkdown(source)}
    </div>
  )
}
