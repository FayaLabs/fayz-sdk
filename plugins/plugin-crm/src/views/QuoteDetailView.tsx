import React, { useEffect, useState, useRef } from 'react'
import { FileText, Calendar, User, Hash, Ban, Pencil, CircleCheckBig, ArrowRight, Send, Printer, Mail, MessageCircle, ChevronDown, Check, X } from 'lucide-react'
import { useCrmConfig, useCrmStore, useCrmProvider, formatCurrency } from '../CrmContext'
import { useTranslation } from '@fayz-ai/core'
import { SubpageHeader } from '@fayz-ai/ui'
import { QuoteStatusDropdown } from '../components/QuoteStatusDropdown'
import { PersonLink } from '@fayz-ai/saas'
import { Button } from '@fayz-ai/ui'
import type { Quote } from '../types'
export function QuoteDetailView({ quoteId, onBack, onEdit, onInvoiceCreated }: {
  quoteId: string
  onBack: () => void
  onEdit?: () => void
  onInvoiceCreated?: (invoiceId: string) => void
}) {
  const t = useTranslation()
  const { currency } = useCrmConfig()
  const provider = useCrmProvider()
  const sendQuote = useCrmStore((s) => s.sendQuote)
  const approveQuote = useCrmStore((s) => s.approveQuote)
  const rejectQuote = useCrmStore((s) => s.rejectQuote)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [sendMenuOpen, setSendMenuOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [approving, setApproving] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const sendMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    provider.getQuoteById(quoteId).then((q) => {
      setQuote(q)
      setLoading(false)
    })
  }, [quoteId])

  useEffect(() => {
    if (!sendMenuOpen) return
    const h = (e: MouseEvent) => { if (sendMenuRef.current && !sendMenuRef.current.contains(e.target as Node)) setSendMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [sendMenuOpen])

  async function handleSend(channel: string) {
    setSending(true)
    setSendMenuOpen(false)
    try {
      const updated = await sendQuote(quoteId)
      setQuote(updated)
    } finally {
      setSending(false)
    }
  }

  async function handleApprove() {
    setApproving(true)
    try {
      const updated = await approveQuote(quoteId)
      setQuote(updated)
      // Quote IS the invoice now (in-place promotion) — navigate to its invoice detail
      if (onInvoiceCreated) {
        onInvoiceCreated(quoteId)
      }
    } finally {
      setApproving(false)
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return
    setRejecting(true)
    try {
      const updated = await rejectQuote(quoteId, rejectReason.trim())
      setQuote(updated)
      setRejectOpen(false)
      setRejectReason('')
    } finally {
      setRejecting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <SubpageHeader title="" onBack={onBack} parentLabel={t('crm.quotes.title')} />
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="h-1 bg-muted animate-pulse" />
          <div className="p-5 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted/40 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-3 w-20 rounded bg-muted/40 animate-pulse" />
                  <div className="h-6 w-32 rounded bg-muted/40 animate-pulse" />
                </div>
              </div>
              <div className="h-6 w-20 rounded-full bg-muted/40 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-3.5 w-3.5 rounded bg-muted/30 animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-2 w-10 rounded bg-muted/30 animate-pulse" />
                    <div className="h-3 w-16 rounded bg-muted/40 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="space-y-5">
        <SubpageHeader title={t('crm.quoteDetail.title')} onBack={onBack} parentLabel={t('crm.quotes.title')} />
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border-2 border-dashed border-muted">
          <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">{t('crm.quoteDetail.notFound')}</p>
          <button onClick={onBack} className="text-xs text-primary hover:underline mt-1">{t('crm.quoteDetail.backToList')}</button>
        </div>
      </div>
    )
  }

  const subtotal = quote.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0)
  const totalDiscount = quote.items.reduce((sum, it) => sum + it.discount, 0)

  return (
    <div className="space-y-5">
      <SubpageHeader
        title={`#${quote.quoteNumber}`}
        onBack={onBack}
        parentLabel={t('crm.quotes.title')}
        actions={
          <div className="flex items-center gap-1.5">
            {quote.status === 'draft' && (
              <div className="relative" ref={sendMenuRef}>
                <button
                  type="button"
                  onClick={() => setSendMenuOpen((p) => !p)}
                  disabled={sending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary border border-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-colors disabled:opacity-50"
                >
                  <Send className="h-3 w-3" />
                  {sending ? t('crm.quoteDetail.sending') : t('crm.quoteDetail.send')}
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
                {sendMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border bg-card shadow-lg z-20 py-1 animate-in fade-in zoom-in-95 duration-100">
                    <button type="button" onClick={() => handleSend('print')} className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 transition-colors">
                      <Printer className="h-3.5 w-3.5 text-muted-foreground" /> {t('crm.quoteDetail.sendPrint')}
                    </button>
                    <button type="button" onClick={() => handleSend('email')} className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 transition-colors">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {t('crm.quoteDetail.sendEmail')}
                    </button>
                    <button type="button" onClick={() => handleSend('whatsapp')} className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 transition-colors">
                      <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" /> {t('crm.quoteDetail.sendWhatsApp')}
                    </button>
                  </div>
                )}
              </div>
            )}
            {quote.status === 'sent' && (
              <>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleApprove}
                  disabled={approving}
                  className="bg-success text-success-foreground hover:bg-success/90 border-success"
                >
                  <Check className="h-3.5 w-3.5" />
                  {approving ? t('crm.quoteDetail.approving') : t('crm.quoteDetail.approve')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectOpen(true)}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <X className="h-3.5 w-3.5" />
                  {t('crm.quoteDetail.reject')}
                </Button>
              </>
            )}
            {onEdit && quote.status !== 'approved' && quote.status !== 'rejected' && quote.status !== 'expired' && (
              <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors">
                <Pencil className="h-3 w-3" /> {t('crm.quoteDetail.edit')}
              </button>
            )}
          </div>
        }
      />

      {/* Quote document card */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {/* Top accent stripe */}
        <div className="h-1 bg-primary" />

        {/* Header */}
        <div className="p-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('crm.quoteDetail.quoteNumber', { number: quote.quoteNumber })}
                </p>
                <p className="text-xl font-bold mt-0.5">{formatCurrency(quote.totalAmount, currency)}</p>
              </div>
            </div>
            <QuoteStatusDropdown quote={quote} onStatusChange={(q) => setQuote(q)} />
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">{t('crm.quoteDetail.client')}</p>
                {quote.contactName ? (
                  <PersonLink personId={quote.contactId ?? quote.leadId} name={quote.contactName} size="sm" />
                ) : (
                  <p className="text-xs font-medium truncate">—</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">{t('crm.quoteDetail.date')}</p>
                <p className="text-xs font-medium">{quote.quoteDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">{t('crm.quoteDetail.validUntil')}</p>
                <p className="text-xs font-medium">{quote.validUntil}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">{t('crm.quoteDetail.items')}</p>
                <p className="text-xs font-medium">{quote.items.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Items table */}
        {quote.items.length > 0 && (
          <>
            <div className="px-5 pt-3 pb-1.5">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t('crm.quoteDetail.items')}</h3>
            </div>
            <div className="px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-[10px] text-muted-foreground uppercase tracking-wider">
                    <th className="text-left py-2 font-medium">#</th>
                    <th className="text-left py-2 font-medium">{t('crm.quoteDetail.description')}</th>
                    <th className="text-right py-2 font-medium">{t('crm.quoteDetail.qty')}</th>
                    <th className="text-right py-2 font-medium">{t('crm.quoteDetail.unitPrice')}</th>
                    <th className="text-right py-2 font-medium">{t('crm.quoteDetail.total')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {quote.items.map((item, i) => (
                    <tr key={item.id}>
                      <td className="py-2.5 text-xs text-muted-foreground w-8">{i + 1}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium bg-muted text-muted-foreground capitalize">{item.itemKind}</span>
                          <span className="truncate">{item.description || '—'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right text-xs tabular-nums">{item.quantity}</td>
                      <td className="py-2.5 text-right text-xs tabular-nums">{formatCurrency(item.unitPrice, currency)}</td>
                      <td className="py-2.5 text-right font-medium tabular-nums">{formatCurrency(item.totalAmount, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="px-5 py-3 mt-1 border-t bg-muted/10">
              <div className="flex flex-col items-end gap-0.5">
                {totalDiscount > 0 && (
                  <>
                    <div className="flex items-center gap-6 text-xs">
                      <span className="text-muted-foreground">{t('crm.quoteDetail.subtotal')}</span>
                      <span className="tabular-nums w-24 text-right">{formatCurrency(subtotal, currency)}</span>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-success">
                      <span>{t('crm.quoteDetail.discount')}</span>
                      <span className="tabular-nums w-24 text-right">-{formatCurrency(totalDiscount, currency)}</span>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-6 text-sm font-bold pt-1">
                  <span>{t('crm.quoteDetail.total')}</span>
                  <span className="tabular-nums w-24 text-right">{formatCurrency(quote.totalAmount, currency)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Payment conditions inside card */}
        {quote.paymentConditions && (
          <div className="px-5 py-3 border-t">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{t('crm.quoteDetail.paymentConditions')}</p>
            <p className="text-xs text-muted-foreground">{quote.paymentConditions}</p>
          </div>
        )}

        {/* Notes inside card */}
        {quote.observations && (
          <div className="px-5 py-3 border-t">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{t('crm.quoteDetail.notes')}</p>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{quote.observations}</p>
          </div>
        )}
      </div>

      {/* Invoice link — when approved (quote IS the invoice, same row) */}
      {quote.status === 'approved' && (
        <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/5 px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs">
            <CircleCheckBig className="h-3.5 w-3.5 text-success" />
            <span className="text-muted-foreground">{t('crm.quoteDetail.invoiceCreated')}</span>
          </div>
          <a
            href={`#/financial/receivables/detail/${quote.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {t('crm.quoteDetail.viewInvoice')} <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Rejection reason — outside the card */}
      {quote.status === 'rejected' && quote.rejectionReason && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs">
            <Ban className="h-3.5 w-3.5 text-destructive" />
            <span className="text-muted-foreground">{t('crm.quoteDetail.rejectionReason')}: <span className="font-medium text-foreground">{quote.rejectionReason}</span></span>
          </div>
        </div>
      )}

      {/* Reject reason dialog */}
      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setRejectOpen(false)}>
          <div className="w-full max-w-sm rounded-modal border bg-card shadow-lg mx-4 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 shrink-0">
                <X className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t('crm.quoteDetail.reject')}</h3>
                <p className="text-xs text-muted-foreground">{t('crm.quoteDetail.rejectDescription')}</p>
              </div>
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('crm.quoteDetail.rejectReasonPlaceholder')}
              className="w-full rounded-input border border-input bg-card px-3 py-2 text-sm shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setRejectOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleReject}
                disabled={rejecting || !rejectReason.trim()}
              >
                {rejecting ? t('crm.quoteDetail.rejecting') : t('crm.quoteDetail.confirmReject')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
