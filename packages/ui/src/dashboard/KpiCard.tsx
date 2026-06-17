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
      'inline-flex items-center gap-0.5 text-xs font-medium',
      good ? 'text-emerald-600' : 'text-rose-600',
    )}>
      <Icon className="h-3 w-3" />
      {delta != null ? `${delta > 0 ? '+' : ''}${delta}%` : null}
    </span>
  )
}

/** Trend-aware accent: green when good, red when bad, theme-info when flat. */
function trendColor(trend: KpiTrend | undefined, invert?: boolean): string {
  if (!trend || trend === 'neutral') return 'hsl(var(--info))'
  const good = invert ? trend === 'down' : trend === 'up'
  return good ? '#10b981' : '#f43f5e'
}

/** Tiny dependency-free SVG sparkline (oldest → newest), with a soft area fill. */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const gid = React.useId()
  if (!data || data.length < 2) return null
  const W = 96, H = 32, P = 3
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const step = (W - P * 2) / (data.length - 1)
  const pts = data.map((d, i) => {
    const x = P + i * step
    const y = P + (H - P * 2) * (1 - (d - min) / span)
    return [x, y] as const
  })
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-24 shrink-0 overflow-visible" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Semicircular radial gauge showing `value` as a fraction of `goal`. */
function Gauge({ value, goal, color, children }: { value: number; goal: number; color: string; children: React.ReactNode }) {
  const pct = goal > 0 ? Math.min(1, Math.max(0, value / goal)) : 0
  const R = 40, CX = 50, CY = 46, SW = 9
  const len = Math.PI * R
  const d = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`
  return (
    <div className="relative mx-auto w-full max-w-[160px]">
      <svg viewBox="0 0 100 52" className="w-full" aria-hidden>
        <path d={d} fill="none" stroke="hsl(var(--muted))" strokeWidth={SW} strokeLinecap="round" />
        <path
          d={d} fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round"
          strokeDasharray={len} strokeDashoffset={len * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center text-2xl font-semibold tracking-tight text-foreground">
        {children}
      </div>
    </div>
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
  /** Inline sparkline series (oldest → newest). Async usage: return via KpiValue.spark. */
  spark?: number[]
  /** Render the card as a radial gauge toward this goal value. */
  goal?: number
  /** Accent color for the sparkline/gauge. Defaults to a trend-aware color. */
  accent?: string
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
  let spark = props.spark

  if (isAsync && computed) {
    display = formatKpiValue(computed.value, format, currency)
    current = computed.value
    previous = computed.previousValue
    trend = computed.trend
    unit = computed.unit
    spark = computed.spark ?? spark
  } else if (display == null && props.amount != null) {
    display = formatKpiValue(props.amount, format, currency)
    current = current ?? props.amount
  }

  const resolvedTrend = current != null ? deriveTrend(current, previous, trend) : trend
  const delta = current != null && previous != null && previous !== 0
    ? Math.round(((current - previous) / previous) * 100)
    : null
  const accent = props.accent ?? trendColor(resolvedTrend, invertTrend)

  const valueText = (
    <>
      {display}
      {unit ? <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span> : null}
    </>
  )
  const trendChip = resolvedTrend ? <TrendChip trend={resolvedTrend} delta={delta} invert={invertTrend} /> : null

  // Pick a body layout: gauge (goal set) → sparkline (series set) → plain.
  const isGauge = props.goal != null && current != null
  const hasSpark = Boolean(spark && spark.length >= 2)

  let body: React.ReactNode
  if (errored) {
    body = <span className="text-sm text-muted-foreground">—</span>
  } else if (loading) {
    body = isGauge
      ? <div className="mx-auto h-16 w-32 animate-pulse rounded bg-muted" />
      : <div className="h-7 w-20 animate-pulse rounded bg-muted" />
  } else if (isGauge) {
    body = (
      <div>
        <Gauge value={current!} goal={props.goal!} color={accent}>{valueText}</Gauge>
        <div className="mt-1 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          {trendChip}
          <span>{sub ?? `out of ${formatKpiValue(props.goal!, format, currency)}`}</span>
        </div>
      </div>
    )
  } else if (hasSpark) {
    body = (
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xl font-semibold tracking-tight text-foreground">{valueText}</div>
          {trendChip ? <div className="mt-0.5">{trendChip}</div> : null}
        </div>
        <Sparkline data={spark!} color={accent} />
      </div>
    )
  } else {
    body = (
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl font-semibold tracking-tight text-foreground">{valueText}</span>
        {trendChip ? <span className="mb-0.5">{trendChip}</span> : null}
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-muted-foreground">{renderIcon(icon)}</span>
        </div>
        {body}
        {sub && !isGauge ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  )
}
