import React, { useEffect, useState } from 'react'
import { Phone, Mail, Users, FileText, CheckSquare, MessageCircle, Check, Calendar, DollarSign, User, Target, Clock, ArrowRight, UserPlus, ArrowRightLeft, MoveRight, Trophy, XCircle, FilePlus2, Send, FileCheck2, FileX2 } from 'lucide-react'
import { useTranslation } from '@fayz-ai/core'
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter, SheetTitle, SheetDescription, SegmentedControl } from '@fayz-ai/ui'
import { PersonLink } from '@fayz-ai/saas'
import { useCrmProvider, useCrmConfig, formatCurrency } from '../CrmContext'
import { QuoteStatusDropdown } from '../components/QuoteStatusDropdown'
import { answerEntries, humanizeKey, renderFieldValue } from '../lib/form-answers'
import type { Deal, Lead, Quote, Activity } from '../types'

// ---------------------------------------------------------------------------
// Activity icons
// ---------------------------------------------------------------------------

const TYPE_ICONS: Record<string, React.ElementType> = {
  call: Phone, email: Mail, meeting: Users, note: FileText, task: CheckSquare, whatsapp: MessageCircle,
  // System timeline events (auto-logged by the provider)
  lead_created: UserPlus, lead_converted: ArrowRightLeft, deal_created: Target,
  stage_changed: MoveRight, deal_won: Trophy, deal_lost: XCircle,
  quote_created: FilePlus2, quote_sent: Send, quote_approved: FileCheck2, quote_rejected: FileX2,
}


// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type TabId = 'overview' | 'activity' | 'quotes'

