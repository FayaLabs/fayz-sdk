import * as React from 'react'
import { Sparkles, BookOpen, Pencil } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../hooks/useTranslation'
import type { ResolvedSuggestion, ResolvedToolGroup } from '../../hooks/useAITools'

interface ChatSuggestionsProps {
  suggestions: ResolvedSuggestion[]
  onSelect: (suggestion: ResolvedSuggestion) => void
}

const MAX_SUGGESTIONS = 5

export function ChatSuggestions({ suggestions, onSelect }: ChatSuggestionsProps) {
  const { t } = useTranslation()
  const visible = suggestions.slice(0, MAX_SUGGESTIONS)

  return (
    <div className="flex flex-col gap-1 px-3 py-3">
      <div className="flex items-center gap-1.5 px-1 pb-1">
        <Sparkles className="h-3 w-3 text-muted-foreground/60" />
        <span className="text-[11px] font-medium text-muted-foreground/70">{t('chat.tryAsking')}</span>
      </div>
      {visible.map((suggestion, i) => {
        const labelKey = `chat.suggestion.${suggestion.toolId}.${i}`
        const translated = t(labelKey)
        const label = translated === labelKey ? suggestion.label : translated
        return (
          <button
            key={`${suggestion.toolId}-${i}`}
            onClick={() => onSelect(suggestion)}
            className={cn(
              'rounded-md px-2.5 py-1.5 text-left text-xs text-muted-foreground',
              'transition-colors hover:bg-muted hover:text-foreground'
            )}
          >
            &ldquo;{label}&rdquo;
          </button>
        )
      })}
    </div>
  )
}

// --- Tools panel (shown via config button) ---

interface ChatToolsPanelProps {
  toolGroups: ResolvedToolGroup[]
  onClose: () => void
}

export function ChatToolsPanel({ toolGroups, onClose }: ChatToolsPanelProps) {
  const { t } = useTranslation()
  const totalTools = toolGroups.reduce((sum, g) => sum + g.tools.length, 0)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/40 bg-card px-4 py-2">
        <span className="text-[11px] font-semibold text-foreground">
          {t('chat.toolsAvailable', { count: totalTools })}
        </span>
        <button
          onClick={onClose}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('common.done')}
        </button>
      </div>
      <div className="flex flex-col gap-3 px-3 py-3">
        {toolGroups.map((group) => (
          <div key={group.category} className="flex flex-col gap-0.5">
            <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              {group.category}
            </span>
            {group.tools.map(({ tool, signature }) => {
              const ModeIcon = tool.mode === 'persist' ? Pencil : BookOpen
              return (
                <div
                  key={tool.id}
                  className="flex items-start gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-muted/50"
                  title={tool.description}
                >
                  <ModeIcon className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/40" />
                  <div className="min-w-0">
                    <code className="text-[11px] font-mono text-muted-foreground">
                      {signature}
                    </code>
                    {tool.description && (
                      <p className="text-[10px] leading-tight text-muted-foreground/40 truncate">
                        {tool.description}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
