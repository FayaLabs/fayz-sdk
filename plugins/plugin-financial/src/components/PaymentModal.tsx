import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, Banknote, QrCode, CreditCard, Building2, ArrowRightLeft, FileCheck, Pencil } from 'lucide-react'
import { useFinancialConfig, useFinancialStore, formatCurrency } from '../FinancialContext'
import { useTranslation } from '@fayz-ai/core'
import { CurrencyInput } from '@fayz-ai/ui'
import { DatePicker } from '@fayz-ai/ui'
import { Button } from '@fayz-ai/ui'
import type { FinancialMovement, PaymentMethodType } from '../types'

const TYPE_ICONS: Record<string, React.ElementType> = {
  cash: Banknote,
  pix: QrCode,
  credit_card: CreditCard,
  debit_card: CreditCard,
  bank_transfer: ArrowRightLeft,
  check: FileCheck,
}

const TYPE_COLORS: Record<string, string> = {
  cash: 'border-success/30 bg-success/5 hover:bg-success/10 data-[active=true]:border-success data-[active=true]:bg-success/15',
  pix: 'border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10 data-[active=true]:border-teal-500 data-[active=true]:bg-teal-500/15',
  credit_card: 'border-info/30 bg-info/5 hover:bg-info/10 data-[active=true]:border-info data-[active=true]:bg-info/15',
  debit_card: 'border-magic/30 bg-magic/5 hover:bg-magic/10 data-[active=true]:border-magic data-[active=true]:bg-magic/15',
  bank_transfer: 'border-warning/30 bg-warning/5 hover:bg-warning/10 data-[active=true]:border-warning data-[active=true]:bg-warning/15',
  check: 'border-border bg-muted/40 hover:bg-muted/60 data-[active=true]:border-foreground data-[active=true]:bg-muted',
}

const ICON_COLORS: Record<string, string> = {
  cash: 'text-success',
  pix: 'text-teal-500',
  credit_card: 'text-info',
  debit_card: 'text-magic',
  bank_transfer: 'text-warning',
  check: 'text-muted-foreground',
}

