import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ArrowRightLeft } from 'lucide-react'
import { useFinancialConfig, useFinancialStore } from '../FinancialContext'
import { useTranslation } from '@fayz-ai/core'
import { CurrencyInput, DatePicker, Button } from '@fayz-ai/ui'

export function TransferModal({ onClose, onDone, defaultFromId }: {
  onClose: () => void
  onDone: () => void
  defaultFromId?: string
}) {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const bankAccounts = useFinancialStore((s) => s.bankAccounts)
  const createTransfer = useFinancialStore((s) => s.createTransfer)
  const fetchBankAccounts = useFinancialStore((s) => s.fetchBankAccounts)

  const [fromAccountId, setFromAccountId] = useState(defaultFromId ?? '')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    fetchBankAccounts()
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  const sameAccount = !!fromAccountId && fromAccountId === toAccountId
  const canSubmit = !!fromAccountId && !!toAccountId && !sameAccount && amount > 0 && !saving

  // Enter anywhere in the modal submits (unless typing in a textarea / Shift+Enter).
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Enter' || e.shiftKey) return
    if ((e.target as HTMLElement).tagName === 'TEXTAREA') return
    e.preventDefault()
    if (canSubmit) void handleSubmit()
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    try {
      await createTransfer({ fromAccountId, toAccountId, amount, date, notes: notes || undefined })
      setVisible(false)
      setTimeout(onDone, 200)
    } catch {
      // toast handled by store
    } finally {
      setSaving(false)
    }
  }

  const selectClass = 'w-full mt-1 rounded-input border border-input bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm'

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center transition-colors duration-200"
      style={{ backgroundColor: visible ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-modal border bg-card shadow-lg mx-4 transition-all duration-200 max-h-[90vh] overflow-y-auto"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(8px)' }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-warning" />
            <h3 className="text-base font-semibold">{t('financial.transfer.title')}</h3>
          </div>
          <button onClick={handleClose} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('financial.transfer.from')}</label>
              <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className={selectClass}>
                <option value="">{t('financial.transfer.selectAccount')}</option>
                {bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('financial.transfer.to')}</label>
              <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className={selectClass}>
                <option value="">{t('financial.transfer.selectAccount')}</option>
                {bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {sameAccount && (
            <p className="text-xs text-destructive">{t('financial.transfer.sameAccount')}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput
              label={t('financial.transfer.amount')}
              value={amount}
              onChange={setAmount}
              symbol={currency.symbol}
              locale={currency.locale}
              currencyCode={currency.code}
            />
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('financial.transfer.date')}</label>
              <DatePicker value={date} onChange={setDate} className="mt-1" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('financial.transfer.notes')}</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('financial.transfer.optionalNotes')}
              className="w-full mt-1 rounded-input border border-input bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t">
          <Button variant="outline" size="sm" onClick={handleClose}>
            {t('financial.transfer.cancel')}
          </Button>
          <Button variant="default" size="sm" onClick={handleSubmit} disabled={!canSubmit}>
            <ArrowRightLeft className="h-3.5 w-3.5" />
            {saving ? t('financial.transfer.processing') : t('financial.transfer.submit')}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
