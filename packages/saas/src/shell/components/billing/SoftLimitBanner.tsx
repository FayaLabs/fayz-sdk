import * as React from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@fayz-ai/ui'
import { useTranslation } from '../../hooks/useTranslation'
import { navigateTo } from '../../../app/routing'
import { useLimit, type LimitInfo } from './access-contract'

// ---------------------------------------------------------------------------
// SoftLimitBanner — discreet, persistent notice at the top of the content when
// a monitored limit is EXCEEDED (used > max), not merely reached. This is the
// Notion-style soft-limit path: the public booking flow (storefront
// createCustomer) never blocks the end client, so a tenant can overshoot its cap
// — the admin sees this banner nudging an upgrade. Dismissable for the session.
//
// `keys` are the limit keys to monitor; the shell derives them from
// `manifest.billing.softLimitKeys` (documented seam). Each key mounts a probe so
// hooks stay unconditional even as the list is config-driven.
// ---------------------------------------------------------------------------

function LimitProbe({ limitKey, onReport }: { limitKey: string; onReport: (key: string, info: LimitInfo) => void }) {
  const info = useLimit(limitKey)
  React.useEffect(() => {
    onReport(limitKey, info)
  }, [limitKey, info, onReport])
  return null
}

export function SoftLimitBanner({ keys }: { keys: string[] }) {
  const { t } = useTranslation()
  const tr = (key: string, fallback: string, params?: Record<string, string | number>) => {
    let v = t(key)
    if (!v || v === key) v = fallback
    if (params) for (const [k, val] of Object.entries(params)) v = v.replace(`{${k}}`, String(val)).replace(`{{${k}}}`, String(val))
    return v
  }

  const [over, setOver] = React.useState<Record<string, boolean>>({})
  const [dismissed, setDismissed] = React.useState<Record<string, boolean>>({})

  const report = React.useCallback((key: string, info: LimitInfo) => {
    const isOver = !info.unlimited && !info.loading && info.used > info.max
    setOver((prev) => {
      if (isOver === Boolean(prev[key])) return prev
      return { ...prev, [key]: isOver }
    })
  }, [])

  // Stable key list (avoid remounting probes each render).
  const monitored = React.useMemo(() => Array.from(new Set(keys)), [keys])

  const activeKey = monitored.find((k) => over[k] && !dismissed[k])

  return (
    <>
      {monitored.map((k) => (
        <LimitProbe key={k} limitKey={k} onReport={report} />
      ))}
      {activeKey && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-400/50 bg-amber-50/70 px-4 py-2.5 text-sm dark:bg-amber-950/25">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="min-w-0 flex-1 text-foreground">
            {tr('banner.overLimit', "You've exceeded the {label} limit of your plan — upgrade to keep growing.", {
              label: tr(`limit.label.${activeKey}`, activeKey),
            })}
          </span>
          <Button size="sm" onClick={() => navigateTo('/settings/subscription')}>
            {tr('upgrade.cta', 'View plans')}
          </Button>
          <button
            type="button"
            aria-label={tr('common.close', 'Close')}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-amber-400/20 hover:text-foreground"
            onClick={() => setDismissed((prev) => ({ ...prev, [activeKey]: true }))}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  )
}