export function PaymentModal({ movement, onClose, onPaid }: {
  movement: FinancialMovement
  onClose: () => void
  onPaid: () => void
}) {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const payMovement = useFinancialStore((s) => s.payMovement)
  const bankAccounts = useFinancialStore((s) => s.bankAccounts)
  const paymentMethods = useFinancialStore((s) => s.paymentMethods)
  const paymentMethodTypes = useFinancialStore((s) => s.paymentMethodTypes)
  const fetchBankAccounts = useFinancialStore((s) => s.fetchBankAccounts)
  const fetchPaymentMethods = useFinancialStore((s) => s.fetchPaymentMethods)

  const remaining = movement.amount - movement.paidAmount
  const [amount, setAmount] = useState(remaining)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [cardBrand, setCardBrand] = useState('')
  const [cardInstallments, setCardInstallments] = useState(1)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [visible, setVisible] = useState(false)
  const [expandMethodPicker, setExpandMethodPicker] = useState(true)

  useEffect(() => {
    fetchBankAccounts()
    fetchPaymentMethods()
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const selectedType = useMemo(() =>
    paymentMethodTypes.find((tp) => tp.id === selectedTypeId),
    [paymentMethodTypes, selectedTypeId]
  )

  const txType = selectedType?.transactionType ?? ''

  const filteredMethods = useMemo(() =>
    paymentMethods.filter((m) => m.paymentMethodTypeId === selectedTypeId),
    [paymentMethods, selectedTypeId]
  )

  const needsBankAccount = txType === 'bank_transfer' || txType === 'pix' || txType === 'check'
  const needsCard = txType === 'credit_card' || txType === 'debit_card'
  const needsCardInstallments = txType === 'credit_card'

  function handleSelectType(typeId: string) {
    setSelectedTypeId(typeId)
    setExpandMethodPicker(false)
    setPaymentMethodId('')
    setBankAccountId('')
    setCardBrand('')
    setCardInstallments(1)
  }

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  async function handlePay() {
    if (amount <= 0 || !selectedTypeId) return
    setSaving(true)
    try {
      await payMovement({
        movementId: movement.id,
        amount,
        paymentDate,
        paymentMethodId: paymentMethodId || undefined,
        paymentMethodTypeId: selectedTypeId || undefined,
        bankAccountId: bankAccountId || undefined,
        cardBrand: needsCard ? cardBrand || undefined : undefined,
        cardInstallments: needsCardInstallments ? cardInstallments : undefined,
      })
      setVisible(false)
      setTimeout(onPaid, 200)
    } catch {
      // toast handled by store
    } finally {
      setSaving(false)
    }
  }

  const SelectedIcon = selectedType ? (TYPE_ICONS[txType] ?? Banknote) : null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center transition-colors duration-200"
      style={{ backgroundColor: visible ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-modal border bg-card shadow-lg mx-4 transition-all duration-200 max-h-[90vh] overflow-y-auto"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(8px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-card z-10">
          <div>
            <h3 className="text-base font-semibold">{t('financial.payment.title')}</h3>
            <p className="text-xs text-muted-foreground">
              {t('financial.payment.installment', { number: String(movement.installmentNumber ?? 1) })} &middot; {t('financial.payment.remaining', { amount: formatCurrency(remaining, currency) })}
            </p>
          </div>
          <button onClick={handleClose} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Payment method type selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('financial.payment.method')}</label>

            {/* Collapsed: show selected as inline chip */}
            <div
              className="grid transition-all duration-200 ease-out"
              style={{ gridTemplateRows: selectedTypeId && !expandMethodPicker ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                {selectedType && (
                  <button
                    onClick={() => setExpandMethodPicker(true)}
                    className={`flex items-center gap-2 mt-1.5 w-full rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted/30 ${TYPE_COLORS[txType] ?? ''}`}
                    data-active="true"
                  >
                    {SelectedIcon && <SelectedIcon className={`h-4 w-4 ${ICON_COLORS[txType] ?? ''}`} />}
                    <span className="text-sm font-medium flex-1">{selectedType?.name}</span>
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* Expanded: full grid */}
            <div
              className="grid transition-all duration-200 ease-out"
              style={{ gridTemplateRows: expandMethodPicker ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {paymentMethodTypes.map((type) => {
                    const tt = type.transactionType ?? ''
                    const Icon = TYPE_ICONS[tt] ?? Banknote
                    const isActive = selectedTypeId === type.id
                    return (
                      <button
                        key={type.id}
                        data-active={isActive}
                        onClick={() => handleSelectType(type.id)}
                        className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center transition-all ${TYPE_COLORS[tt] ?? TYPE_COLORS.cash}`}
                      >
                        <Icon className={`h-5 w-5 ${isActive ? ICON_COLORS[tt] ?? '' : 'text-muted-foreground'}`} />
                        <span className={`text-[11px] font-medium leading-tight ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{type.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Form fields — only after method selected */}
          {selectedTypeId && (
            <div key={selectedTypeId} className="space-y-4">
              {/* Amount + Date side by side */}
              <div className="grid grid-cols-2 gap-3 stagger-field" style={{ animationDelay: '0ms' }}>
                <CurrencyInput
                  label={t('financial.payment.amount')}
                  value={amount}
                  onChange={setAmount}
                  symbol={currency.symbol}
                  locale={currency.locale}
                  currencyCode={currency.code}
                />
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t('financial.payment.date')}</label>
                  <DatePicker value={paymentDate} onChange={setPaymentDate} className="mt-1" />
                </div>
              </div>

              {/* Specific payment method */}
              {filteredMethods.length > 0 && (
                <div className="stagger-field" style={{ animationDelay: '50ms' }}>
                  <label className="text-xs font-medium text-muted-foreground">
                    {needsCard ? t('financial.payment.card') : t('financial.payment.account')}
                  </label>
                  <select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)} className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm">
                    <option value="">{t('financial.payment.select')}</option>
                    {filteredMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}

              {/* Card fields side by side */}
              {needsCard && (
                <div className={`grid gap-3 stagger-field ${needsCardInstallments ? 'grid-cols-2' : 'grid-cols-1'}`} style={{ animationDelay: '100ms' }}>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t('financial.payment.cardBrand')}</label>
                    <select value={cardBrand} onChange={(e) => setCardBrand(e.target.value)} className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm">
                      <option value="">{t('financial.payment.selectBrand')}</option>
                      {['Visa', 'Mastercard', 'American Express', 'Elo', 'Hipercard', 'Diners Club'].map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  {needsCardInstallments && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{t('financial.payment.cardInstallments')}</label>
                      <select value={cardInstallments} onChange={(e) => setCardInstallments(Number(e.target.value))} className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}x {n > 1 ? formatCurrency(amount / n, currency) : ''}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Bank account */}
              {needsBankAccount && bankAccounts.length > 0 && (
                <div className="stagger-field" style={{ animationDelay: '100ms' }}>
                  <label className="text-xs font-medium text-muted-foreground">{t('financial.payment.bankAccount')}</label>
                  <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm">
                    <option value="">{t('financial.payment.selectAccount')}</option>
                    {bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div className="stagger-field" style={{ animationDelay: '150ms' }}>
                <label className="text-xs font-medium text-muted-foreground">{t('financial.payment.notes')}</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('financial.payment.optionalNotes')} className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
          )}
        </div>

        {/* Keyframe for staggered field entrance */}
        <style>{`
          .stagger-field {
            animation: field-slide-in 250ms ease-out both;
          }
          @keyframes field-slide-in {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Actions */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t sticky bottom-0 bg-card">
          <Button variant="outline" size="sm" onClick={handleClose}>
            {t('financial.payment.cancel')}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handlePay}
            disabled={amount <= 0 || !selectedTypeId || saving}
          >
            <Check className="h-3.5 w-3.5" />
            {saving ? t('financial.payment.processing') : t('financial.payment.payAmount', { amount: formatCurrency(amount, currency) })}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
