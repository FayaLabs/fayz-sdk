import * as React from 'react'

// Minimal markdown for chat bubbles — the subset agents actually emit:
// **bold**, *italic*, `code`, [links](url), - / 1. lists, ### headings and
// paragraphs. Built as React nodes (never innerHTML), so model output can't
// inject markup. Deliberately dependency-free: the saas package ships in every
// generated app and a full markdown library is ~30kb for four constructs.

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  // Tokenize: code first (protects its content), then bold, italic, links.
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)\s]+\))/g
  let last = 0
  let match: RegExpExecArray | null
  let i = 0
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index))
    const token = match[0]
    const key = `${keyBase}-${i++}`
    if (token.startsWith('`')) {
      out.push(
        <code key={key} className="rounded bg-black/10 px-1 font-mono text-[0.85em] dark:bg-white/10">
          {token.slice(1, -1)}
        </code>,
      )
    } else if (token.startsWith('**')) {
      out.push(<strong key={key}>{renderInline(token.slice(2, -2), key)}</strong>)
    } else if (token.startsWith('*')) {
      out.push(<em key={key}>{renderInline(token.slice(1, -1), key)}</em>)
    } else {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token)
      if (link && /^(https?:\/\/|\/|#)/.test(link[2])) {
        out.push(
          <a key={key} href={link[2]} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            {renderInline(link[1], key)}
          </a>,
        )
      } else {
        out.push(token)
      }
    }
    last = match.index + token.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function ChatMarkdown({ content }: { content: string }) {
  const blocks: React.ReactNode[] = []
  const lines = content.split('\n')
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      blocks.push(
        <p key={key++} className="mt-1.5 font-semibold first:mt-0">
          {renderInline(heading[2], `h${key}`)}
        </p>,
      )
      i++
      continue
    }
    if (/^\s*([-*]|\d+[.)])\s+/.test(line)) {
      const items: React.ReactNode[] = []
      const ordered = /^\s*\d+[.)]\s+/.test(line)
      while (i < lines.length && /^\s*([-*]|\d+[.)])\s+/.test(lines[i])) {
        const item = lines[i].replace(/^\s*([-*]|\d+[.)])\s+/, '')
        items.push(<li key={items.length}>{renderInline(item, `li${key}-${items.length}`)}</li>)
        i++
      }
      const listClass = 'my-1 space-y-0.5 pl-4 first:mt-0 last:mb-0'
      blocks.push(
        ordered ? (
          <ol key={key++} className={`${listClass} list-decimal`}>{items}</ol>
        ) : (
          <ul key={key++} className={`${listClass} list-disc`}>{items}</ul>
        ),
      )
      continue
    }
    // Paragraph: swallow consecutive plain lines with soft breaks.
    const para: React.ReactNode[] = []
    while (i < lines.length && lines[i].trim() && !/^\s*([-*]|\d+[.)])\s+/.test(lines[i]) && !/^#{1,4}\s+/.test(lines[i])) {
      if (para.length) para.push(<br key={`br${key}-${para.length}`} />)
      para.push(...renderInline(lines[i], `p${key}-${para.length}`))
      i++
    }
    blocks.push(
      <p key={key++} className="my-1 first:mt-0 last:mb-0">
        {para}
      </p>,
    )
  }
  return <>{blocks}</>
}
