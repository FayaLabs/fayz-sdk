import React, { useEffect, useMemo, useState } from 'react'
import { CreditCard, Plus, CalendarClock } from 'lucide-react'
import { useFinancialConfig, useFinancialStore, formatCurrency } from '../FinancialContext'
import { SubpageHeader } from '@fayz-ai/ui'
import { PermissionGate } from '@fayz-ai/saas'
import { useTranslation } from '@fayz-ai/core'
import type { BankAccount } from '../types'
import { QuickTransactionForm } from './QuickTransactionForm'

// ---------------------------------------------------------------------------
// Per-card money math. Credit-card balances are stored as debt (negative), so
// the current bill (fatura) is the magnitude owed; the available limit is what
// remains of the credit line.
// ---------------------------------------------------------------------------

function cardMath(acc: BankAccount) {
  const limit = acc.creditLimit ?? 0
  const used = Math.max(0, -acc.currentBalance)
  const available = Math.max(0, limit - used)
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
  return { limit, used, available, pct }
}

export function CardsView() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const bankAccounts = useFinancialStore((s) => s.bankAccounts)
  const bankAccountsLoading = useFinancialStore((s) => s.bankAccountsLoading)
  const fetchBankAccounts = useFinancialStore((s) => s.fetchBankAccounts)

  const [tab, setTab] = useState<'open' | 'closed'>('open')
  const [addOpen, setAddOpen] = useState(false)
  const [addCardId, setAddCardId] = useState<string | undefined>()

  useEffect(() => { fetchBankAccounts() }, [])

  const cards = useMemo(
    () => bankAccounts.filter((a) => a.accountType === 'credit_card'),
    [bankAccounts],
  )
  const openCards = useMemo(() => cards.filter((c) => c.isActive), [cards])
  const closedCards = useMemo(() => cards.filter((c) => !c.isActive), [cards])
  const visibleCards = tab === 'open' ? openCards : closedCards

  // Summary strip is computed over the active (open) cards — the money that is
  // actually in play this cycle.
  const summary = useMemo(() => {
    let totalAvailable = 0
    let totalBills = 0
    for (const c of openCards) {
      const { available, used } = cardMath(c)
      totalAvailable += available
      totalBills += used
    }
    return { totalAvailable, totalBills }
  }, [openCards])

  function openAddExpense(cardId: string) {
    setAddCardId(cardId)
    setAddOpen(true)
  }

  return (
    <div className="space-y-4">
      <SubpageHeader title={t('financial.cards.title')} subtitle={t('financial.cards.subtitle')} />

      {bankAccountsLoading && cards.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border-2 border-dashed border-muted">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-yellow-600 mb-3 text-white shadow-sm">
            <CreditCard className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium">{t('financial.cards.noCards')}</p>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">{t('financial.cards.noCardsHint')}</p>
        </div>
      ) : (
        <>
          {/* Summary strip — available limit + total bills across open cards */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border shadow-sm">
            <div className="bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">{t('financial.cards.availableLimit')}</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-success">
                {formatCurrency(summary.totalAvailable, currency)}
              </p>
            </div>
            <div className="bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">{t('financial.cards.allBillsValue')}</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums">
                {formatCurrency(summary.totalBills, currency)}
              </p>
            </div>
          </div>

          {/* Open / Closed tabs (only when there are closed cards to switch to) */}
          {closedCards.length > 0 && (
            <div className="flex gap-1 rounded-full bg-muted p-1 w-full max-w-xs">
              {(['open', 'closed'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    tab === k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {k === 'open' ? t('financial.cards.tabOpen') : t('financial.cards.tabClosed')}
                </button>
              ))}
            </div>
          )}

          {/* Card tiles — stacked on mobile, grid on desktop */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleCards.map((card) => {
              const { limit, used, available, pct } = cardMath(card)
              const over = pct >= 90
              // Per-brand color so cards match the bank (and the Home card), not a uniform gold.
              const brand = `${card.bankName ?? ''} ${card.name ?? ''}`.toLowerCase()
              const headerGrad =
                brand.includes('nubank') || brand.includes('nu ') ? 'from-purple-500 via-purple-600 to-indigo-700'
                : brand.includes('ita') ? 'from-orange-400 via-orange-500 to-amber-600'
                : brand.includes('inter') ? 'from-orange-500 via-orange-600 to-orange-700'
                : 'from-indigo-500 via-indigo-600 to-violet-700'
              const barGrad =
                brand.includes('nubank') || brand.includes('nu ') ? 'from-purple-500 to-indigo-600'
                : brand.includes('ita') ? 'from-orange-400 to-amber-500'
                : brand.includes('inter') ? 'from-orange-500 to-orange-600'
                : 'from-indigo-500 to-violet-600'
              return (
                <div key={card.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                  {/* Per-brand header */}
                  <div className={`bg-gradient-to-br ${headerGrad} px-4 py-4 text-white`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        <span className="text-sm font-semibold">{card.name}</span>
                      </div>
                      {card.bankName && (
                        <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">
                          {card.bankName}
                        </span>
                      )}
                    </div>
                    <div className="mt-4">
                      <p className="text-[11px] uppercase tracking-wide opacity-80">
                        {t('financial.cards.currentBill')}
                      </p>
                      <p className="text-2xl font-bold tabular-nums leading-tight">
                        {formatCurrency(used, currency)}
                      </p>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="space-y-3 px-4 py-3">
                    {/* Usage progress bar */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{t('financial.cards.usedOfLimit', { percent: String(Math.round(pct)) })}</span>
                        <span className="tabular-nums">{formatCurrency(limit, currency)}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${
                            over ? 'bg-destructive' : `bg-gradient-to-r ${barGrad}`
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Available limit + due date */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-muted-foreground">{t('financial.cards.availableLimit')}</p>
                        <p className="text-sm font-semibold tabular-nums">{formatCurrency(available, currency)}</p>
                      </div>
                      {card.dueDay != null && (
                        <div className="flex items-center gap-1.5 text-right text-xs text-muted-foreground">
                          <CalendarClock className="h-3.5 w-3.5" />
                          <span>{t('financial.cards.dueOn', { day: String(card.dueDay) })}</span>
                        </div>
                      )}
                    </div>

                    {/* Add expense against this card — gated on the role's create action */}
                    <PermissionGate feature="financial" action="create">
                      <button
                        type="button"
                        onClick={() => openAddExpense(card.id)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-input border border-input bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t('financial.cards.addExpense')}
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <QuickTransactionForm
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultType="expense"
        defaultAccountId={addCardId}
      />
    </div>
  )
}
