import React, { useEffect } from 'react'
import { Users, TrendingUp, Target, Clock, AlertTriangle, Trophy, BarChart3, FileText } from 'lucide-react'
import { useCrmConfig, useCrmStore, formatCurrency } from '../CrmContext'
import { useTranslation } from '@fayz-ai/core'

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({ label, value, subtitle, icon: Icon, color }: {
  label: string; value: string; subtitle: string; icon: React.ElementType; color: string
}) {
  return (
    <div className="rounded-lg border bg-card shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sales funnel — horizontal bar chart
// ---------------------------------------------------------------------------

function SalesFunnel() {
  const t = useTranslation()
  const { currency } = useCrmConfig()
  const funnel = useCrmStore((s) => s.funnel)

  if (funnel.length === 0) {
    return (
      <div className="rounded-lg border bg-card shadow-sm p-5">
        <h3 className="text-sm font-semibold mb-4">{t('crm.dashboard.pipelineOverview')}</h3>
        <div className="flex flex-col items-center justify-center py-10">
          <BarChart3 className="h-8 w-8 text-muted-foreground/20 mb-2" />
          <p className="text-xs text-muted-foreground">{t('crm.dashboard.noPipelineData')}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{t('crm.dashboard.createFirstLead')}</p>
        </div>
      </div>
    )
  }

  const maxCount = Math.max(...funnel.map((s) => s.dealCount), 1)

  return (
    <div className="rounded-lg border bg-card shadow-sm p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold">{t('crm.dashboard.pipelineOverview')}</h3>
        <span className="text-[10px] text-muted-foreground">{t('crm.dashboard.totalDeals', { count: String(funnel.reduce((s, f) => s + f.dealCount, 0)) })}</span>
      </div>

      <div className="space-y-2.5">
        {funnel.map((stage) => {
          const widthPercent = Math.max((stage.dealCount / maxCount) * 100, 4)
          return (
            <div key={stage.stageId} className="flex items-center gap-3">
              <div className="w-24 shrink-0 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: stage.stageColor }} />
                <span className="text-xs text-muted-foreground truncate">{stage.stageName}</span>
              </div>
              <div className="flex-1 h-7 bg-muted/30 rounded-md overflow-hidden">
                <div
                  className="h-full rounded-md flex items-center px-2.5 transition-all"
                  style={{ width: `${widthPercent}%`, backgroundColor: stage.stageColor + '30' }}
                >
                  <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: stage.stageColor }}>
                    {stage.dealCount}
                  </span>
                </div>
              </div>
              {stage.totalValue > 0 && (
                <span className="text-[10px] text-muted-foreground w-20 text-right shrink-0 hidden sm:block">
                  {formatCurrency(stage.totalValue, currency)}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Performance metrics
// ---------------------------------------------------------------------------

function PerformanceMetrics() {
  const t = useTranslation()
  const { currency } = useCrmConfig()
  const summary = useCrmStore((s) => s.summary)

  const metrics = [
    { label: t('crm.dashboard.dealsWon'), value: String(summary?.wonDealsThisMonth ?? 0) },
    { label: t('crm.dashboard.revenueWon'), value: formatCurrency(summary?.wonDealsValueThisMonth ?? 0, currency), color: 'text-success' },
    { label: t('crm.dashboard.avgDealValue'), value: formatCurrency(summary?.averageDealValue ?? 0, currency) },
    { label: t('crm.dashboard.conversionRateLabel'), value: `${(summary?.conversionRate ?? 0).toFixed(1)}%` },
  ]

  return (
    <div className="rounded-lg border bg-card shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-4 w-4 text-warning" />
        <h3 className="text-sm font-semibold">{t('crm.dashboard.performance')}</h3>
      </div>
      <div className="space-y-3">
        {metrics.map((m) => (
          <div key={m.label} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{m.label}</span>
            <span className={`text-sm font-semibold ${m.color ?? ''}`}>{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pipeline value bar
// ---------------------------------------------------------------------------

function PipelineValueBar() {
  const t = useTranslation()
  const { currency } = useCrmConfig()
  const funnel = useCrmStore((s) => s.funnel)
  const totalValue = funnel.reduce((s, f) => s + f.totalValue, 0)

  return (
    <div className="rounded-lg border bg-card shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">{t('crm.dashboard.pipelineValue')}</h3>
        </div>
        <span className="text-sm font-bold">{formatCurrency(totalValue, currency)}</span>
      </div>

      {totalValue > 0 ? (
        <>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {funnel.filter((s) => s.totalValue > 0).map((stage) => (
              <div
                key={stage.stageId}
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(stage.totalValue / totalValue) * 100}%`,
                  backgroundColor: stage.stageColor,
                  minWidth: '4px',
                }}
                title={`${stage.stageName}: ${formatCurrency(stage.totalValue, currency)}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            {funnel.filter((s) => s.totalValue > 0).map((stage) => (
              <div key={stage.stageId} className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.stageColor }} />
                <span className="text-[10px] text-muted-foreground">{stage.stageName}</span>
                <span className="text-[10px] font-medium">{formatCurrency(stage.totalValue, currency)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="h-3 rounded-full bg-muted/30" />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recent leads
// ---------------------------------------------------------------------------

function RecentLeads() {
  const t = useTranslation()
  const leads = useCrmStore((s) => s.leads)
  const fetchLeads = useCrmStore((s) => s.fetchLeads)

  useEffect(() => { fetchLeads({ pageSize: 5 }) }, [])

  const STATUS_COLORS: Record<string, string> = {
    new: 'bg-info',
    contacted: 'bg-magic',
    qualified: 'bg-success',
    converted: 'bg-warning',
    lost: 'bg-destructive',
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{t('crm.dashboard.recentLeads')}</h3>
        <span className="text-[10px] text-muted-foreground">{t('crm.dashboard.leadsCount', { count: String(leads.length) })}</span>
      </div>
      {leads.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">{t('crm.dashboard.noLeadsYet')}</p>
      ) : (
        <div className="space-y-0.5">
          {leads.slice(0, 5).map((lead) => (
            <div key={lead.id} className="flex items-center gap-3 py-2 border-b last:border-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                {lead.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{lead.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{lead.email || lead.phone || lead.sourceName || '—'}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className={`h-1.5 w-1.5 rounded-full ${STATUS_COLORS[lead.status] ?? 'bg-muted-foreground/40'}`} />
                <span className="text-[10px] text-muted-foreground capitalize">{lead.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recent quotes
// ---------------------------------------------------------------------------

function RecentQuotes() {
  const t = useTranslation()
  const { currency } = useCrmConfig()
  const quotes = useCrmStore((s) => s.quotes)
  const fetchQuotes = useCrmStore((s) => s.fetchQuotes)

  useEffect(() => { fetchQuotes({ pageSize: 5 }) }, [])

  const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-muted-foreground',
    sent: 'bg-info',
    approved: 'bg-success',
    rejected: 'bg-destructive',
    expired: 'bg-warning',
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">{t('crm.dashboard.recentQuotes')}</h3>
        </div>
        <span className="text-[10px] text-muted-foreground">{t('crm.dashboard.quotesCount', { count: String(quotes.length) })}</span>
      </div>
      {quotes.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">{t('crm.dashboard.noQuotesYet')}</p>
      ) : (
        <div className="space-y-0.5">
          {quotes.slice(0, 5).map((q) => (
            <div key={q.id} className="flex items-center gap-3 py-2 border-b last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{q.quoteNumber}</span>
                  <div className="flex items-center gap-1">
                    <div className={`h-1.5 w-1.5 rounded-full ${STATUS_COLORS[q.status] ?? 'bg-muted-foreground/40'}`} />
                    <span className="text-[10px] text-muted-foreground capitalize">{q.status}</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{q.contactName || '—'}</p>
              </div>
              <span className="text-xs font-semibold shrink-0">{formatCurrency(q.totalAmount, currency)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function DashboardView() {
  const t = useTranslation()
  const { currency } = useCrmConfig()
  const summary = useCrmStore((s) => s.summary)
  const pipelines = useCrmStore((s) => s.pipelines)
  const fetchSummary = useCrmStore((s) => s.fetchSummary)
  const fetchPipelines = useCrmStore((s) => s.fetchPipelines)
  const fetchFunnel = useCrmStore((s) => s.fetchFunnel)

  useEffect(() => {
    fetchPipelines()
    fetchSummary()
  }, [])

  useEffect(() => {
    if (pipelines.length > 0) fetchFunnel(pipelines[0].id)
  }, [pipelines])

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('crm.dashboard.totalLeads')}
          value={String(summary?.totalLeads ?? 0)}
          subtitle={t('crm.dashboard.newThisMonth', { count: String(summary?.newLeadsThisMonth ?? 0) })}
          icon={Users}
          color="bg-info/15 text-info dark:bg-info/20"
        />
        <StatCard
          label={t('crm.dashboard.openPipeline')}
          value={formatCurrency(summary?.openDealsValue ?? 0, currency)}
          subtitle={t('crm.dashboard.activeDeals', { count: String(summary?.totalDeals ?? 0) })}
          icon={Target}
          color="bg-magic/15 text-magic dark:bg-magic/20"
        />
        <StatCard
          label={t('crm.dashboard.conversionRate')}
          value={`${(summary?.conversionRate ?? 0).toFixed(1)}%`}
          subtitle={t('crm.dashboard.leadToDeal')}
          icon={TrendingUp}
          color="bg-success-soft text-success-soft-foreground"
        />
        <StatCard
          label={t('crm.dashboard.pendingTasks')}
          value={String(summary?.pendingActivities ?? 0)}
          subtitle={t('crm.dashboard.overdueCount', { count: String(summary?.overdueActivities ?? 0) })}
          icon={summary?.overdueActivities ? AlertTriangle : Clock}
          color={summary?.overdueActivities
            ? 'bg-destructive-soft text-destructive-soft-foreground'
            : 'bg-warning/15 text-warning dark:bg-warning/20'}
        />
      </div>

      {/* Funnel + Performance */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SalesFunnel />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <PerformanceMetrics />
        </div>
      </div>

      {/* Pipeline value + Recent leads + Recent quotes */}
      <div className="grid gap-4 lg:grid-cols-3">
        <PipelineValueBar />
        <RecentLeads />
        <RecentQuotes />
      </div>
    </div>
  )
}
