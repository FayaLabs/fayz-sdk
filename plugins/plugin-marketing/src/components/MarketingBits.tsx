import React from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn, SegmentedControl } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import type { CampaignStatus, DateRangeKey } from '../types'
import { trendDelta } from '../format'
import { useMarketingStore } from '../MarketingContext'
import { ChannelIcon } from './icons'
import { useChannelLookup } from '../MarketingContext'

// ---------------------------------------------------------------------------
// KPI card with optional trend chip.
// ---------------------------------------------------------------------------

export function KpiCard({
  icon: Icon, label, value, sub, current, previous, invertTrend,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
  current?: number
  previous?: number
  /** for cost-style metrics where down is good (e.g. CPA) */
  invertTrend?: boolean
}) {
  const trend = current != null && previous != null ? trendDelta(current, previous) : null
  const good = trend ? (invertTrend ? trend.dir === 'down' : trend.dir === 'up') : false
  const bad = trend ? (invertTrend ? trend.dir === 'up' : trend.dir === 'down') : false
  return (
    <div className="rounded-card border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {trend && trend.dir !== 'neutral' && (
          <span className={cn(
            'mb-0.5 inline-flex items-center gap-0.5 text-xs font-medium',
            good && 'text-emerald-600', bad && 'text-rose-600',
            !good && !bad && 'text-muted-foreground',
          )}>
            {trend.dir === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {trend.pct.toFixed(0)}%
          </span>
        )}
      </div>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Date-range selector (segmented). Reads/writes the shared store range.
// ---------------------------------------------------------------------------

const RANGES: DateRangeKey[] = ['7d', '30d', '90d']

export function RangeTabs() {
  const range = useMarketingStore((s) => s.range)
  const setRange = useMarketingStore((s) => s.setRange)
  return (
    <SegmentedControl
      options={RANGES}
      value={range}
      onChange={(r) => void setRange(r)}
      aria-label="Time range"
    />
  )
}

// ---------------------------------------------------------------------------
// Status badge for campaigns.
// ---------------------------------------------------------------------------

const STATUS_STYLE: Record<CampaignStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  ended: 'bg-muted text-muted-foreground',
  draft: 'bg-slate-100 text-slate-600',
}

export function StatusBadge({ status }: { status: CampaignStatus }) {
  const t = useTranslation()
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', STATUS_STYLE[status])}>
      {t(`marketing.status.${status}`)}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Channel cell (icon + label) used in tables.
// ---------------------------------------------------------------------------

export function ChannelCell({ channelId }: { channelId: string }) {
  const lookup = useChannelLookup()
  const ch = lookup.get(channelId)
  return (
    <span className="inline-flex items-center gap-1.5 text-foreground">
      <ChannelIcon name={ch?.icon ?? 'Link2'} className="h-3.5 w-3.5 text-muted-foreground" />
      {ch?.label ?? channelId}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Horizontal proportion bar (funnel / channel-mix), no charting dep.
// ---------------------------------------------------------------------------

export function ProportionBar({ value, max, color, label, right }: {
  value: number
  max: number
  color: string
  label: React.ReactNode
  right?: React.ReactNode
}) {
  const pct = max > 0 ? Math.max((value / max) * 100, 2) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 shrink-0 text-sm text-muted-foreground">{label}</div>
      <div className="h-7 flex-1 overflow-hidden rounded-md bg-muted/40">
        <div className="flex h-full items-center rounded-md px-2 text-xs font-semibold"
          style={{ width: `${pct}%`, backgroundColor: color + '26', color }}>
          {right}
        </div>
      </div>
    </div>
  )
}