function TabBar({ active, counts, onChange }: { active: TabId; counts: { activity: number; quotes: number }; onChange: (id: TabId) => void }) {
  const t = useTranslation()

  const label = (text: string, count: number | undefined, isActive: boolean) => (
    <span className="inline-flex items-center gap-1.5">
      {text}
      {count != null && count > 0 && (
        <span className={`inline-flex items-center justify-center min-w-[16px] h-4 rounded-full px-1 text-[10px] font-semibold ${
          isActive ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
        }`}>
          {count}
        </span>
      )}
    </span>
  )

  return (
    <div className="px-5 py-2 border-b shrink-0">
      <SegmentedControl<TabId>
        value={active}
        onChange={onChange}
        options={[
          { value: 'overview', label: label(t('crm.dealSidebar.overview'), undefined, active === 'overview') },
          { value: 'activity', label: label(t('crm.dealSidebar.activity'), counts.activity, active === 'activity') },
          { value: 'quotes', label: label(t('crm.dealSidebar.quotes'), counts.quotes, active === 'quotes') },
        ]}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

/** Whatever the public form captured, in the card. Same opaque-bag rendering
 *  the lead detail page uses — shared so the two cannot drift. */
function FormAnswers({ lead }: { lead: Lead | null }) {
  const t = useTranslation()
  const entries = answerEntries(lead?.metadata?.fields)
  if (entries.length === 0) return null

  const formId = lead?.metadata?.formId
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {formId ? `${t('crm.leadDetail.formAnswers')} · ${formId}` : t('crm.leadDetail.formAnswers')}
      </h4>
      <div className="rounded-xl border divide-y">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-start gap-3 px-4 py-2.5">
            <span className="text-[11px] text-muted-foreground shrink-0 min-w-24">{humanizeKey(key)}</span>
            <span className="text-xs text-right flex-1 break-words">
              {renderFieldValue(value) ?? <span className="text-muted-foreground/50">—</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function OverviewTab({ deal, lead, currency }: { deal: Deal; lead: Lead | null; currency: { code: string; locale: string; symbol: string } }) {
  const t = useTranslation()
  const initial = (lead?.name ?? deal.contactName ?? deal.title).charAt(0).toUpperCase()

  return (
    <div className="space-y-5">
      {/* Lead / contact hero */}
      <div className="flex items-center gap-3.5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary text-xl font-bold">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <PersonLink
            personId={lead?.id ?? deal.contactId}
            name={lead?.name ?? deal.contactName ?? deal.title}
            size="default"
            className="text-base"
          />
          {lead && (lead.email || lead.phone) && (
            <p className="text-xs text-muted-foreground truncate">{lead.email || lead.phone}</p>
          )}
          {lead?.company && (
            <p className="text-[11px] text-muted-foreground">{lead.company}</p>
          )}
        </div>
      </div>

      {/* Deal metrics */}
      <div className="rounded-xl border divide-y">
        <div className="flex items-center gap-3 px-4 py-3">
          <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground flex-1">{t('crm.dealSidebar.value')}</span>
          <span className="text-sm font-bold">{formatCurrency(deal.value, currency)}</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <Target className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground flex-1">{t('crm.dealSidebar.probability')}</span>
          <span className="text-sm font-semibold">{deal.probability}%</span>
        </div>
        {deal.stageName && (
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="h-4 w-4 flex items-center justify-center shrink-0">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: deal.stageColor }} />
            </div>
            <span className="text-xs text-muted-foreground flex-1">{t('crm.dealSidebar.stage')}</span>
            <span className="text-sm font-medium">{deal.stageName}</span>
          </div>
        )}
        {deal.expectedCloseDate && (
          <div className="flex items-center gap-3 px-4 py-3">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground flex-1">{t('crm.dealSidebar.expectedClose')}</span>
            <span className="text-xs font-medium">{deal.expectedCloseDate}</span>
          </div>
        )}
        {deal.assignedToName && (
          <div className="flex items-center gap-3 px-4 py-3">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground flex-1">{t('crm.dealSidebar.assignedTo')}</span>
            <span className="text-xs font-medium">{deal.assignedToName}</span>
          </div>
        )}
      </div>

      {/* Contact links */}
      {lead && (lead.email || lead.phone) && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t('crm.dealSidebar.contact')}</h4>
          <div className="rounded-xl border divide-y">
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-3 px-4 py-2.5 text-xs text-primary hover:bg-muted/30 transition-colors">
                <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{lead.email}</span>
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-3 px-4 py-2.5 text-xs text-primary hover:bg-muted/30 transition-colors">
                <Phone className="h-3.5 w-3.5 shrink-0" /> <span>{lead.phone}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Form answers */}
      <FormAnswers lead={lead} />

      {/* Tags */}
      {deal.tags && deal.tags.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t('crm.dealSidebar.tags')}</h4>
          <div className="flex gap-1.5 flex-wrap">
            {deal.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">{tag}</span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {deal.notes && deal.notes !== deal.title && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t('crm.dealSidebar.notes')}</h4>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{deal.notes}</p>
        </div>
      )}

      {/* Dates */}
      <div className="flex items-center gap-4 pt-3 border-t text-[10px] text-muted-foreground">
        <span>{t('crm.dealSidebar.created')} {deal.createdAt?.slice(0, 10)}</span>
        {deal.updatedAt && <span>{t('crm.dealSidebar.updated')} {deal.updatedAt?.slice(0, 10)}</span>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Activity tab
// ---------------------------------------------------------------------------

function ActivityTab({ activities, loading }: { activities: Activity[]; loading: boolean }) {
  const t = useTranslation()
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-muted/40 animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5 pt-0.5">
              <div className="h-3.5 w-2/3 rounded bg-muted/40 animate-pulse" />
              <div className="h-2.5 w-1/3 rounded bg-muted/30 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/30 mb-3">
          <Clock className="h-5 w-5 text-muted-foreground/40" />
        </div>
        <p className="text-sm text-muted-foreground">{t('crm.dealSidebar.noActivities')}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{t('crm.dealSidebar.activitiesAppear')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {activities.map((a, i) => {
        const Icon = TYPE_ICONS[a.activityType] ?? FileText
        return (
          <div key={a.id} className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/20 transition-colors">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium truncate">{a.title}</p>
                {a.completedAt && <Check className="h-3 w-3 text-success shrink-0" />}
              </div>
              {a.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>}
              <p className="text-[10px] text-muted-foreground/50 mt-1 capitalize">{a.activityType} · {new Date(a.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Quotes tab
// ---------------------------------------------------------------------------

function QuotesTab({ quotes, loading, currency, onViewQuote, onQuoteUpdated }: { quotes: Quote[]; loading: boolean; currency: { code: string; locale: string; symbol: string }; onViewQuote?: (id: string) => void; onQuoteUpdated?: (q: Quote) => void }) {
  const t = useTranslation()
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border p-4 space-y-2.5">
            <div className="h-3.5 w-20 rounded bg-muted/40 animate-pulse" />
            <div className="h-3 w-28 rounded bg-muted/30 animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (quotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/30 mb-3">
          <FileText className="h-5 w-5 text-muted-foreground/40" />
        </div>
        <p className="text-sm text-muted-foreground">{t('crm.dealSidebar.noQuotes')}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{t('crm.dealSidebar.quotesAppear')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {quotes.map((q) => (
        <button
          key={q.id}
          onClick={() => onViewQuote?.(q.id)}
          className="w-full text-left rounded-xl border p-4 hover:bg-muted/20 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm font-semibold">{q.quoteNumber}</span>
            <QuoteStatusDropdown quote={q} size="sm" onStatusChange={onQuoteUpdated} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-muted-foreground">{q.quoteDate}</span>
            <span className="text-sm font-bold">{formatCurrency(q.totalAmount, currency)}</span>
          </div>
          {q.contactName && (
            <p className="text-[10px] text-muted-foreground mt-1.5 truncate">{q.contactName}</p>
          )}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Deal sidebar
// ---------------------------------------------------------------------------

export function DealSidebar({ dealId, open, onClose, onViewLead, onViewQuote }: {
  dealId: string
  open: boolean
  onClose: () => void
  onViewLead?: (id: string) => void
  onViewQuote?: (id: string) => void
}) {
  const t = useTranslation()
  const provider = useCrmProvider()
  const { currency } = useCrmConfig()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [lead, setLead] = useState<Lead | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [quotesLoading, setQuotesLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setActivitiesLoading(true)
    setQuotesLoading(true)
    setActiveTab('overview')
    setLead(null)
    setActivities([])
    setQuotes([])

    provider.getDealById(dealId).then(async (d) => {
      setDeal(d)
      if (d?.leadId) {
        const l = await provider.getLeadById(d.leadId)
        setLead(l)
      }
      setLoading(false)
    })

    provider.getActivities({ dealId }).then((r) => {
      setActivities(r.data)
      setActivitiesLoading(false)
    })

    provider.getQuotesByDealId(dealId).then((q) => {
      setQuotes(q)
      setQuotesLoading(false)
    })
  }, [dealId, open])

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent width="max-w-md">
        {/* Header */}
        <SheetHeader>
          {loading ? (
            <div className="space-y-1.5 pr-8">
              <div className="h-4 w-40 rounded bg-muted/40 animate-pulse" />
              <div className="h-3 w-24 rounded bg-muted/30 animate-pulse" />
            </div>
          ) : (
            <div className="pr-8">
              <SheetTitle>{deal?.title ?? t('crm.dealSidebar.deal')}</SheetTitle>
              {deal?.contactName && <SheetDescription>{deal.contactName}</SheetDescription>}
            </div>
          )}
        </SheetHeader>

        {/* Tabs */}
        <TabBar
          active={activeTab}
          counts={{ activity: activities.length, quotes: quotes.length }}
          onChange={setActiveTab}
        />

        {/* Content */}
        <SheetBody>
          {loading ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3.5">
                <div className="h-14 w-14 rounded-2xl bg-muted/40 animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 rounded bg-muted/40 animate-pulse" />
                  <div className="h-3 w-24 rounded bg-muted/30 animate-pulse" />
                </div>
              </div>
              <div className="rounded-xl border divide-y">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div className="h-3 w-20 rounded bg-muted/30 animate-pulse" />
                    <div className="h-3 w-24 rounded bg-muted/40 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ) : deal ? (
            <>
              {activeTab === 'overview' && <OverviewTab deal={deal} lead={lead} currency={currency} />}
              {activeTab === 'activity' && <ActivityTab activities={activities} loading={activitiesLoading} />}
              {activeTab === 'quotes' && <QuotesTab quotes={quotes} loading={quotesLoading} currency={currency} onViewQuote={(id) => { onViewQuote?.(id); onClose() }} onQuoteUpdated={(updated) => setQuotes(quotes.map((q) => q.id === updated.id ? updated : q))} />}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">{t('crm.dealSidebar.dealNotFound')}</p>
            </div>
          )}
        </SheetBody>

        {/* Footer */}
        {deal && lead && onViewLead && (
          <SheetFooter>
            <button
              onClick={() => { onViewLead(lead.id); onClose() }}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors"
            >
              {t('crm.dealSidebar.viewLeadProfile')} <ArrowRight className="h-3 w-3" />
            </button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
