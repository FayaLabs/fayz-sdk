import * as React from 'react'
import { cn } from '../utils/cn'
import { SegmentedControl } from './segmented-control'
import { Markdown } from './markdown'

export interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Minimum visible rows for the textarea. */
  minRows?: number
  defaultMode?: 'edit' | 'preview'
  /** i18n injection — ui stays locale-agnostic. */
  editLabel?: string
  previewLabel?: string
  /** Custom preview renderer — e.g. a social-post mockup instead of plain
   *  markdown. Defaults to the built-in Markdown renderer. */
  renderPreview?: (value: string) => React.ReactNode
  className?: string
}

/**
 * Markdown editor with an edit/preview toggle. Plain textarea + the zero-dep
 * Markdown renderer — deliberately not a block/WYSIWYG editor (that's a later
 * milestone); this covers script/brief documents today.
 */
export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  minRows = 16,
  defaultMode = 'preview',
  editLabel = 'Edit',
  previewLabel = 'Preview',
  renderPreview,
  className,
}: MarkdownEditorProps) {
  const [mode, setMode] = React.useState<'edit' | 'preview'>(
    defaultMode === 'preview' && value.trim() === '' ? 'edit' : defaultMode,
  )
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex justify-end">
        <SegmentedControl
          aria-label="Markdown mode"
          options={[
            { value: 'edit', label: editLabel },
            { value: 'preview', label: previewLabel },
          ]}
          value={mode}
          onChange={(m) => setMode(m as 'edit' | 'preview')}
        />
      </div>
      {mode === 'edit' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={Math.max(minRows, value.split('\n').length + 1)}
          className={cn(
            'w-full resize-y rounded-md border border-border bg-card p-3',
            'font-mono text-[13px] leading-relaxed text-foreground',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring',
          )}
        />
      ) : renderPreview ? (
        renderPreview(value)
      ) : (
        <div className="rounded-md border border-border bg-card p-4">
          <Markdown source={value} />
        </div>
      )}
    </div>
  )
}
