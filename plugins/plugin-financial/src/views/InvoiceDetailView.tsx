import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, DollarSign, FileText, Calendar, Hash, User, X, MoreVertical, Ban, ChevronDown, CreditCard, Banknote, Building2, CircleDashed, CircleEllipsis, CircleCheckBig, CircleAlert, CalendarDays, ExternalLink } from 'lucide-react'
import { PersonLink } from '@fayz/saas'
import { useFinancialConfig, useFinancialStore, useFinancialProvider, formatCurrency, type ResolvedFinancialConfig } from '../FinancialContext'
import { SubpageHeader } from '@fayz/ui'
import { PaymentModal } from '../components/PaymentModal'
import { useTranslation } from '@fayz/core'
import { Button } from '@fayz/ui'
import type { Invoice, InvoiceItem, FinancialMovement, TransactionDirection } from '../types'

const STATUS_COLORS: Record<string, { bg: string; icon: React.ElementType; labelKey: string }> = {
  open: { bg: 'bg-info-soft text-info-soft-foreground', icon: CircleDashed, labelKey: 'financial.invoice.statusOpen' },
  pending: { bg: 'bg-warning-soft text-warning-soft-foreground', icon: CircleDashed, labelKey: 'financial.invoice.statusPending' },
  partial: { bg: 'bg-warning-soft text-warning-soft-foreground', icon: CircleEllipsis, labelKey: 'financial.invoice.statusPartial' },
  paid: { bg: 'bg-success-soft text-success-soft-foreground', icon: CircleCheckBig, labelKey: 'financial.invoice.statusPaid' },
  overdue: { bg: 'bg-destructive-soft text-destructive-soft-foreground', icon: CircleAlert, labelKey: 'financial.invoice.statusOverdue' },
  draft: { bg: 'bg-muted text-muted-foreground', icon: CircleDashed, labelKey: 'financial.invoice.statusDraft' },
  cancelled: { bg: 'bg-muted text-muted-foreground', icon: Ban, labelKey: 'financial.invoice.statusCancelled' },
}

