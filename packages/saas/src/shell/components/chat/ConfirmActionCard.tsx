import * as React from 'react'
import { ShieldCheck } from 'lucide-react'
import { useTranslation } from '../../hooks/useTranslation'
import type { PendingAgentAction } from '../../stores/chat.store'

/**
 * The human gate in front of an agent write: shows what the agent wants to do
 * (tool + arguments) and blocks the conversation until the user decides —
 * the FAB's native rendering of the confirmation step every channel has
 * (WhatsApp asks "responda SIM", MCP uses elicitation).
 */
export function ConfirmActionCard({
  action,
  onResolve,
}: {
  action: PendingAgentAction
  onResolve: (approved: boolean) => void
}) {
  const { t } = useTranslation()
  const entries = Object.entries(action.params).filter(([, v]) => v !== undefined && v !== null)

  return (
    <div className="mx-3 my-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
      <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        {t('chat.confirmAction.title')}
      </div>
      <div className="mb-2 text-xs text-muted-foreground">{action.title}</div>
      {entries.length > 0 && (
        <dl className="mb-3 space-y-0.5">
          {entries.map(([key, value]) => (
            <div key={key} className="flex gap-2 text-xs">
              <dt className="shrink-0 font-mono text-muted-foreground">{key}</dt>
              <dd className="truncate text-foreground">{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onResolve(true)}
          className="inline-flex h-7 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-80"
        >
          {t('chat.confirmAction.confirm')}
        </button>
        <button
          type="button"
          onClick={() => onResolve(false)}
          className="inline-flex h-7 items-center rounded-md border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          {t('chat.confirmAction.cancel')}
        </button>
      </div>
    </div>
  )
}
