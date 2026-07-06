import React from 'react'
import { Plus, Sparkles, X } from 'lucide-react'
import { Button, Checkbox, Input, cn } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import type { ChecklistItem, ContentPost } from '../../data/contentTypes'
import { useContentPlannerStore } from './ContentPlannerContext'

// ---------------------------------------------------------------------------
// Recording-day checklist — the on-set companion inside the post's aside
// panel (ContentSplit). Mobile-first: big touch targets, every change persists
// immediately (the crew checks items off from a phone between takes).
// "Generate from script" seeds one item per `## TAKE …` heading.
// ---------------------------------------------------------------------------

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `ck-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

export function RecordingChecklist({ post }: { post: ContentPost }) {
  const t = useTranslation()
  const savePost = useContentPlannerStore((s) => s.savePost)
  const [items, setItems] = React.useState<ChecklistItem[]>(post.checklist)
  const [text, setText] = React.useState('')

  // Re-sync when navigating between posts
  React.useEffect(() => {
    setItems(post.checklist)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id])

  const persist = (next: ChecklistItem[]) => {
    setItems(next)
    void savePost({ id: post.id, checklist: next })
  }

  const toggle = (id: string) =>
    persist(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)))

  const remove = (id: string) => persist(items.filter((i) => i.id !== id))

  const add = () => {
    const value = text.trim()
    if (!value) return
    persist([...items, { id: newId(), text: value, done: false }])
    setText('')
  }

  const generateFromScript = () => {
    const takes = [...post.contentMd.matchAll(/^##\s+(TAKE\s+.+)$/gim)].map((m) =>
      m[1].trim(),
    )
    const existing = new Set(items.map((i) => i.text))
    const fresh = takes
      .filter((take) => !existing.has(take))
      .map((take) => ({ id: newId(), text: take, done: false }))
    if (fresh.length > 0) persist([...items, ...fresh])
  }

  const hasTakes = /^##\s+TAKE\s+/im.test(post.contentMd)
  const done = items.filter((i) => i.done).length

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{done}/{items.length}</span>
            {hasTakes && (
              <button
                type="button"
                onClick={generateFromScript}
                className="flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Sparkles className="h-3 w-3" />
                {t('marketing.content.checklistGenerate')}
              </button>
            )}
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: items.length ? `${(done / items.length) * 100}%` : 0 }}
            />
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="space-y-3 rounded-card border border-dashed border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">
            {t('marketing.content.checklistEmpty')}
          </p>
          {hasTakes && (
            <Button variant="outline" size="sm" onClick={generateFromScript}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {t('marketing.content.checklistGenerate')}
            </Button>
          )}
        </div>
      )}

      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="group/item flex items-start gap-2.5 rounded-button px-1 py-2 transition-colors hover:bg-muted/40">
            {/* label wraps the row → the whole line is the touch target */}
            <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
              <Checkbox checked={item.done} onChange={() => toggle(item.id)} className="mt-0.5" />
              <span
                className={cn(
                  'min-w-0 flex-1 text-sm leading-snug',
                  item.done ? 'text-muted-foreground line-through' : 'text-foreground',
                )}
              >
                {item.text}
              </span>
            </label>
            <button
              type="button"
              aria-label={t('marketing.content.cancel')}
              onClick={() => remove(item.id)}
              className="rounded p-0.5 text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover/item:opacity-100 focus:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('marketing.content.checklistAddPlaceholder')}
          onKeyDown={(e) => { if (e.key === 'Enter') add() }}
          className="h-8 text-sm"
        />
        <Button variant="outline" size="sm" onClick={add} disabled={!text.trim()} aria-label={t('marketing.content.checklistAdd')}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
