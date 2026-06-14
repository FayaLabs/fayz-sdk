import React, { useEffect, useState, useMemo } from 'react'
import { Landmark, Play, Square, Clock, ChevronDown, ChevronUp, Calculator, X, Check, StickyNote } from 'lucide-react'
import { useFinancialConfig, useFinancialStore, formatCurrency } from '../FinancialContext'
import { useTranslation } from '@fayz-ai/core'
import { SubpageHeader } from '@fayz-ai/ui'
import { CurrencyInput } from '@fayz-ai/ui'
import { Button } from '@fayz-ai/ui'

// ---------------------------------------------------------------------------
// Denomination definitions (BRL default — overridden by currency config)
// ---------------------------------------------------------------------------

interface Denomination {
  label: string
  value: number
  type: 'bill' | 'coin'
}

const BRL_DENOMINATIONS: Denomination[] = [
  { label: 'R$ 200', value: 200, type: 'bill' },
  { label: 'R$ 100', value: 100, type: 'bill' },
  { label: 'R$ 50', value: 50, type: 'bill' },
  { label: 'R$ 20', value: 20, type: 'bill' },
  { label: 'R$ 10', value: 10, type: 'bill' },
  { label: 'R$ 5', value: 5, type: 'bill' },
  { label: 'R$ 2', value: 2, type: 'bill' },
  { label: 'R$ 1', value: 1, type: 'coin' },
  { label: 'R$ 0,50', value: 0.5, type: 'coin' },
  { label: 'R$ 0,25', value: 0.25, type: 'coin' },
  { label: 'R$ 0,10', value: 0.1, type: 'coin' },
  { label: 'R$ 0,05', value: 0.05, type: 'coin' },
]

// ---------------------------------------------------------------------------
// Denomination counter sub-component
// ---------------------------------------------------------------------------