export function InvoiceDetailView({ invoiceId, direction, onBack, onEdit }: {
  invoiceId: string
  direction: TransactionDirection
  onBack: () => void
  onEdit: () => void
}) {
  const t = useTranslation()
  const config = useFinancialConfig()
  const { currency } = config
  const provider = useFinancialProvider()
  const paymentMethods = useFinancialStore((s) => s.paymentMethods)
  const paymentMethodTypes = useFinancialStore((s) => s.paymentMethodTypes)
  const bankAccounts = useFinancialStore((s) => s.bankAccounts)
  const fetchPaymentMethods = useFinancialStore((s) => s.fetchPaymentMethods)
  const fetchBankAccounts = useFinancialStore((s) => s.fetchBankAccounts)
  const [detailsLoaded, setDetailsLoaded] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [movements, setMovements] = useState<FinancialMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [payingMovement, setPayingMovement] = useState<FinancialMovement | null>(null)
  const [expandedMovId, setExpandedMovId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const cancelInvoice = useFinancialStore((s) => s.cancelInvoice)

  async function loadData() {
    setLoading(true)
    const [inv, invItems, movResult] = await Promise.all([
      provider.getInvoiceById(invoiceId),
      provider.getInvoiceItems(invoiceId),
      provider.getMovements({ direction }),
    ])
    setInvoice(inv)
    setItems(invItems)
    setMovements(
      movResult.data
        .filter((m) => m.invoiceId === invoiceId && m.movementKind === 'bill')
        .sort((a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0))
    )
    setLoading(false)
  }

  useEffect(() => { loadData() }, [invoiceId])

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  async function loadPaymentDetails() {
    if (detailsLoaded || detailsLoading) return
    setDetailsLoading(true)
    await Promise.all([fetchPaymentMethods(), fetchBankAccounts()])
    setDetailsLoaded(true)
    setDetailsLoading(false)
  }

  function handleExpandMov(movId: string) {
    const opening = expandedMovId !== movId
    setExpandedMovId(opening ? movId : null)
    if (opening) loadPaymentDetails()
  }

  async function handleCancel() {
    setCancelling(true)
    try {
      await cancelInvoice(invoiceId)
      await loadData()
      setConfirmCancel(false)
      setMenuOpen(false)
    } catch {
      // toast handled by store
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <SubpageHeader title="" onBack={onBack} parentLabel={direction === 'debit' ? t('financial.nav.payables') : t('financial.nav.receivables')} />

        {/* Invoice card skeleton */}
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

          {/* Items table skeleton */}
          <div className="px-5 pt-3 pb-1.5">
            <div className="h-3 w-12 rounded bg-muted/30 animate-pulse" />
          </div>
          <div className="px-5">
            <div className="border-b py-2 flex justify-between">
              <div className="h-2 w-24 rounded bg-muted/20 animate-pulse" />
              <div className="h-2 w-16 rounded bg-muted/20 animate-pulse" />
            </div>
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-4 rounded bg-muted/30 animate-pulse" />
                  <div className="h-5 w-14 rounded bg-muted/30 animate-pulse" />
                  <div className="h-3 w-28 rounded bg-muted/40 animate-pulse" />
                </div>
                <div className="h-3 w-20 rounded bg-muted/40 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t bg-muted/10 flex justify-end">
            <div className="h-4 w-32 rounded bg-muted/40 animate-pulse" />
          </div>
        </div>

        {/* Installments skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-28 rounded bg-muted/30 animate-pulse" />
          <div className="rounded-lg border bg-card shadow-sm divide-y">
            {[1].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="h-3 w-5 rounded bg-muted/30 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-24 rounded bg-muted/40 animate-pulse" />
                  <div className="h-2 w-32 rounded bg-muted/30 animate-pulse" />
                </div>
                <div className="h-7 w-16 rounded-lg bg-muted/30 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <SubpageHeader title={t('financial.invoice.notFound')} onBack={onBack} parentLabel={direction === 'debit' ? t('financial.nav.payables') : t('financial.nav.receivables')} />
        <p className="text-sm text-muted-foreground">{t('financial.invoice.notFoundDesc')}</p>
      </div>
    )
  }

  const statusConfig = STATUS_COLORS[invoice.status] ?? STATUS_COLORS.pending
  const StatusIcon = statusConfig.icon
  const totalPaid = movements.reduce((sum, m) => sum + m.paidAmount, 0)
  const totalRemaining = invoice.totalAmount - totalPaid
  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0)
  const totalDiscount = items.reduce((sum, it) => sum + it.discount, 0)
  const totalSurcharge = items.reduce((sum, it) => sum + it.surcharge, 0)

  return (
    <div className="space-y-5">
      <SubpageHeader
        title={invoice.fiscalNumber ? `#${invoice.fiscalNumber}` : invoice.contactName ?? invoice.invoiceDate}
        onBack={onBack}
        parentLabel={direction === 'debit' ? t('financial.nav.payables') : t('financial.nav.receivables')}
        actions={
          <div className="flex items-center gap-1.5">
            {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" /> {t('financial.invoice.edit')}
              </Button>
            )}
            {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
              <div className="relative" ref={menuRef}>
                <Button variant="outline" size="icon" onClick={() => setMenuOpen(!menuOpen)} aria-label="More actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border bg-popover shadow-md z-20 py-1" style={{ animation: 'field-slide-in 150ms ease-out' }}>
                    <button
                      onClick={() => { setConfirmCancel(true); setMenuOpen(false) }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Ban className="h-3.5 w-3.5" /> {t('financial.invoice.cancelInvoice')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        }
      />

      {/* Invoice document */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {/* Top accent stripe */}
        <div className="h-1 bg-primary" />

        {/* Invoice header */}
        <div className="p-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {direction === 'debit' ? t('financial.invoice.accountsPayable') : t('financial.invoice.accountsReceivable')}
                </p>
                <p className={`text-xl font-bold mt-0.5 ${invoice.status === 'cancelled' ? 'line-through text-muted-foreground' : ''}`}>{formatCurrency(invoice.totalAmount, currency)}</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusConfig.bg}`}>
              <StatusIcon className="h-3 w-3" /> {t(statusConfig.labelKey)}
            </span>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">{t('financial.invoice.contact')}</p>
                {invoice.contactName ? (
                  <PersonLink personId={invoice.contactId} name={invoice.contactName} size="sm" />
                ) : (
                  <p className="text-xs font-medium truncate">—</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">{t('financial.invoice.date')}</p>
                <p className="text-xs font-medium">{invoice.invoiceDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">{t('financial.invoice.installments')}</p>
                <p className="text-xs font-medium">{invoice.totalInstallments}x</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">{t('financial.invoice.columnPaid')}</p>
                <p className="text-xs font-medium">{formatCurrency(totalPaid, currency)}</p>
              </div>
            </div>
          </div>

          {/* Booking link — shows when this order has a scheduled time */}
          {invoice.bookingStartsAt && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              <CalendarDays className="h-3.5 w-3.5 text-magic shrink-0" />
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-[10px] text-muted-foreground">{t('financial.invoice.booking')}</p>
                <button
                  type="button"
                  onClick={() => config.onBookingClick?.(invoice.id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-magic hover:underline"
                >
                  {new Date(invoice.bookingStartsAt).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })}
                  {' '}
                  {new Date(invoice.bookingStartsAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  <ExternalLink className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Items table */}
        {items.length > 0 && (
          <>
            <div className="px-5 pt-3 pb-1.5">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t('financial.invoice.items')}</h3>
            </div>
            <div className="px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-[10px] text-muted-foreground uppercase tracking-wider">
                    <th className="text-left py-2 font-medium">{t('financial.invoice.columnNumber')}</th>
                    <th className="text-left py-2 font-medium">{t('financial.invoice.columnDescription')}</th>
                    <th className="text-right py-2 font-medium">{t('financial.invoice.columnQty')}</th>
                    <th className="text-right py-2 font-medium">{t('financial.invoice.columnUnitPrice')}</th>
                    <th className="text-right py-2 font-medium">{t('financial.invoice.columnTotal')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, i) => (
                    <tr key={item.id}>
                      <td className="py-2.5 text-xs text-muted-foreground w-8">{i + 1}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium bg-muted text-muted-foreground capitalize">{item.itemKind}</span>
                          <span className="truncate">{item.description}</span>
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
                {(totalDiscount > 0 || totalSurcharge > 0) && (
                  <div className="flex items-center gap-6 text-xs">
                    <span className="text-muted-foreground">{t('financial.invoice.subtotal')}</span>
                    <span className="tabular-nums w-24 text-right">{formatCurrency(subtotal, currency)}</span>
                  </div>
                )}
                {totalDiscount > 0 && (
                  <div className="flex items-center gap-6 text-xs text-success">
                    <span>{t('financial.invoice.discount')}</span>
                    <span className="tabular-nums w-24 text-right">-{formatCurrency(totalDiscount, currency)}</span>
                  </div>
                )}
                {totalSurcharge > 0 && (
                  <div className="flex items-center gap-6 text-xs text-warning">
                    <span>{t('financial.invoice.surcharge')}</span>
                    <span className="tabular-nums w-24 text-right">+{formatCurrency(totalSurcharge, currency)}</span>
                  </div>
                )}
                <div className="flex items-center gap-6 text-sm font-bold pt-1">
                  <span>{t('financial.invoice.total')}</span>
                  <span className={`tabular-nums w-24 text-right ${invoice.status === 'cancelled' ? 'line-through text-muted-foreground' : ''}`}>{formatCurrency(invoice.totalAmount, currency)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Observations inside invoice */}
        {invoice.observations && (
          <div className="px-5 py-3 border-t">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{t('financial.invoice.notes')}</p>
            <p className="text-xs text-muted-foreground">{invoice.observations}</p>
          </div>
        )}
      </div>

      {/* Installments — outside the invoice card */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">{t('financial.invoice.paymentSchedule')}</h3>
        <div className="rounded-lg border bg-card shadow-sm">
          {movements.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t('financial.invoice.noInstallments')}</div>
          ) : (
            <div className="divide-y">
              {movements.map((mov) => {
                const remaining = mov.amount - mov.paidAmount
                const isPaid = mov.status === 'paid'
                const isPartial = mov.status === 'partial'
                const hasPaidDetails = isPaid || isPartial
                const isExpanded = expandedMovId === mov.id
                const movStatus = STATUS_COLORS[mov.status] ?? STATUS_COLORS.pending
                const MovIcon = movStatus.icon

                // Resolve names for payment details
                const method = paymentMethods.find((m) => m.id === mov.paymentMethodId)
                const methodType = paymentMethodTypes.find((t) => t.id === (method?.paymentMethodTypeId ?? mov.paymentMethodTypeId))
                const account = bankAccounts.find((a) => a.id === mov.bankAccountId)

                return (
                  <div key={mov.id}>
                    <div
                      className={`flex items-center gap-3 px-4 py-3 ${hasPaidDetails ? 'cursor-pointer hover:bg-muted/20 transition-colors' : ''}`}
                      onClick={hasPaidDetails ? () => handleExpandMov(mov.id) : undefined}
                    >
                      <span className="text-xs font-medium text-muted-foreground w-6 shrink-0">#{mov.installmentNumber}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium tabular-nums">{formatCurrency(mov.amount, currency)}</span>
                          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium capitalize ${movStatus.bg}`}>
                            <MovIcon className="h-2 w-2" /> {t(movStatus.labelKey)}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {t('financial.invoice.due')} {mov.dueDate}
                          {mov.paidAmount > 0 && !isPaid && ` · ${t('financial.invoice.paidLabel')} ${formatCurrency(mov.paidAmount, currency)}`}
                          {mov.paymentDate && ` · ${t('financial.invoice.paidOn')} ${mov.paymentDate}`}
                        </p>
                      </div>
                      {!isPaid && !isPartial && invoice.status !== 'cancelled' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setPayingMovement(mov) }}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary border border-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-colors shrink-0"
                        >
                          <DollarSign className="h-3 w-3" />
                          {t('financial.invoice.pay')} {remaining < mov.amount ? formatCurrency(remaining, currency) : ''}
                        </button>
                      )}
                      {isPartial && invoice.status !== 'cancelled' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setPayingMovement(mov) }}
                          className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors shrink-0"
                        >
                          <DollarSign className="h-3 w-3" />
                          {t('financial.invoice.pay')} {formatCurrency(remaining, currency)}
                        </button>
                      )}
                      {hasPaidDetails && (
                        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      )}
                    </div>

                    {/* Expanded payment details */}
                    <div
                      className="grid transition-all duration-200 ease-out"
                      style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
                    >
                      <div className="overflow-hidden">
                        <div className="px-4 pb-2.5 pl-14">
                          {detailsLoading ? (
                            <div className="flex items-center gap-3">
                              <div className="h-3 w-20 rounded bg-muted/40 animate-pulse" />
                              <div className="h-3 w-16 rounded bg-muted/30 animate-pulse" />
                              <div className="h-3 w-24 rounded bg-muted/40 animate-pulse" />
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] text-muted-foreground">
                              {methodType && (
                                <>
                                  <span className="font-medium text-foreground">{methodType.name}</span>
                                  {method && <span>({method.name})</span>}
                                </>
                              )}
                              {mov.cardBrand && (
                                <>
                                  {methodType && <span>&middot;</span>}
                                  <CreditCard className="h-3 w-3 shrink-0" />
                                  <span className="font-medium text-foreground">{mov.cardBrand}</span>
                                  {mov.cardInstallments && <span>{mov.cardInstallments}x</span>}
                                </>
                              )}
                              {account && (
                                <>
                                  {(methodType || mov.cardBrand) && <span>&middot;</span>}
                                  <Building2 className="h-3 w-3 shrink-0" />
                                  <span>{account.name}</span>
                                </>
                              )}
                              {mov.paidAmount > 0 && (
                                <>
                                  <span>&middot;</span>
                                  <span className="font-medium text-success">{formatCurrency(mov.paidAmount, currency)}</span>
                                </>
                              )}
                              {mov.paymentDate && (
                                <>
                                  <span>&middot;</span>
                                  <span>{mov.paymentDate}</span>
                                </>
                              )}
                              {mov.notes && (
                                <>
                                  <span>&middot;</span>
                                  <span className="italic truncate max-w-[200px]">{mov.notes}</span>
                                </>
                              )}
                              {!methodType && !mov.cardBrand && !account && !mov.notes && (
                                <span>{t('financial.invoice.noDetails')}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Payment summary bar */}
        {movements.length > 0 && (
          <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-2.5">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-muted-foreground">{t('financial.invoice.paidLabel')} <span className="font-semibold text-success">{formatCurrency(totalPaid, currency)}</span></span>
              {totalRemaining > 0 && (
                <span className="text-muted-foreground">{t('financial.invoice.remaining')} <span className="font-semibold text-foreground">{formatCurrency(totalRemaining, currency)}</span></span>
              )}
            </div>
            {totalRemaining <= 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                <CircleCheckBig className="h-3 w-3" /> {t('financial.invoice.fullyPaid')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {payingMovement && (
        <PaymentModal
          movement={payingMovement}
          onClose={() => setPayingMovement(null)}
          onPaid={() => { setPayingMovement(null); loadData() }}
        />
      )}

      {/* Cancel confirmation */}
      {confirmCancel && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfirmCancel(false)}>
          <div className="w-full max-w-sm rounded-modal border bg-card shadow-lg mx-4 p-5" onClick={(e) => e.stopPropagation()} style={{ animation: 'field-slide-in 200ms ease-out' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 shrink-0">
                <Ban className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t('financial.invoice.cancelInvoice')}</h3>
                <p className="text-xs text-muted-foreground">{t('financial.invoice.cancelConfirm')}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {t('financial.invoice.cancelDesc')}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmCancel(false)}>
                {t('financial.invoice.keepInvoice')}
              </Button>
              <Button variant="destructive" size="sm" onClick={handleCancel} disabled={cancelling}>
                <Ban className="h-3.5 w-3.5" />
                {cancelling ? t('financial.invoice.cancelling') : t('financial.invoice.yesCancel')}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes field-slide-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
