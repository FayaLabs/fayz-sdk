import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, Banknote, QrCode, CreditCard, ArrowRightLeft, FileCheck, ExternalLink } from 'lucide-react'
import { useAgendaConfig } from '../AgendaContext'
import { useTranslation } from '@fayz-ai/core'
import type { BookingPaymentDetail } from '../financial-bridge'

// ---------------------------------------------------------------------------
// Payment method type visuals (mirrors financial PaymentModal)
// ---------------------------------------------------------------------------

const TYPE_ICONS: Record<string, React.ElementType> = {
  cash: Banknote, pix: QrCode, credit_card: CreditCard, debit_card: CreditCard,
  bank_transfer: ArrowRightLeft, check: FileCheck,
}

const TYPE_COLORS: Record<string, string> = {
  cash: 'border-success/30 bg-success/5 hover:bg-success/10 data-[active=true]:border-success data-[active=true]:bg-success/15',
  pix: 'border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10 data-[active=true]:border-teal-500 data-[active=true]:bg-teal-500/15',
  credit_card: 'border-info/30 bg-info/5 hover:bg-info/10 data-[active=true]:border-info data-[active=true]:bg-info/15',
  debit_card: 'border-magic/30 bg-magic/5 hover:bg-magic/10 data-[active=true]:border-magic data-[active=true]:bg-magic/15',
  bank_transfer: 'border-warning/30 bg-warning/5 hover:bg-warning/10 data-[active=true]:border-warning data-[active=true]:bg-warning/15',
  check: 'border-input/30 bg-muted/5 hover:bg-muted/10 data-[active=true]:border-input data-[active=true]:bg-muted/15',
}

const ICON_COLORS: Record<string, string> = {
  cash: 'text-success', pix: 'text-teal-500', credit_card: 'text-info',
  debit_card: 'text-magic', bank_transfer: 'text-warning', check: 'text-muted-foreground',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  orderId: string
  orderTotal: number
  services?: Array<{ name: string; price: number; durationMinutes: number }>
  onClose: () => void
  onPaymentChange?: () => void
  formatCurrency: (amount: number) => string
  /** Render inline (no portal overlay) — for embedding in tabs */
  inline?: boolean
}