function DenominationCounter({
  denominations,
  counts,
  onChange,
  currency,
}: {
  denominations: Denomination[]
  counts: Record<number, number>
  onChange: (counts: Record<number, number>) => void
  currency: { code: string; locale: string; symbol: string }
}) {
  const t = useTranslation()
  const bills = denominations.filter((d) => d.type === 'bill')
  const coins = denominations.filter((d) => d.type === 'coin')

  function setCount(value: number, count: number) {
    onChange({ ...counts, [value]: Math.max(0, count) })
  }

  function renderRow(d: Denomination) {
    const qty = counts[d.value] ?? 0
    const subtotal = qty * d.value
    return (
      <div key={d.value} className="flex items-center gap-2 py-1">
        <span className="w-20 text-xs font-medium text-muted-foreground">{d.label}</span>
        <span className="text-muted-foreground text-xs">×</span>
        <input
          type="number"
          min={0}
          value={qty || ''}
          onChange={(e) => setCount(d.value, parseInt(e.target.value) || 0)}
          placeholder="0"
          className="w-16 rounded border bg-background px-2 py-1 text-xs text-center tabular-nums"
        />
        <span className="text-xs text-muted-foreground">=</span>
        <span className="w-24 text-xs text-right tabular-nums font-medium">
          {formatCurrency(subtotal, currency)}
        </span>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {bills.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">{t('financial.cash.bills')}</p>
          {bills.map(renderRow)}
        </div>
      )}
      {coins.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">{t('financial.cash.coins')}</p>
          {coins.map(renderRow)}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Opening panel (step-based)
// ---------------------------------------------------------------------------

type OpenMode = 'quick' | 'count'

function CashOpeningPanel({
  cashAccounts,
  currency,
  onOpen,
}: {
  cashAccounts: { id: string; name: string }[]
  currency: { code: string; locale: string; symbol: string }
  onOpen: (accountId: string, balance: number, notes?: string) => Promise<void>
}) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(cashAccounts[0]?.id ?? '')
  const [mode, setMode] = useState<OpenMode>('quick')
  const [quickBalance, setQuickBalance] = useState(0)
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const t = useTranslation()

  const countedTotal = useMemo(() => {
    return BRL_DENOMINATIONS.reduce((sum, d) => sum + (counts[d.value] ?? 0) * d.value, 0)
  }, [counts])

  const effectiveBalance = mode === 'count' ? countedTotal : quickBalance

  function resetForm() {
    setQuickBalance(0)
    setCounts({})
    setNotes('')
    setShowNotes(false)
    setConfirming(false)
  }

  async function handleConfirm() {
    setSubmitting(true)
    try {
      await onOpen(selectedAccountId, effectiveBalance, notes || undefined)
      resetForm()
    } finally {
      setSubmitting(false)
    }
  }

  if (cashAccounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-4">
        {t('financial.cash.noAccounts')}
      </p>
    )
  }

  // Confirmation step
  if (confirming) {
    return (
      <div className="p-4 space-y-4">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
          <p className="text-sm font-semibold">{t('financial.cash.confirmOpening')}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="text-muted-foreground">{t('financial.cash.register')}</span>
            <span className="font-medium">{cashAccounts.find((a) => a.id === selectedAccountId)?.name}</span>
            <span className="text-muted-foreground">{t('financial.cash.openingBalance')}</span>
            <span className="font-bold text-base">{formatCurrency(effectiveBalance, currency)}</span>
            {mode === 'count' && (
              <>
                <span className="text-muted-foreground">{t('financial.cash.method')}</span>
                <span className="font-medium">{t('financial.cash.denominationCount')}</span>
              </>
            )}
            {notes && (
              <>
                <span className="text-muted-foreground">{t('financial.cash.notes')}</span>
                <span className="font-medium">{notes}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setConfirming(false)}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors"
          >
            <X className="h-3 w-3" /> {t('common.back')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary border border-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-colors disabled:opacity-50"
          >
            <Check className="h-3 w-3" /> {submitting ? t('financial.cash.opening') : t('financial.cash.confirmAndOpen')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Account selector */}
      {cashAccounts.length > 1 && (
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase">{t('financial.cash.register')}</label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full mt-0.5 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2 py-1.5 text-xs"
          >
            {cashAccounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-1 rounded-lg border p-0.5 w-fit">
        <button
          onClick={() => setMode('quick')}
          className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
            mode === 'quick' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          }`}
        >
          {t('financial.cash.quickAmount')}
        </button>
        <button
          onClick={() => setMode('count')}
          className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-md font-medium transition-colors ${
            mode === 'count' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          }`}
        >
          <Calculator className="h-3 w-3" /> {t('financial.cash.countBillsCoins')}
        </button>
      </div>

      {/* Quick mode */}
      {mode === 'quick' && (
        <CurrencyInput
          value={quickBalance}
          onChange={setQuickBalance}
          symbol={currency.symbol}
          locale={currency.locale}
          currencyCode={currency.code}
          label={t('financial.cash.openingBalance')}
        />
      )}

      {/* Count mode */}
      {mode === 'count' && (
        <div className="space-y-3">
          <DenominationCounter
            denominations={BRL_DENOMINATIONS}
            counts={counts}
            onChange={setCounts}
            currency={currency}
          />
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs font-medium text-muted-foreground uppercase">{t('financial.cash.countedTotal')}</span>
            <span className="text-lg font-bold">{formatCurrency(countedTotal, currency)}</span>
          </div>
        </div>
      )}

      {/* Notes toggle */}
      <div>
        {!showNotes ? (
          <button
            onClick={() => setShowNotes(true)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <StickyNote className="h-3 w-3" /> {t('financial.cash.addNotes')}
          </button>
        ) : (
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase">{t('financial.cash.notes')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={t('financial.cash.openingObservations')}
              className="w-full mt-0.5 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2 py-1.5 text-xs resize-none"
            />
          </div>
        )}
      </div>

      {/* Open button */}
      <button
        onClick={() => setConfirming(true)}
        disabled={effectiveBalance <= 0}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary border border-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-colors disabled:opacity-50"
      >
        <Play className="h-3 w-3" /> {t('financial.cash.openSession')}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Closing panel (inline within open session card)
// ---------------------------------------------------------------------------

function CashClosingPanel({
  session,
  currency,
  onClose,
}: {
  session: { id: string; openingBalance: number; bankAccountName?: string }
  currency: { code: string; locale: string; symbol: string }
  onClose: (sessionId: string, balance: number, notes?: string) => Promise<void>
}) {
  const [mode, setMode] = useState<OpenMode>('quick')
  const [quickBalance, setQuickBalance] = useState(0)
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const t = useTranslation()

  const countedTotal = useMemo(() => {
    return BRL_DENOMINATIONS.reduce((sum, d) => sum + (counts[d.value] ?? 0) * d.value, 0)
  }, [counts])

  const effectiveBalance = mode === 'count' ? countedTotal : quickBalance
  const difference = effectiveBalance - session.openingBalance

  async function handleClose() {
    setSubmitting(true)
    try {
      await onClose(session.id, effectiveBalance, notes || undefined)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3 pt-3 border-t">
      {/* Mode toggle */}
      <div className="flex gap-1 rounded-lg border p-0.5 w-fit">
        <button
          onClick={() => setMode('quick')}
          className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
            mode === 'quick' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          }`}
        >
          {t('financial.cash.quickAmount')}
        </button>
        <button
          onClick={() => setMode('count')}
          className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-md font-medium transition-colors ${
            mode === 'count' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          }`}
        >
          <Calculator className="h-3 w-3" /> {t('financial.cash.count')}
        </button>
      </div>

      {mode === 'quick' ? (
        <CurrencyInput
          value={quickBalance}
          onChange={setQuickBalance}
          symbol={currency.symbol}
          locale={currency.locale}
          currencyCode={currency.code}
          label={t('financial.cash.closingBalance')}
        />
      ) : (
        <div className="space-y-3">
          <DenominationCounter
            denominations={BRL_DENOMINATIONS}
            counts={counts}
            onChange={setCounts}
            currency={currency}
          />
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs font-medium text-muted-foreground uppercase">{t('financial.cash.countedTotal')}</span>
            <span className="text-lg font-bold">{formatCurrency(countedTotal, currency)}</span>
          </div>
        </div>
      )}

      {/* Difference indicator */}
      {effectiveBalance > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
          <span className="text-xs text-muted-foreground">{t('financial.cash.differenceFromOpening')}</span>
          <span className={`text-sm font-bold tabular-nums ${
            difference > 0 ? 'text-success' : difference < 0 ? 'text-destructive' : 'text-muted-foreground'
          }`}>
            {difference >= 0 ? '+' : ''}{formatCurrency(difference, currency)}
          </span>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase">{t('financial.cash.closingNotes')}</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder={t('financial.cash.closingObservations')}
          className="w-full mt-0.5 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2 py-1.5 text-xs resize-none"
        />
      </div>

      <Button
        variant="destructive"
        size="sm"
        onClick={handleClose}
        disabled={submitting || effectiveBalance <= 0}
      >
        <Square className="h-3.5 w-3.5" />
        {submitting ? t('financial.cash.closing') : t('financial.cash.closeSession')}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function CashRegistersView() {
  const t = useTranslation()
  const { currency, labels } = useFinancialConfig()
  const bankAccounts = useFinancialStore((s) => s.bankAccounts)
  const cashSessions = useFinancialStore((s) => s.cashSessions)
  const fetchBankAccounts = useFinancialStore((s) => s.fetchBankAccounts)
  const fetchCashSessions = useFinancialStore((s) => s.fetchCashSessions)
  const openCashSession = useFinancialStore((s) => s.openCashSession)
  const closeCashSession = useFinancialStore((s) => s.closeCashSession)

  const [expandedClosing, setExpandedClosing] = useState<string | null>(null)

  useEffect(() => {
    fetchBankAccounts()
    fetchCashSessions()
  }, [])

  const cashAccounts = bankAccounts.filter((a) => a.accountType === 'cash_register')
  const openSessions = cashSessions.filter((s) => s.status === 'open')
  const closedSessions = cashSessions.filter((s) => s.status === 'closed')

  async function handleOpen(accountId: string, balance: number, notes?: string) {
    await openCashSession({ bankAccountId: accountId, openingBalance: balance, notes })
  }

  async function handleClose(sessionId: string, balance: number, notes?: string) {
    await closeCashSession({ sessionId, closingBalance: balance, notes })
    setExpandedClosing(null)
  }

  return (
    <div className="space-y-6">
      <SubpageHeader title={labels.cashRegisters ?? t('financial.cash.title')} subtitle={t('financial.cash.subtitle')} />

      {/* Open sessions */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-info" />
            <h3 className="text-sm font-semibold">{t('financial.cash.openSessions')}</h3>
            {openSessions.length > 0 && (
              <span className="rounded-full bg-info/10 text-info px-2 py-0.5 text-[10px] font-semibold">
                {openSessions.length}
              </span>
            )}
          </div>
        </div>

        {openSessions.length === 0 ? (
          <CashOpeningPanel cashAccounts={cashAccounts} currency={currency} onOpen={handleOpen} />
        ) : (
          <div className="divide-y">
            {openSessions.map((session) => (
              <div key={session.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{session.bankAccountName ?? t('financial.cash.title')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('financial.cash.opened')} {new Date(session.openedAt).toLocaleString()}
                      {session.openedByName ? ` ${t('financial.cash.by')} ${session.openedByName}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase">{t('financial.cash.openingBalance')}</p>
                    <p className="text-lg font-bold tabular-nums">{formatCurrency(session.openingBalance, currency)}</p>
                  </div>
                </div>

                {/* Expand/collapse closing controls */}
                {expandedClosing === session.id ? (
                  <CashClosingPanel session={session} currency={currency} onClose={handleClose} />
                ) : (
                  <button
                    onClick={() => setExpandedClosing(session.id)}
                    className="inline-flex items-center gap-1.5 text-xs text-destructive hover:text-destructive font-medium transition-colors"
                  >
                    <ChevronDown className="h-3 w-3" /> {t('financial.cash.closeThisSession')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick open — when sessions already exist but user may want another */}
      {openSessions.length > 0 && cashAccounts.length > openSessions.length && (
        <OpenAnotherCollapsible cashAccounts={cashAccounts} openSessions={openSessions} currency={currency} onOpen={handleOpen} />
      )}

      {/* Session history */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">{t('financial.cash.sessionHistory')}</h3>
        </div>
        {closedSessions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t('financial.cash.noClosedSessions')}</div>
        ) : (
          <div className="divide-y">
            {closedSessions.map((session) => (
              <div key={session.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{session.bankAccountName ?? t('financial.cash.title')}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(session.openedAt).toLocaleDateString()} — {session.closedAt ? new Date(session.closedAt).toLocaleDateString() : ''}
                    </p>
                    {session.openedByName && (
                      <p className="text-[10px] text-muted-foreground">{t('financial.cash.by')} {session.openedByName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{t('financial.cash.openLabel')}: {formatCurrency(session.openingBalance, currency)}</span>
                      <span>{t('financial.cash.closeLabel')}: {formatCurrency(session.closingBalance ?? 0, currency)}</span>
                    </div>
                    {session.difference !== undefined && session.difference !== 0 && (
                      <p className={`text-xs font-semibold tabular-nums mt-0.5 ${session.difference > 0 ? 'text-success' : 'text-destructive'}`}>
                        {t('financial.cash.diff')}: {session.difference >= 0 ? '+' : ''}{formatCurrency(session.difference, currency)}
                      </p>
                    )}
                    {session.notes && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px] truncate" title={session.notes}>
                        {session.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Collapsible "Open another register"
// ---------------------------------------------------------------------------

function OpenAnotherCollapsible({
  cashAccounts,
  openSessions,
  currency,
  onOpen,
}: {
  cashAccounts: { id: string; name: string }[]
  openSessions: { bankAccountId: string }[]
  currency: { code: string; locale: string; symbol: string }
  onOpen: (accountId: string, balance: number, notes?: string) => Promise<void>
}) {
  const t = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const availableAccounts = cashAccounts.filter((a) => !openSessions.some((s) => s.bankAccountId === a.id))

  if (availableAccounts.length === 0) return null

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Play className="h-3 w-3 text-primary" />
          {t('financial.cash.openAnother')}
        </span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {expanded && <CashOpeningPanel cashAccounts={availableAccounts} currency={currency} onOpen={onOpen} />}
    </div>
  )
}
