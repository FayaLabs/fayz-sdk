import React, { useEffect, useState } from 'react'
import { UserPlus, FileText } from 'lucide-react'
import { useCrmProvider, useCrmConfig, formatCurrency } from '../CrmContext'
import { useTranslation } from '@fayz-ai/core'
import { QuoteStatusDropdown } from '../components/QuoteStatusDropdown'
import { Breadcrumb } from '@fayz-ai/ui'
import type { Lead, Deal, Quote } from '../types'

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-info-soft text-info-soft-foreground',
  contacted: 'bg-magic-soft text-magic-soft-foreground',
  qualified: 'bg-success-soft text-success-soft-foreground',
  unqualified: 'bg-muted text-muted-foreground',
  converted: 'bg-warning-soft text-warning-soft-foreground',
  lost: 'bg-destructive-soft text-destructive-soft-foreground',
}


/** "hair_remaining" → "Hair remaining". Form answers arrive keyed by whatever
 *  the landing page called them, so they get humanized rather than shown raw. */
function humanizeKey(key: string): string {
  const spaced = key.replace(/[_-]+/g, ' ').replace(/([a-z\d])([A-Z])/g, '$1 $2')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function renderFieldValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === '') return null
  if (Array.isArray(value)) return value.length ? value.join(', ') : null
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-3">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm text-foreground">{value ?? <span className="text-muted-foreground/50">—</span>}</dd>
    </div>
  )
}

