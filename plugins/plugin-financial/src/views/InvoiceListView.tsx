import React, { useEffect, useState, useMemo } from 'react'
import { FileText, CircleDashed, CircleEllipsis, CircleCheckBig, CircleAlert, Ban } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { ListView } from '@fayz/ui'
import { useFinancialConfig, useFinancialStore, formatCurrency } from '../FinancialContext'
import { SubpageHeader } from '@fayz/ui'
import { PersonLink } from '@fayz/saas'
import { useTranslation } from '@fayz/core'
import type { TransactionDirection, InvoiceStatus, Invoice } from '../types'

const STATUS_OPTIONS: { value: InvoiceStatus; labelKey: string; color: string; icon: React.ElementType }[] = [
  { value: 'open', labelKey: 'financial.invoice.statusOpen', color: 'bg-info-soft text-info-soft-foreground', icon: CircleDashed },
  { value: 'partial', labelKey: 'financial.invoice.statusPartial', color: 'bg-warning-soft text-warning-soft-foreground', icon: CircleEllipsis },
  { value: 'paid', labelKey: 'financial.invoice.statusPaid', color: 'bg-success-soft text-success-soft-foreground', icon: CircleCheckBig },
  { value: 'overdue', labelKey: 'financial.invoice.statusOverdue', color: 'bg-destructive-soft text-destructive-soft-foreground', icon: CircleAlert },
  { value: 'cancelled', labelKey: 'financial.invoice.statusCancelled', color: 'bg-muted text-muted-foreground', icon: Ban },
]

function StatusBadge({ status }: { status: string }) {
  const t = useTranslation()
  const opt = STATUS_OPTIONS.find((o) => o.value === status)
  const Icon = opt?.icon ?? CircleDashed
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${opt?.color ?? 'bg-muted text-muted-foreground'}`}>
      <Icon className="h-2.5 w-2.5" /> {opt ? t(opt.labelKey) : status}
    </span>
  )
}

function useInvoiceColumns(currency: { code: string; locale: string; symbol: string }): ColumnDef<Invoice, any>[] {
  const t = useTranslation()
  return useMemo(() => [
    {
      accessorKey: 'fiscalNumber', header: '#', size: 110,
      cell: ({ getValue }) => {
        const num = getValue() as string | undefined
        return num ? <span className="text-xs font-mono text-muted-foreground">#{num}</span> : <span className="text-muted-foreground">—</span>
      },
    },
    {
      accessorKey: 'invoiceDate', header: t('financial.invoice.columnDate'),
      cell: ({ getValue }) => <span className="text-muted-foreground text-xs">{getValue() as string}</span>,
    },
    {
      id: 'description', header: t('financial.invoice.columnDescription'),
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          {row.original.contactName ? (
            <PersonLink personId={row.original.contactId} name={row.original.contactName} size="sm" className="text-sm font-medium" />
          ) : (
            <p className="font-medium">—</p>
          )}
          {row.original.itemsSummary && <p className="text-[10px] text-muted-foreground truncate max-w-[250px]">{row.original.itemsSummary}</p>}
        </div>
      ),
    },
    {
      accessorKey: 'totalAmount', header: t('financial.invoice.columnAmount'), enableSorting: true,
      cell: ({ row }) => (
        <span className={`font-medium ${row.original.status === 'cancelled' ? 'line-through text-muted-foreground' : ''}`}>
          {formatCurrency(row.original.totalAmount, currency)}
        </span>
      ),
    },
    {
      accessorKey: 'paidAmount', header: t('financial.invoice.columnPaid'),
      cell: ({ row }) => (
        <span className={row.original.status === 'cancelled' ? 'line-through text-muted-foreground' : 'text-muted-foreground'}>
          {formatCurrency(row.original.paidAmount, currency)}
        </span>
      ),
    },
    {
      accessorKey: 'status', header: t('financial.invoice.columnStatus'),
      cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
    },
    {
      accessorKey: 'totalInstallments', header: t('financial.invoice.columnInst'),
      cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() as number}</span>,
    },
  ], [currency, t])
}

export function InvoiceListView({ direction, onNew, onEdit }: {
  direction: TransactionDirection
  onNew?: () => void
  onEdit?: (id: string) => void
}) {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const invoices = useFinancialStore((s) => s.invoices)
  const invoicesTotal = useFinancialStore((s) => s.invoicesTotal)
  const invoicesLoading = useFinancialStore((s) => s.invoicesLoading)
  const fetchInvoices = useFinancialStore((s) => s.fetchInvoices)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus[]>([])

  useEffect(() => {
    fetchInvoices({
      direction,
      status: statusFilter.length > 0 ? statusFilter : undefined,
      search: search || undefined,
    })
  }, [direction, statusFilter, search])

  const filtered = invoices.filter((inv) => inv.direction === direction)
  const listTitle = direction === 'debit' ? t('financial.invoice.accountsPayable') : t('financial.invoice.accountsReceivable')
  const columns = useInvoiceColumns(currency)
  const tags = useMemo(
    () => STATUS_OPTIONS.filter((o) => o.value !== 'cancelled').map((o) => ({ value: o.value, label: t(o.labelKey) })),
    [t],
  )

  // Summary totals from currently visible data
  const summary = useMemo(() => {
    let totalAmount = 0
    let paidAmount = 0
    let openAmount = 0
    for (const inv of filtered) {
      if (inv.status === 'cancelled') continue
      totalAmount += inv.totalAmount
      paidAmount += inv.paidAmount
    }
    openAmount = totalAmount - paidAmount
    return { totalAmount, paidAmount, openAmount }
  }, [filtered])

  const receivedLabel = direction === 'debit' ? t('financial.invoice.summaryPaid') : t('financial.invoice.summaryReceived')
  const pendingLabel = direction === 'debit' ? t('financial.invoice.summaryPayable') : t('financial.invoice.summaryReceivable')

  return (
    <div className="space-y-4">
      <SubpageHeader
        title={listTitle}
        subtitle={t('financial.invoice.invoices', { count: filtered.length })}
      />
      <ListView<Invoice>
        columns={columns}
        data={filtered}
        loading={invoicesLoading}
        searchPlaceholder={t('financial.invoice.searchPlaceholder')}
        search={search}
        onSearchChange={setSearch}
        searchDebounce={0}
        tags={tags}
        activeTag={statusFilter.length === 1 ? statusFilter[0] : undefined}
        onTagChange={(v) => setStatusFilter(v ? [v as InvoiceStatus] : [])}
        newLabel={t('financial.invoice.new')}
        onNew={onNew}
        onRowClick={(row) => onEdit?.(row.id)}
        emptyIcon={FileText}
        emptyMessage={t('financial.invoice.noInvoices')}
        emptyActionLabel={onNew ? t('financial.invoice.createFirst') : undefined}
        onEmptyAction={onNew}
      />
      {filtered.length > 0 && !invoicesLoading && (
        <div className="flex items-center justify-end gap-6 rounded-lg border bg-muted/30 px-5 py-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t('financial.invoice.summaryTotal')}</span>
            <span className="font-semibold">{formatCurrency(summary.totalAmount, currency)}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{receivedLabel}</span>
            <span className="font-semibold text-success">{formatCurrency(summary.paidAmount, currency)}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{pendingLabel}</span>
            <span className="font-semibold text-warning">{formatCurrency(summary.openAmount, currency)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
