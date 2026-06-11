import React, { useEffect, useState } from 'react'
import * as LucideIcons from 'lucide-react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@fayz/ui/primitives'
import type { DashboardMetric, DashboardSection, MetricValue, MetricFormat } from './types'

export interface DashboardPageProps {
  title?: string
  subtitle?: string
  metrics?: DashboardMetric[]
  sections?: DashboardSection[]
  currency?: { code?: string; locale?: string; symbol?: string }
}

function formatMetricValue(value: number, format: MetricFormat | undefined, currency?: DashboardPageProps['currency']): string {
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

function MetricIcon({ name }: { name: string }) {
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name]
  if (!Icon) return null
  return <Icon className="h-4 w-4 text-muted-foreground" />
}

function TrendBadge({ current }: { current: MetricValue }) {
  const trend = current.trend
    ?? (current.previousValue == null
      ? undefined
      : current.value > current.previousValue ? 'up' : current.value < current.previousValue ? 'down' : 'neutral')
  if (!trend) return null

  const delta = current.previousValue
    ? Math.round(((current.value - current.previousValue) / current.previousValue) * 100)
    : null

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const color = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <TrendIcon className="h-3 w-3" />
      {delta != null ? `${delta > 0 ? '+' : ''}${delta}%` : null}
    </span>
  )
}

function MetricCard({ metric, currency }: { metric: DashboardMetric; currency?: DashboardPageProps['currency'] }) {
  const [current, setCurrent] = useState<MetricValue | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    metric.compute()
      .then((v) => { if (!cancelled) setCurrent(v) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [metric])

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground" title={metric.description}>{metric.label}</span>
          <MetricIcon name={metric.icon} />
        </div>
        {error ? (
          <span className="text-sm text-muted-foreground">—</span>
        ) : current === null ? (
          <div className="h-7 w-20 rounded bg-muted animate-pulse" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight">
              {formatMetricValue(current.value, metric.format, currency)}
              {current.unit ? <span className="text-sm font-normal text-muted-foreground ml-1">{current.unit}</span> : null}
            </span>
            <TrendBadge current={current} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardPage({ title = 'Dashboard', subtitle = 'Business overview', metrics = [], sections = [], currency }: DashboardPageProps) {
  const visibleMetrics = metrics
    .filter((m) => m.defaultVisible)
    .sort((a, b) => a.defaultOrder - b.defaultOrder)
  const sortedSections = [...sections].sort((a, b) => a.order - b.order)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>

      {visibleMetrics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleMetrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} currency={currency} />
          ))}
        </div>
      )}

      {visibleMetrics.length === 0 && sortedSections.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Welcome!</CardTitle>
            <CardDescription>Your dashboard will show key metrics and information here.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Configure metrics and sections when creating the plugin to customize this view.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedSections.map((section) => {
            const SectionComponent = section.component
            return (
              <div key={section.id}>
                <SectionComponent />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