export function BookingPaymentPanel({ orderId, orderTotal, services, onClose, onPaymentChange, formatCurrency, inline }: Props) {
  const t = useTranslation()
  const config = useAgendaConfig()
  const bridge = config.financialBridge!

  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<BookingPaymentDetail | null>(null)

  // Payment form
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [paymentTypes, setPaymentTypes] = useState<Array<{ id: string; name: string; transactionType?: string }>>([])
  const [bankAccounts, setBankAccounts] = useState<Array<{ id: string; name: string; accountType: string }>>([])
  const [filteredMethods, setFilteredMethods] = useState<Array<{ id: string; name: string }>>([])
  const [selectedBankId, setSelectedBankId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [cardBrand, setCardBrand] = useState('')
  const [cardInstallments, setCardInstallments] = useState(1)
  const [processing, setProcessing] = useState(false)
  const [justPaid, setJustPaid] = useState(false)

  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  // Single combined fetch for all initial data
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      bridge.getPaymentDetail(orderId).catch(() => null),
      bridge.getPaymentMethodTypes().catch(() => [] as typeof paymentTypes),
      bridge.getBankAccounts().catch(() => [] as typeof bankAccounts),
    ]).then(([d, types, accounts]) => {
      if (cancelled) return
      setDetail(d)
      setPaymentTypes(types)
      setBankAccounts(accounts)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [orderId])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  const selectedType = paymentTypes.find((t) => t.id === selectedTypeId)
  const txType = selectedType?.transactionType ?? ''
  const needsBank = ['bank_transfer', 'pix', 'check'].includes(txType)
  const needsCard = txType === 'credit_card' || txType === 'debit_card'
  const needsCardInstallments = txType === 'credit_card'

  function handleSelectType(typeId: string) {
    setSelectedTypeId(typeId)
    setSelectedBankId('')
    setPaymentMethodId('')
    setCardBrand('')
    setCardInstallments(1)
    // Fetch specific payment methods for this type
    if (bridge.getPaymentMethods) {
      bridge.getPaymentMethods(typeId).then(setFilteredMethods).catch(() => setFilteredMethods([]))
    }
  }

  async function handleCheckout() {
    if (!selectedTypeId) return
    setProcessing(true)
    try {
      const result = await bridge.checkout(orderId, {
        paymentMethodTypeId: selectedTypeId,
        paymentMethodId: paymentMethodId || undefined,
        bankAccountId: needsBank ? selectedBankId || undefined : undefined,
        cardBrand: needsCard ? cardBrand || undefined : undefined,
        cardInstallments: needsCardInstallments ? cardInstallments : undefined,
      })
      setDetail(result)
      setJustPaid(true)
      onPaymentChange?.()
      // Show confirmation animation, then transition to summary
      setTimeout(() => setJustPaid(false), 2200)
    } catch { /* toast */ }
    setProcessing(false)
  }

  const isPaid = detail?.status === 'paid'

  const content = (
    <div className="px-5 py-4 space-y-4">

      {/* Loading */}
      {loading && (
        <div className="space-y-3 py-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Just paid — confirmation animation */}
      {!loading && isPaid && justPaid && (
        <div className="text-center py-8 space-y-2 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-success/10 animate-bounce" style={{ animationDuration: '600ms', animationIterationCount: '2' }}>
            <Check className="h-7 w-7 text-success" />
          </div>
          <p className="text-sm font-semibold text-success">{t('agenda.payment.checkoutComplete')}</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(detail!.totalAmount)}</p>
        </div>
      )}

      {/* Invoice summary — shown after animation or when returning to an already-paid/pending booking */}
      {!loading && detail && detail.status !== 'none' && !justPaid && (
        <div className="space-y-3 animate-in fade-in duration-300">
          {/* Movement rows with inline status badge */}
          {detail.movements.length > 0 ? (
            <div className="space-y-1.5">
              {detail.movements.map((mov) => {
                const methodName = mov.paymentMethodTypeName
                const txKey = (methodName ?? '').toLowerCase().replace(/\s+/g, '_')
                const Icon = TYPE_ICONS[txKey] ?? Banknote
                const iconColor = ICON_COLORS[txKey] ?? 'text-muted-foreground'
                const isMovPaid = mov.status === 'paid'
                const isPartial = mov.status === 'partial'
                const isOverdue = mov.status === 'overdue'

                return (
                  <div key={mov.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                    <Icon className={`h-4 w-4 shrink-0 ${isMovPaid ? iconColor : 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {methodName ?? '—'}
                        {mov.cardBrand ? ` · ${mov.cardBrand}` : ''}
                        {mov.cardInstallments && mov.cardInstallments > 1 ? ` ${mov.cardInstallments}x` : ''}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {mov.paymentDate ?? mov.dueDate}
                        {detail.movements.length > 1 && mov.installmentNumber ? ` · ${t('agenda.payment.installment')} ${mov.installmentNumber}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isMovPaid && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                          <Check className="h-2.5 w-2.5" /> {t('agenda.payment.paid')}
                        </span>
                      )}
                      {isPartial && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                          ! {formatCurrency(mov.paidAmount)}/{formatCurrency(mov.amount)}
                        </span>
                      )}
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                          ! {t('agenda.payment.overdue')}
                        </span>
                      )}
                      {mov.status === 'pending' && (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {t('agenda.payment.pending')}
                        </span>
                      )}
                      <span className="text-sm font-semibold">{formatCurrency(mov.paidAmount || mov.amount)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-muted-foreground">{t('agenda.payment.total')}</span>
              <span className="font-semibold">{formatCurrency(detail.totalAmount)}</span>
            </div>
          )}

          {/* Invoice ref + link */}
          <div className="flex items-center justify-between">
            {detail.referenceNumber && (
              <span className="text-[10px] font-mono text-muted-foreground">#{detail.referenceNumber}</span>
            )}
            <a
              href={`#/financial/receivables-detail:${detail.invoiceId}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline ml-auto"
            >
              {t('agenda.payment.viewInvoice')}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* Checkout view — only when no invoice exists yet */}
      {!loading && (!detail || detail.movements.length === 0) && (
        <>
          {/* Service summary */}
          {services && services.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-2">{t('agenda.payment.serviceSummary')}</p>
              <div className="space-y-0.5">
                {services.map((svc, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1">
                    <span className="truncate">{svc.name}</span>
                    <span className="shrink-0 text-muted-foreground">{formatCurrency(svc.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between text-sm font-semibold pt-2 border-t">
            <span>{t('agenda.payment.total')}</span>
            <span>{formatCurrency(orderTotal)}</span>
          </div>

          {/* Payment method grid */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-2">{t('agenda.payment.paymentMethod')}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {paymentTypes.map((pt) => {
                const ptTx = pt.transactionType ?? pt.name.toLowerCase().replace(/\s+/g, '_')
                const Icon = TYPE_ICONS[ptTx] ?? Banknote
                const colorClass = TYPE_COLORS[ptTx] ?? TYPE_COLORS.cash
                const iconColor = ICON_COLORS[ptTx] ?? ICON_COLORS.cash
                const isActive = selectedTypeId === pt.id
                return (
                  <button
                    key={pt.id}
                    type="button"
                    data-active={isActive}
                    onClick={() => handleSelectType(pt.id)}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 text-[10px] font-medium transition-all ${colorClass}`}
                  >
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                    <span className="truncate w-full text-center">{pt.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Extra fields based on payment type */}
          {selectedTypeId && (
            <div className="space-y-3">
              {/* Specific payment method (filtered by type) */}
              {filteredMethods.length > 0 && (
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">
                    {needsCard ? t('agenda.payment.card') : t('agenda.payment.method')}
                  </label>
                  <select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}
                    className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">{t('agenda.payment.select')}</option>
                    {filteredMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}

              {/* Card brand + installments */}
              {needsCard && (
                <div className={`grid gap-2.5 ${needsCardInstallments ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground">{t('agenda.payment.cardBrand')}</label>
                    <select value={cardBrand} onChange={(e) => setCardBrand(e.target.value)}
                      className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">{t('agenda.payment.selectBrand')}</option>
                      {['Visa', 'Mastercard', 'American Express', 'Elo', 'Hipercard', 'Diners Club'].map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  {needsCardInstallments && (
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground">{t('agenda.payment.cardInstallments')}</label>
                      <select value={cardInstallments} onChange={(e) => setCardInstallments(Number(e.target.value))}
                        className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}x {n > 1 ? formatCurrency(orderTotal / n) : ''}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Bank account */}
              {needsBank && bankAccounts.length > 0 && (
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">{t('agenda.payment.bankAccount')}</label>
                  <select value={selectedBankId} onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">{t('agenda.payment.selectAccount')}</option>
                    {bankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Confirm button */}
          <button
            type="button"
            onClick={handleCheckout}
            disabled={processing || !selectedTypeId}
            className="w-full rounded-lg bg-primary border border-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset disabled:opacity-40 transition-colors"
          >
            {processing
              ? t('agenda.payment.checkingOut')
              : `${t('agenda.payment.checkout')} ${formatCurrency(orderTotal)}`
            }
          </button>
        </>
      )}
    </div>
  )

  if (inline) return content

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center transition-colors duration-200"
      style={{ backgroundColor: visible ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-xl border bg-card shadow-2xl mx-4 transition-all duration-200 max-h-[90vh] overflow-y-auto"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(8px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-card z-10">
          <h3 className="text-base font-semibold">{t('agenda.payment.title')}</h3>
          <button onClick={handleClose} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        {content}
      </div>
    </div>,
    document.body,
  )
}
