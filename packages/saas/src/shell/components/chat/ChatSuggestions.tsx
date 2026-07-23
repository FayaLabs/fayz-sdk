import * as React from 'react'
import { ArrowUpRight, BookOpen, Infinity as InfinityIcon, Pencil, Sparkles, Trash2, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../hooks/useTranslation'
import {
  listAutoApprovals,
  revokeAllAutoApprovals,
  revokeAutoApproval,
  subscribeAutoApprovals,
  type AutoApprovalRule,
} from '../../lib/agent-approvals'
import type { ResolvedSuggestion, ResolvedToolGroup } from '../../hooks/useAITools'

interface ChatSuggestionsProps {
  suggestions: ResolvedSuggestion[]
  onSelect: (suggestion: ResolvedSuggestion) => void
  /** Rendered mid-conversation (user asked for them) — offer a way back. */
  onDismiss?: () => void
  compact?: boolean
}

const MAX_SUGGESTIONS = 5

export function ChatSuggestions({ suggestions, onSelect, onDismiss, compact }: ChatSuggestionsProps) {
  const { t } = useTranslation()
  const visible = suggestions.slice(0, compact ? 3 : MAX_SUGGESTIONS)
  if (!visible.length) return null

  return (
    <div
      className={cn(
        'flex flex-col gap-1 px-3 motion-safe:animate-slide-in-from-bottom',
        compact ? 'pb-2 pt-1' : 'py-2',
      )}
    >
      <div className="flex items-center gap-1.5 px-0.5 pb-1">
        <Sparkles className="h-3 w-3 text-primary/70" />
        <span className="text-[11px] font-medium text-muted-foreground">{t('chat.tryAsking')}</span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t('chat.suggestions.hide')}
            className="ml-auto -mr-1 rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
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
              'group flex items-center gap-2 rounded-xl border border-border/60 bg-muted/50 px-3 py-2 text-left',
              'text-[12.5px] leading-snug text-muted-foreground shadow-sm transition-all duration-200',
              'hover:border-primary/40 hover:bg-primary/[0.04] hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-primary" />
          </button>
        )
      })}
    </div>
  )
}

// --- Tools panel (shown via the header button) ------------------------------

interface ChatToolsPanelProps {
  toolGroups: ResolvedToolGroup[]
  onClose: () => void
}

export function ChatToolsPanel({ toolGroups, onClose }: ChatToolsPanelProps) {
  const { t } = useTranslation()
  const totalTools = toolGroups.reduce((sum, g) => sum + g.tools.length, 0)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/40 bg-card/95 px-4 py-2 backdrop-blur">
        <span className="text-[11px] font-semibold text-foreground">
          {t('chat.toolsAvailable', { count: totalTools })}
        </span>
        <button
          onClick={onClose}
          className="rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {t('common.done')}
        </button>
      </div>

      <AutoApprovalsSection />

      <div className="flex flex-col gap-3 px-3 pb-4 pt-2">
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
                  <ModeIcon
                    className={cn(
                      'mt-0.5 h-3 w-3 shrink-0',
                      tool.mode === 'persist' ? 'text-primary/50' : 'text-muted-foreground/40',
                    )}
                  />
                  <div className="min-w-0">
                    <code className="text-[11px] font-mono text-muted-foreground">{signature}</code>
                    {tool.description && (
                      <p className="truncate text-[10px] leading-tight text-muted-foreground/40">
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

/**
 * Where "always allow" goes to be taken back. A standing permission the user
 * cannot find and revoke is not a permission — it is a surprise.
 */
function AutoApprovalsSection() {
  const { t } = useTranslation()
  const [rules, setRules] = React.useState<AutoApprovalRule[]>(() => listAutoApprovals())

  React.useEffect(() => subscribeAutoApprovals(() => setRules(listAutoApprovals())), [])

  if (!rules.length) return null

  return (
    <div className="border-b border-border/40 px-3 py-2.5">
      <div className="flex items-center gap-1.5 px-1 pb-1.5">
        <InfinityIcon className="h-3 w-3 text-primary/70" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('chat.autoApprovals.title')}
        </span>
        <button
          type="button"
          onClick={() => revokeAllAutoApprovals()}
          className="ml-auto rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
        >
          {t('chat.autoApprovals.revokeAll')}
        </button>
      </div>
      <div className="flex flex-col gap-0.5">
        {rules.map((rule) => (
          <div
            key={rule.key}
            className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1"
          >
            <span className="min-w-0 flex-1 truncate text-[11.5px] text-foreground">{rule.label}</span>
            <button
              type="button"
              onClick={() => revokeAutoApproval(rule.key)}
              aria-label={t('chat.autoApprovals.revoke')}
              title={t('chat.autoApprovals.revoke')}
              className="rounded p-1 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
