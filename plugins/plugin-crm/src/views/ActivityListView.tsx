import React, { useEffect, useState } from 'react'
import {
  Phone, Mail, Users, FileText, CheckSquare, MessageCircle, Check, Clock, Filter, Calendar,
  UserPlus, ArrowRightLeft, Target, MoveRight, Trophy, XCircle, FilePlus2, Send, FileCheck2, FileX2, Sparkles, ArrowRight,
} from 'lucide-react'
import { useCrmStore, useCrmProvider } from '../CrmContext'
import { useTranslation } from '@fayz-ai/core'
import { SubpageHeader } from '@fayz-ai/ui'
import { DealSidebar } from './DealSidebar'
import { SYSTEM_ACTIVITY_TYPES, type ActivityType } from '../types'

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  call: { icon: Phone, color: 'bg-info/15 text-info dark:bg-info/20', label: 'Call' },
  email: { icon: Mail, color: 'bg-magic/15 text-magic dark:bg-magic/20', label: 'Email' },
  meeting: { icon: Users, color: 'bg-success-soft text-success-soft-foreground', label: 'Meeting' },
  note: { icon: FileText, color: 'bg-warning/15 text-warning dark:bg-warning/20', label: 'Note' },
  task: { icon: CheckSquare, color: 'bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400', label: 'Task' },
  whatsapp: { icon: MessageCircle, color: 'bg-success/15 text-success dark:bg-success/20', label: 'WhatsApp' },
  // System timeline events (auto-logged by the data provider on every CRM write)
  lead_created: { icon: UserPlus, color: 'bg-info/15 text-info dark:bg-info/20', label: 'Lead created' },
  lead_converted: { icon: ArrowRightLeft, color: 'bg-magic/15 text-magic dark:bg-magic/20', label: 'Lead converted' },
  deal_created: { icon: Target, color: 'bg-info/15 text-info dark:bg-info/20', label: 'Deal created' },
  stage_changed: { icon: MoveRight, color: 'bg-warning/15 text-warning dark:bg-warning/20', label: 'Stage changed' },
  deal_won: { icon: Trophy, color: 'bg-success/15 text-success dark:bg-success/20', label: 'Deal won' },
  deal_lost: { icon: XCircle, color: 'bg-destructive/15 text-destructive dark:bg-destructive/20', label: 'Deal lost' },
  quote_created: { icon: FilePlus2, color: 'bg-info/15 text-info dark:bg-info/20', label: 'Quote created' },
  quote_sent: { icon: Send, color: 'bg-magic/15 text-magic dark:bg-magic/20', label: 'Quote sent' },
  quote_approved: { icon: FileCheck2, color: 'bg-success/15 text-success dark:bg-success/20', label: 'Quote approved' },
  quote_rejected: { icon: FileX2, color: 'bg-destructive/15 text-destructive dark:bg-destructive/20', label: 'Quote rejected' },
}

const SYSTEM_TYPES = new Set<string>(SYSTEM_ACTIVITY_TYPES)
const MANUAL_TYPES = Object.keys(TYPE_CONFIG).filter((t) => !SYSTEM_TYPES.has(t))

function ActivitySkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border bg-card shadow-sm p-4">
          <div className="h-9 w-9 rounded-lg bg-muted/40 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2 pt-0.5">
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-32 rounded bg-muted/40 animate-pulse" />
              <div className="h-4 w-12 rounded-full bg-muted/30 animate-pulse" />
            </div>
            <div className="h-3 w-48 rounded bg-muted/30 animate-pulse" />
            <div className="h-2.5 w-24 rounded bg-muted/20 animate-pulse" />
          </div>
          <div className="h-3 w-16 rounded bg-muted/30 animate-pulse shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function ActivityListView({ onOpenLead, onOpenQuote }: {
  /** Navigate to the lead detail (fallback for activities with no deal behind them). */
  onOpenLead?: (leadId: string) => void
  /** Navigate to a quote detail (links inside the deal sidebar). */
  onOpenQuote?: (quoteId: string) => void
} = {}) {
  const t = useTranslation()
  const provider = useCrmProvider()
  // Clicking a row opens the SAME right-hand deal sheet the pipeline uses —
  // the timeline stays underneath instead of navigating away.
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const activities = useCrmStore((s) => s.activities)
  const activitiesLoading = useCrmStore((s) => s.activitiesLoading)
  const fetchActivities = useCrmStore((s) => s.fetchActivities)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState<boolean | null>(null)
  // 'events' = all system timeline types (filtered client-side; the provider
  // query takes a single activityType).
  const eventsFilter = typeFilter === 'events'

  useEffect(() => {
    fetchActivities({
      activityType: eventsFilter ? undefined : (typeFilter as ActivityType | undefined),
      completed: eventsFilter ? undefined : (showCompleted ?? undefined),
    })
  }, [typeFilter, showCompleted])

  const filtered = eventsFilter ? activities.filter((a) => SYSTEM_TYPES.has(a.activityType)) : activities

  // Stats
  const pendingCount = activities.filter((a) => !a.completedAt).length
  const overdueCount = activities.filter((a) => !a.completedAt && a.dueDate && a.dueDate < new Date().toISOString().slice(0, 10)).length

  return (
    <div className="space-y-4">
      <SubpageHeader
        title={t('crm.activities.title')}
        subtitle={`${activities.length} ${t('crm.activities.title').toLowerCase()}${pendingCount > 0 ? ` · ${pendingCount} ${t('crm.activities.pending')}` : ''}${overdueCount > 0 ? ` · ${overdueCount} ${t('crm.activities.overdue')}` : ''}`}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        {/* Type filter */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setTypeFilter(null)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${typeFilter === null ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
          >
            {t('crm.activities.all')}
          </button>
          {MANUAL_TYPES.map((type) => {
            const cfg = TYPE_CONFIG[type]
            const Icon = cfg.icon
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${typeFilter === type ? cfg.color : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
              >
                <Icon className="h-3 w-3" />
                {cfg.label}
              </button>
            )
          })}
          <button
            onClick={() => setTypeFilter(eventsFilter ? null : 'events')}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${eventsFilter ? 'bg-primary/15 text-primary' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
          >
            <Sparkles className="h-3 w-3" />
            {t('crm.activities.systemEvents')}
          </button>
        </div>

        <div className="flex-1" />

        {/* Completion filter */}
        <div className="flex gap-1.5">
          <button
            onClick={() => setShowCompleted(showCompleted === false ? null : false)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${showCompleted === false ? 'bg-warning-soft text-warning-soft-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
          >
            <Clock className="h-3 w-3" /> {t('crm.activities.pendingFilter')}
          </button>
          <button
            onClick={() => setShowCompleted(showCompleted === true ? null : true)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${showCompleted === true ? 'bg-success-soft text-success-soft-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
          >
            <Check className="h-3 w-3" /> {t('crm.activities.completedFilter')}
          </button>
        </div>
      </div>

      {/* List */}
      {activitiesLoading ? (
        <ActivitySkeleton />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border-2 border-dashed border-muted">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/30 mb-3">
            <Calendar className="h-5 w-5 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">{typeFilter ? t('crm.activities.noActivitiesOfType', { type: TYPE_CONFIG[typeFilter]?.label ?? typeFilter }) : t('crm.activities.noActivities')}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{t('crm.activities.activitiesLogged')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const cfg = TYPE_CONFIG[a.activityType] ?? { icon: FileText, color: 'bg-muted text-muted-foreground', label: a.activityType }
            const Icon = cfg.icon
            const isSystem = SYSTEM_TYPES.has(a.activityType)
            const isOverdue = !a.completedAt && a.dueDate && a.dueDate < new Date().toISOString().slice(0, 10)
            const openRecord = a.dealId
              ? () => setSelectedDealId(a.dealId!)
              : a.leadId
                ? () => {
                    // Lead-only activity: its deal (auto-created with the lead)
                    // opens in the sheet; a dealless lead falls back to detail.
                    void provider.getDealByLeadId(a.leadId!).then((deal) => {
                      if (deal) setSelectedDealId(deal.id)
                      else onOpenLead?.(a.leadId!)
                    })
                  }
                : undefined

            return (
              <div
                key={a.id}
                onClick={openRecord}
                role={openRecord ? 'button' : undefined}
                className={`group flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors ${isOverdue ? 'border-destructive/30 dark:border-destructive/20' : ''} ${openRecord ? 'cursor-pointer hover:bg-muted/30' : ''}`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${cfg.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{a.title}</p>
                    {/* System events are facts, not tasks — no "done" badge noise. */}
                    {a.completedAt && !isSystem && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-medium text-success dark:bg-success/20">
                        <Check className="h-2.5 w-2.5" /> {t('crm.activities.done')}
                      </span>
                    )}
                    {isOverdue && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[9px] font-medium text-destructive dark:bg-destructive/20">
                        {t('crm.activities.overdueLabel')}
                      </span>
                    )}
                  </div>
                  {a.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground/60">
                    <span className="capitalize">{cfg.label}</span>
                    {a.dueDate && (
                      <>
                        <span>&middot;</span>
                        <span className={isOverdue ? 'text-destructive font-medium' : ''}>Due {a.dueDate}</span>
                      </>
                    )}
                    {a.assignedToName && (
                      <>
                        <span>&middot;</span>
                        <span>{a.assignedToName}</span>
                      </>
                    )}
                    {a.contactName && (
                      <>
                        <span>&middot;</span>
                        <span>{a.contactName}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0 pt-1">
                  {new Date(a.createdAt).toLocaleDateString()}
                  {openRecord && (
                    <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <DealSidebar
        dealId={selectedDealId ?? ''}
        open={!!selectedDealId}
        onClose={() => setSelectedDealId(null)}
        onViewLead={onOpenLead}
        onViewQuote={onOpenQuote}
      />
    </div>
  )
}
