import React, { useEffect } from 'react'
import { CreditCard, Check } from 'lucide-react'
import { useFinancialConfig, useFinancialStore, formatCurrency } from '../FinancialContext'
import { SubpageHeader } from '@fayz/ui'
import { useTranslation } from '@fayz/core'

export function CardsView() {
  const t = useTranslation()
  const { currency, labels } = useFinancialConfig()
  const cardTransactions = useFinancialStore((s) => s.cardTransactions)
  const cardsLoading = useFinancialStore((s) => s.cardsLoading)
  const fetchCardTransactions = useFinancialStore((s) => s.fetchCardTransactions)

  useEffect(() => { fetchCardTransactions() }, [])

  // Group by card brand
  const byBrand: Record<string, typeof cardTransactions> = {}
  for (const tx of cardTransactions) {
    const brand = tx.cardBrand || 'Other'
    if (!byBrand[brand]) byBrand[brand] = []
    byBrand[brand].push(tx)
  }

  return (
    <div className="space-y-4">
      <SubpageHeader title={t('financial.cards.title')} subtitle={t('financial.cards.subtitle')} />
      {cardsLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
      ) : cardTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border-2 border-dashed border-muted">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/20 mb-2">
            <CreditCard className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="text-sm text-muted-foreground">{t('financial.cards.noTransactions')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('financial.cards.transactionsAppear')}</p>
        </div>
      ) : (
        Object.entries(byBrand).map(([brand, txs]) => (
          <div key={brand} className="rounded-lg border bg-card shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 border-b">
              <CreditCard className="h-4 w-4 text-indigo-500" />
              <h3 className="text-sm font-semibold">{brand}</h3>
              <span className="text-xs text-muted-foreground">({txs.length} transactions)</span>
            </div>
            <div className="divide-y">
              {txs.map((tx) => (
                <div key={tx.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      Installment {tx.currentInstallment}/{tx.installmentCount}
                    </p>
                    <p className="text-xs text-muted-foreground">Due: {tx.expectedDate}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatCurrency(tx.installmentAmount, currency)}</span>
                    {tx.status === 'received' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success dark:bg-success/20">
                        <Check className="h-2.5 w-2.5" /> Received
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning dark:bg-warning/20">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
