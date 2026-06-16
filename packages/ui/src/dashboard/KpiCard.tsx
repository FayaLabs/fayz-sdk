import * as React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '../utils/cn'
import { Card, CardContent } from '../primitives/card'
import { renderIcon } from './icon'
import type { KpiCurrency, IconRef, KpiFormat, KpiValue, KpiTrend } from './types'

export function formatKpiValue(value: number, format?: KpiFormat, currency?: KpiCurrency): string {
  const locale = currency?.locale ?? 'pt-BR'
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat(locale, { style: 'currency', currency: currency?.code ?? 'BRL', maximumFractionDigits: 0 }).format(value)
    case 'percent':
      return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)}%`
    case 'duration':
      return `${Math.round(value)} min`
    default:
      return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)
  }
}

function deriveTrend(current: number, previous: number | undefined, explicit: KpiTrend | undefined): KpiTrend | undefined {
  if (explicit) return explicit
  if (previous == null) return undefined
  return current > previous ? 'up' : current < previous ? 'down' : 'neutral'
}

function TrendChip({ trend, delta, invert }: { trend: KpiTrend; delta: number | null; invert?: boolean }) {
  if (trend === 'neutral') return null
  const good = invert ? trend === 'down' : trend === 'up'
  const Icon = trend === 'up' ? TrendingUp : TrendingDown
  return (
    <span className={cn(
      'mb-0.5 inline-flex items-center gap-0.5 text-xs font-medium',
      good ? 'text-emerald-600' : 'text-rose-600',
    )}>
      <Icon className="h-3 w-3" />
      {delta != null ? `${delta > 0 ? '+' : ''}${delta}%` : null}
    </span>
  )
}

export interface KpiCardProps {
  label: string
  icon?: IconRef
  /** Pre-formatted/sync value. Provide this OR `compute`. */
  value?: React.ReactNode
  /** Numeric value formatted via `format`. Ignored when `value` is set. */
  amount?: number
  /** Async loader; the card shows a skeleton until it resolves. */
  compute?: () => Promise<KpiValue>
  format?: KpiFormat
  currency?: KpiCurrency
  sub?: React.ReactNode
  /** Trend chip inputs (for sync usage). */
  current?: number
  previous?: number
  trend?: KpiTrend
  /** For cost-style metrics where down is good (e.g. CPA). */
  invertTrend?: boolean
  loading?: boolean
}

/**
 * Canonical KPI card — consolidates the trend-chip card from plugin-marketing
 * and the async MetricCard from plugin-dashboard. Use directly, or via a
 * registered KPI widget (see defineKpiWidget).
 */
export function KpiCard(props: KpiCardProps) {
  const { label, icon, sub, format, currency, invertTrend } = props
  const [computed, setComputed] = React.useState<KpiValue | null>(null)
  const [errored, setErrored] = React.useState(false)

  React.useEffect(() => {
    if (!props.compute) return
    let cancelled = false
    props.compute()
      .then((v) => { if (!cancelled) setComputed(v) })
      .catch(() => { if (!cancelled) setErrored(true) })
    return () => { cancelled = true }
  }, [props.compute])

  const isAsync = Boolean(props.compute)
  const loading = props.loading || (isAsync && computed === null && !errored)

  let display: React.ReactNode = props.value
  let current = props.current
  let previous = props.previous
  let trend = props.trend
  let unit: string | undefined

  if (isAsync && computed) {
    display = formatKpiValue(computed.value, format, currency)
    current = computed.value
    previous = computed.previousValue
    trend = computed.trend
    unit = computed.unit
  } else if (display == null && props.amount != null) {
    display = formatKpiValue(props.amount, format, currency)
    current = current ?? props.amount
  }

  const resolvedTrend = current != null ? deriveTrend(current, previous, trend) : trend
  const delta = current != null && previous != null && previous !== 0
    ? Math.round(((current - previous) / previous) * 100)
    : null

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-muted-foreground">{renderIcon(icon)}</span>
        </div>
        {errored ? (
          <span className="text-sm text-muted-foreground">—</span>
        ) : loading ? (
          <div className="h-7 w-20 animate-pulse rounded bg-muted" />
        ) : (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              {display}
              {unit ? <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span> : null}
            </span>
            {resolvedTrend ? <TrendChip trend={resolvedTrend} delta={delta} invert={invertTrend} /> : null}
          </div>
        )}
        {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  )
}
