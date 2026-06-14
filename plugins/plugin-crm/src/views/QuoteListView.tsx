import React, { useEffect } from 'react'
import { FileText, Pencil } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@fayz-ai/ui'
import { useCrmStore, useCrmConfig, formatCurrency } from '../CrmContext'
import { useTranslation } from '@fayz-ai/core'
import { SubpageHeader } from '@fayz-ai/ui'
import type { Quote } from '../types'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-info-soft text-info-soft-foreground',
  approved: 'bg-success-soft text-success-soft-foreground',
  rejected: 'bg-destructive-soft text-destructive-soft-foreground',
  expired: 'bg-warning-soft text-warning-soft-foreground',
  invoiced: 'bg-warning-soft text-warning-soft-foreground',
  paid: 'bg-success-soft text-success-soft-foreground',
  partial: 'bg-warning-soft text-warning-soft-foreground',
  overdue: 'bg-destructive-soft text-destructive-soft-foreground',
  cancelled: 'bg-muted text-muted-foreground',
}

function useQuoteColumns(currency: { code: string; locale: string; symbol: string }, onEditQuote?: (id: string) => void): ColumnDef<Quote, any>[] {
  const t = useTranslation()
  const cols: ColumnDef<Quote, any>[] = [
    { accessorKey: 'quoteNumber', header: '#', cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: 'contactName', header: t('crm.quotes.contact'), cell: ({ getValue }) => <span className="font-medium">{(getValue() as string) || '—'}</span> },
    { accessorKey: 'quoteDate', header: t('crm.quotes.date'), cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    {
      accessorKey: 'totalAmount', header: t('crm.quotes.amount'),
      cell: ({ getValue }) => <span className="font-medium">{formatCurrency(getValue() as number, currency)}</span>,
    },
    {
      accessorKey: 'status', header: t('crm.quotes.status'),
      cell: ({ getValue }) => {
        const status = getValue() as string
        return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground'}`}>{status}</span>
      },
    },
  ]

  if (onEditQuote) {
    cols.push({
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="text-right">
          <button
            onClick={(e) => { e.stopPropagation(); onEditQuote(row.original.id) }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Edit quote"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    })
  }

  return cols
}

export function QuoteListView({ onNew, onEdit, onEditQuote }: { onNew?: () => void; onEdit?: (id: string) => void; onEditQuote?: (id: string) => void }) {
  const t = useTranslation()
  const { currency } = useCrmConfig()
  const quotes = useCrmStore((s) => s.quotes)
  const quotesLoading = useCrmStore((s) => s.quotesLoading)
  const fetchQuotes = useCrmStore((s) => s.fetchQuotes)

  useEffect(() => { fetchQuotes({}) }, [])

  const columns = useQuoteColumns(currency, onEditQuote)

  return (
    <div className="space-y-4">
      <SubpageHeader
        title={t('crm.quotes.title')}
        subtitle={t('crm.quotes.quotesCount', { count: String(quotes.length) })}
        actions={onNew && (
          <button onClick={onNew} className="inline-flex items-center gap-1.5 rounded-lg bg-primary border border-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-colors">
            <span className="h-3.5 w-3.5 inline-flex items-center justify-center">+</span> {t('crm.quotes.newQuote')}
          </button>
        )}
      />
      {quotesLoading ? (
        <DataTable columns={columns} data={[]} loading />
      ) : quotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border-2 border-dashed border-muted">
          <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">{t('crm.quotes.noQuotes')}</p>
          {onNew && <button onClick={onNew} className="text-xs text-primary hover:underline mt-1">{t('crm.quotes.createFirst')}</button>}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={quotes}
          onRowClick={(row) => onEdit?.(row.id)}
        />
      )}
    </div>
  )
}