export function LeadDetailView({ leadId, onBack, onCreateQuote, onViewQuote }: {
  leadId: string
  onBack: () => void
  onCreateQuote?: (leadId: string) => void
  onViewQuote?: (quoteId: string) => void
}) {
  const provider = useCrmProvider()
  const { currency } = useCrmConfig()
  const t = useTranslation()
  const [lead, setLead] = useState<Lead | null>(null)
  const [deal, setDeal] = useState<Deal | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    provider.getLeadById(leadId).then(async (l) => {
      setLead(l)
      if (l) {
        const d = await provider.getDealByLeadId(leadId)
        setDeal(d)
        if (d) {
          const q = await provider.getQuotesByDealId(d.id)
          setQuotes(q)
        }
      }
      setLoading(false)
    })
  }, [leadId])

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumb parent={t('crm.leads.title')} current={t('crm.leadDetail.loading')} onBack={onBack} />
        <div className="flex items-start gap-5">
          <div className="h-20 w-20 shrink-0 rounded-2xl bg-muted/40 animate-pulse" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-6 w-40 rounded bg-muted/40 animate-pulse" />
            <div className="h-4 w-28 rounded bg-muted/30 animate-pulse" />
            <div className="h-5 w-16 rounded-full bg-muted/30 animate-pulse" />
          </div>
        </div>
        <div className="border-t" />
        <div className="space-y-4">
          <div className="h-4 w-36 rounded bg-muted/30 animate-pulse" />
          <div className="rounded-xl border bg-card shadow-sm p-5 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="grid grid-cols-3 gap-4">
                <div className="h-3 w-16 rounded bg-muted/30 animate-pulse" />
                <div className="col-span-2 h-3 w-24 rounded bg-muted/40 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="space-y-6">
        <Breadcrumb parent={t('crm.leads.title')} current={t('crm.leadDetail.notFound')} onBack={onBack} />
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border-2 border-dashed border-muted">
          <UserPlus className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">{t('crm.leadDetail.leadNotFound')}</p>
          <button onClick={onBack} className="text-xs text-primary hover:underline mt-1">{t('crm.leadDetail.backToList')}</button>
        </div>
      </div>
    )
  }

  const initial = lead.name.charAt(0).toUpperCase()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb parent={t('crm.leads.title')} current={lead.name} onBack={onBack} />

      {/* Hero */}
      <div className="flex items-start gap-5">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary text-2xl font-bold shadow-sm">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{lead.name}</h1>
          {(lead.email || lead.phone) && (
            <p className="text-muted-foreground mt-0.5">{lead.email || lead.phone}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize ${STATUS_COLORS[lead.status] ?? 'bg-muted text-muted-foreground'}`}>
              {lead.status}
            </span>
            {lead.sourceName && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {lead.sourceName}
              </span>
            )}
          </div>
        </div>
        {/* Actions */}
        {onCreateQuote && lead.status !== 'converted' && lead.status !== 'lost' && (
          <button
            onClick={() => onCreateQuote(leadId)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary border border-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-colors shrink-0"
          >
            <FileText className="h-3 w-3" /> {t('crm.leadDetail.createQuote')}
          </button>
        )}
      </div>

      {/* Separator */}
      <div className="border-t" />

      {/* Contact Information */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">{t('crm.leadDetail.contactInfo')}</h3>
        <div className="rounded-xl border bg-card shadow-sm">
          <dl className="grid divide-y md:grid-cols-2 md:divide-y-0">
            <div className="px-5 md:border-b">
              <FieldRow label={t('crm.leadDetail.email')} value={lead.email ? <a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a> : null} />
            </div>
            <div className="px-5 md:border-b">
              <FieldRow label={t('crm.leadDetail.phone')} value={lead.phone ? <a href={`tel:${lead.phone}`} className="text-primary hover:underline">{lead.phone}</a> : null} />
            </div>
            <div className="px-5 md:border-b md:last:border-b-0">
              <FieldRow label={t('crm.leadDetail.company')} value={lead.company} />
            </div>
            <div className="px-5 md:border-b md:last:border-b-0">
              <FieldRow label={t('crm.leadDetail.source')} value={lead.sourceName} />
            </div>
          </dl>
        </div>
      </div>

      {/* Form answers — whatever the landing page asked. Rendered generically
          so a new form never needs a change here. */}
      {(() => {
        const meta = (lead.metadata ?? {}) as {
          fields?: Record<string, unknown>
          utm?: Record<string, unknown>
        }
        const fields = Object.entries(meta.fields ?? {}).filter(([, v]) => renderFieldValue(v) !== null)
        const utm = Object.entries(meta.utm ?? {}).filter(([, v]) => renderFieldValue(v) !== null)
        if (!fields.length && !utm.length) return null
        return (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {t('crm.leadDetail.formAnswers')}
            </h3>
            <div className="rounded-xl border bg-card shadow-sm">
              <dl className="grid divide-y md:grid-cols-2 md:divide-y-0">
                {fields.map(([key, value]) => (
                  <div key={key} className="px-5 md:border-b md:last:border-b-0">
                    <FieldRow label={humanizeKey(key)} value={renderFieldValue(value)} />
                  </div>
                ))}
              </dl>
              {utm.length > 0 && (
                <div className="border-t px-5 py-3 flex flex-wrap gap-x-4 gap-y-1">
                  {utm.map(([key, value]) => (
                    <span key={key} className="text-xs text-muted-foreground">
                      {humanizeKey(key.replace(/^utm_/, ''))}:{' '}
                      <span className="text-foreground">{renderFieldValue(value)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Pipeline / Deal */}
      {deal && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">{t('crm.leadDetail.pipeline')}</h3>
          <div className="rounded-xl border bg-card shadow-sm">
            <dl className="grid divide-y md:grid-cols-2 md:divide-y-0">
              <div className="px-5 md:border-b">
                <FieldRow label={t('crm.leadDetail.stage')} value={deal.stageName ? (
                  <span className="inline-flex items-center gap-1.5">
                    {deal.stageColor && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: deal.stageColor }} />}
                    {deal.stageName}
                  </span>
                ) : null} />
              </div>
              <div className="px-5 md:border-b">
                <FieldRow label={t('crm.leadDetail.dealValue')} value={deal.value > 0 ? formatCurrency(deal.value, currency) : null} />
              </div>
              <div className="px-5 md:border-b md:last:border-b-0">
                <FieldRow label={t('crm.leadDetail.probability')} value={`${deal.probability}%`} />
              </div>
              <div className="px-5 md:border-b md:last:border-b-0">
                <FieldRow label={t('crm.leadDetail.dealStatus')} value={deal.status} />
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Quotes */}
      {quotes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">{t('crm.leadDetail.quotes')}</h3>
          <div className="rounded-xl border bg-card shadow-sm divide-y">
            {quotes.map((q) => (
              <div
                key={q.id}
                onClick={() => onViewQuote?.(q.id)}
                className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{q.quoteNumber}</p>
                    <p className="text-[10px] text-muted-foreground">{q.quoteDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <span className="text-sm font-semibold">{formatCurrency(q.totalAmount, currency)}</span>
                  <QuoteStatusDropdown quote={q} size="sm" onStatusChange={(updated) => setQuotes(quotes.map((existing) => existing.id === updated.id ? updated : existing))} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Details */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">{t('crm.leadDetail.details')}</h3>
        <div className="rounded-xl border bg-card shadow-sm">
          <dl className="grid divide-y md:grid-cols-2 md:divide-y-0">
            <div className="px-5 md:border-b">
              <FieldRow label={t('crm.leadDetail.value')} value={lead.value != null && lead.value > 0 ? lead.value : null} />
            </div>
            <div className="px-5 md:border-b">
              <FieldRow label={t('crm.leadDetail.assignedTo')} value={lead.assignedToName} />
            </div>
            <div className="px-5 md:border-b md:last:border-b-0">
              <FieldRow label={t('crm.leadDetail.created')} value={lead.createdAt?.slice(0, 10)} />
            </div>
            <div className="px-5 md:border-b md:last:border-b-0">
              <FieldRow label={t('crm.leadDetail.updated')} value={lead.updatedAt?.slice(0, 10)} />
            </div>
          </dl>
        </div>
      </div>

      {/* Tags */}
      {lead.tags && lead.tags.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">{t('crm.leadDetail.tags')}</h3>
          <div className="rounded-xl border bg-card shadow-sm px-5 py-4">
            <div className="flex gap-1.5 flex-wrap">
              {lead.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {lead.notes && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">{t('crm.leadDetail.notes')}</h3>
          <div className="rounded-xl border bg-card shadow-sm px-5 py-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
          </div>
        </div>
      )}
    </div>
  )
}
