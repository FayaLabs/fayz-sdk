import React from 'react'
import { useTranslation } from '@fayz-ai/core'
import { useMarketingConfig, useMarketingStore } from '../MarketingContext'
import { formatNumber, formatPercent } from '../format'
import { RangeTabs } from '../components/MarketingBits'

export function FunnelView() {
  const t = useTranslation()
  const { conversion } = useMarketingConfig()
  const funnel = useMarketingStore((s) => s.funnel)
  const max = Math.max(...funnel.map((s) => s.count), 1)

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('marketing.funnel.subtitlePrefix')} {conversion.label.toLowerCase()}
        </p>
        <RangeTabs />
      </div>

      <div className="rounded-card border border-border bg-card p-5">
        <div className="space-y-3">
          {funnel.map((stage, i) => {
            const pct = max > 0 ? Math.max((stage.count / max) * 100, 4) : 0
            const prev = funnel[i - 1]
            const stepRate = prev && prev.count > 0 ? (stage.count / prev.count) * 100 : null
            return (
              <div key={stage.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{stage.label}</span>
                  <span className="text-muted-foreground">
                    {formatNumber(stage.count)}
                    {stepRate != null && <span className="ml-2 text-xs">({formatPercent(stepRate, 0)} {t('marketing.funnel.ofPrev')})</span>}
                  </span>
                </div>
                <div className="h-9 overflow-hidden rounded-md bg-muted/40">
                  <div className="h-full rounded-md" style={{ width: `${pct}%`, backgroundColor: stage.color + '33', borderLeft: `3px solid ${stage.color}` }} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-5 border-t border-border pt-4 text-sm">
          <span className="text-muted-foreground">{t('marketing.funnel.overall')}: </span>
          <span className="font-semibold text-foreground">
            {funnel.length > 1 && funnel[0].count > 0
              ? formatPercent((funnel[funnel.length - 1].count / funnel[0].count) * 100)
              : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}
