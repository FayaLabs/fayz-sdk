import React, { useEffect, useMemo, useState } from 'react'
import { Wallet } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { formatCurrency, type ResolvedFinancialConfig } from '../FinancialContext'
import type { FinancialDataProvider } from '../data/types'
import type { Invoice } from '../types'

const STATUS_STYLE: Record<string, string> = {
  paid: 'bg-success/15 text-success',
  partial: 'bg-warning/15 text-warning',
  overdue: 'bg-destructive/15 text-destructive',
  open: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted text-muted-foreground line-through',
}

/**
 * Per-person financial statement (account_central-style extract): every invoice where
 * this person is the contact — a client paying receivables, or a professional receiving
 * commissions/payables. Rendered as a tab on the person detail page via the
 * `person.detail.financial` widget zone.
 */
export function PersonStatementWidget({ person, provider, config }: {
  person: { id?: string; name?: string }
  provider: FinancialDataProvider
  config: ResolvedFinancialConfig
}) {
  const t = useTranslation()
  const currency = config.currency
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    if (!person?.id) { setLoading(false); return }
    setLoading(true)
    provider.getInvoices({ contactId: person.id, pageSize: 200 })
      .then((r) => { if (alive) { setInvoices(r.data); setLoading(false) } })
      .catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [person?.id, provider])

  const fmt = (n: number) => formatCurrency(n, currency)

  const totals = useMemo(() => {
    const active = invoices.filter((i) => i.status !== 'cancelled')
    const billed = active.reduce((s, i) => s + (i.totalAmount ?? 0), 0)
    const paid = active.reduce((s, i) => s + (i.paidAmount ?? 0), 0)
    return { billed, paid, balance: billed - paid }
  }, [invoices])

  const openInvoice = (inv: Invoice) => {
    const base = inv.direction === 'credit' ? 'receivables' : 'payables'
    window.location.hash = `/financial/${base}/detail/${inv.id}`
  }

  const columns: ColumnDef<Invoice, any>[] = useMemo(() => [
    {
      id: 'date', header: t('financial.invoice.columnDate'),
      cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.invoiceDate}</span>,
    },
    {
      id: 'description', header: t('financial.invoice.columnDescription'),
      cell: ({ row }) => {
        const inv = row.original
        return (
          <button onClick={() => openInvoice(inv)} className="text-left">
            <span className="text-xs font-medium text-primary hover:underline">
              {inv.itemsSummary || inv.contactName || t('financial.invoice.invoice')}
            </span>
            {inv.fiscalNumber && <span className="ml-1.5 text-[10px] text-muted-foreground font-mono">{inv.fiscalNumber}</span>}
          </button>
        )
      },
    },
    {
      id: 'amount', header: t('financial.invoice.columnAmount'),
      cell: ({ row }) => (
        <span className={`text-right block text-xs ${row.original.direction === 'credit' ? 'text-success' : 'text-destructive'}`}>
          {fmt(row.original.totalAmount)}
        </span>
      ),
    },
    {
      id: 'paid', header: t('financial.invoice.columnPaid'),
      cell: ({ row }) => <span className="text-right block text-xs text-muted-foreground">{fmt(row.original.paidAmount)}</span>,
    },
    {
      id: 'balance', header: t('financial.statements.columnBalance'),
      cell: ({ row }) => <span className="text-right block text-xs font-medium">{fmt((row.original.totalAmount ?? 0) - (row.original.paidAmount ?? 0))}</span>,
    },
    {
      id: 'status', header: t('financial.invoice.columnStatus'),
      cell: ({ row }) => (
        <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium capitalize ${STATUS_STYLE[row.original.status] ?? STATUS_STYLE.open}`}>
          {row.original.status}
        </span>
      ),
    },
  ], [currency, t])

  return (
    <div className="space-y-3">
      {/* Totals */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t('financial.invoice.summaryTotal')} value={fmt(totals.billed)} />
        <Stat label={t('financial.invoice.summaryPaid')} value={fmt(totals.paid)} positive />
        <Stat label={t('financial.statements.columnBalance')} value={fmt(totals.balance)} accent />
      </div>

      {loading ? (
        <DataTable columns={columns} data={[]} loading skeletonRows={5} compact />
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center rounded-lg border-2 border-dashed border-muted">
          <Wallet className="h-7 w-7 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{t('financial.person.empty')}</p>
        </div>
      ) : (
        <DataTable columns={columns} data={invoices} compact />
      )}
    </div>
  )
}

function Stat({ label, value, accent, positive }: { label: string; value: string; accent?: boolean; positive?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${accent ? 'bg-muted/40' : 'bg-card'}`}>
      <p className="text-[10px] font-medium text-muted-foreground uppercase truncate">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${positive ? 'text-success' : 'text-foreground'}`}>{value}</p>
    </div>
  )
}
