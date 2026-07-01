import React, { useEffect, useMemo } from 'react'
import {
  ShoppingCart, Car, Home, Utensils, Zap, Film, HeartPulse, Dumbbell,
  Music, ShoppingBag, Landmark, Wallet, CircleDollarSign,
} from 'lucide-react'
import { DashboardCanvas } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { useFinancialConfig, useFinancialStore, formatCurrency } from '../FinancialContext'
import type { StatementEntry } from '../types'

/**
 * Financial summary. On desktop (md+) it renders the rich multi-column dashboard
 * (KPI cards + Fluxo de Caixa chart + breakdown + overdue alerts + recent-
 * transactions table) via the shared DashboardCanvas. On mobile (<md) it swaps
 * to a Mobills-grade experience: a compact KPI strip over a date-grouped
 * transaction list. The two paths share the same store — no forked screen.
 */
export function SummaryView() {
  return (
    <>
      {/* Mobile: Mobills-style transaction-led summary */}
      <div className="md:hidden">
        <MobileSummary />
      </div>
      {/* Desktop: rich dashboard canvas (unchanged) */}
      <DashboardCanvas
        surface="plugin-home"
        domain="financial"
        showHeader={false}
        className="hidden space-y-6 md:block"
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Mobile summary (Mobills-grade)
// ---------------------------------------------------------------------------

// keyword → category glyph, so each row leads with a recognizable colored circle
// (Mobills-style). Purely cosmetic and safe while categories aren't modeled yet;
// falls back to a generic money glyph.
function categoryIcon(label: string): React.ElementType {
  const s = label.toLowerCase()
  if (/(mercado|super|padaria|extra|p[aã]o|hortifr)/.test(s)) return ShoppingCart
  if (/(uber|99|posto|shell|gasol|combust|carro)/.test(s)) return Car
  if (/(aluguel|casa|condom|im[oó]vel)/.test(s)) return Home
  if (/(ifood|restaurante|outback|lanche|food|bar\b)/.test(s)) return Utensils
  if (/(luz|energia|enel|internet|vivo|conta de|[aá]gua)/.test(s)) return Zap
  if (/(cinema|netflix|cinemark|filme|disney|prime)/.test(s)) return Film
  if (/(farm|drogasil|sa[uú]de|plano|hospital|m[eé]dic)/.test(s)) return HeartPulse
  if (/(academia|smartfit|gym|treino)/.test(s)) return Dumbbell
  if (/(spotify|music|deezer)/.test(s)) return Music
  if (/(amazon|shopping|loja|magaz|americanas|mercado livre)/.test(s)) return ShoppingBag
  if (/(fatura|cart[aã]o|nubank|banco|boleto)/.test(s)) return Landmark
  if (/(sal[aá]rio|freel|pix|reembolso|receb|renda|d[ií]vidend)/.test(s)) return Wallet
  return CircleDollarSign
}

function useDateLabel() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  return useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const y = new Date(); y.setDate(y.getDate() - 1)
    const yesterdayStr = y.toISOString().slice(0, 10)
    return (dateStr: string): string => {
      if (dateStr === todayStr) return t('financial.summary.today')
      if (dateStr === yesterdayStr) return t('financial.summary.yesterday')
      try {
        return new Date(`${dateStr}T00:00:00`).toLocaleDateString(currency.locale, {
          weekday: 'short', day: '2-digit', month: 'short',
        })
      } catch {
        return dateStr
      }
    }
  }, [t, currency.locale])
}

function MobileSummary() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const summary = useFinancialStore((s) => s.summary)
  const statement = useFinancialStore((s) => s.statement)
  const bankAccounts = useFinancialStore((s) => s.bankAccounts)
  const fetchSummary = useFinancialStore((s) => s.fetchSummary)
  const fetchBankAccounts = useFinancialStore((s) => s.fetchBankAccounts)
  const fetchStatement = useFinancialStore((s) => s.fetchStatement)
  const dateLabel = useDateLabel()

  useEffect(() => {
    void fetchSummary()
    void fetchBankAccounts()
    const to = new Date().toISOString().slice(0, 10)
    const from = new Date(); from.setDate(from.getDate() - 90)
    void fetchStatement({ dateRange: { from: from.toISOString().slice(0, 10), to } })
  }, [])

  const fmt = (n: number) => formatCurrency(n, currency)
  const inflow = summary?.monthlyInflow ?? 0
  const outflow = summary?.monthlyOutflow ?? 0

  const accountName = useMemo(() => {
    const map = new Map(bankAccounts.map((a) => [a.id, a.name]))
    return (id?: string) => (id ? map.get(id) ?? '' : '')
  }, [bankAccounts])

  // Realized cash events grouped by day (most recent first). Transfers are
  // dropped — they're internal and would double-count in a personal feed.
  const groups = useMemo(() => {
    const entries = (statement?.entries ?? []).filter((e) => e.entryKind === 'movement')
    const byDate = new Map<string, StatementEntry[]>()
    for (const e of entries) {
      const d = e.movement.paymentDate ?? e.movement.dueDate
      const bucket = byDate.get(d)
      if (bucket) bucket.push(e)
      else byDate.set(d, [e])
    }
    return [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [statement])

  return (
    <div className="space-y-4">
      {/* Compact KPI strip */}
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t('financial.summary.totalBalance')}</p>
          <p className="mt-0.5 text-2xl font-semibold">{fmt(summary?.totalBalance ?? 0)}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">{t('financial.summary.income')}</p>
          <p className="mt-0.5 text-base font-semibold text-success">{fmt(inflow)}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">{t('financial.summary.expenses')}</p>
          <p className="mt-0.5 text-base font-semibold text-destructive">{fmt(outflow)}</p>
        </div>
      </div>

      {/* Date-grouped transaction list */}
      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          {t('financial.summary.noTransactions')}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(([date, rows]) => (
            <div key={date} className="space-y-1.5">
              <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {dateLabel(date)}
              </p>
              <div className="divide-y overflow-hidden rounded-xl border bg-card">
                {rows.map((e) => {
                  const isCredit = e.movement.direction === 'credit'
                  const title = e.invoice?.contactName || e.movement.notes || t('financial.summary.transactionsTitle')
                  const Icon = categoryIcon(title)
                  const category = isCredit ? t('financial.summary.income') : t('financial.summary.expenses')
                  const acct = accountName(e.movement.bankAccountId)
                  const subtitle = acct ? `${category} · ${acct}` : category
                  return (
                    <div key={e.movement.id} className="flex items-center gap-3 px-3 py-2.5">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          isCredit
                            ? 'bg-success-soft text-success-soft-foreground'
                            : 'bg-destructive-soft text-destructive-soft-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{title}</p>
                        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
                      </div>
                      <span className={`shrink-0 text-sm font-semibold ${isCredit ? 'text-success' : 'text-destructive'}`}>
                        {isCredit ? '+' : '-'}{fmt(e.net)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
