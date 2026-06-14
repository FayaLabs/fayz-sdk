import * as React from 'react'
import { Download, FileText } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Badge } from '@fayz-ai/ui'
import { Button } from '@fayz-ai/ui'
import { Skeleton } from '@fayz-ai/ui'
import { useTranslation } from '../../hooks/useTranslation'
import type { Invoice } from '../../types'

interface InvoiceListProps {
  invoices: Invoice[]
  loading?: boolean
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  paid: 'default',
  open: 'secondary',
  draft: 'outline',
  void: 'outline',
  uncollectible: 'destructive',
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function InvoiceList({ invoices, loading }: InvoiceListProps) {
  const { t } = useTranslation()
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{t('billing.invoice.noInvoices')}</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('billing.invoice.date')}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('billing.invoice.amount')}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('billing.invoice.status')}
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('billing.invoice.invoice')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {invoices.map((invoice) => (
            <tr
              key={invoice.id}
              className={cn(
                'transition-colors hover:bg-muted/30'
              )}
            >
              <td className="px-4 py-3 text-sm">
                {formatDate(invoice.createdAt)}
              </td>
              <td className="px-4 py-3 text-sm font-medium">
                {formatCurrency(invoice.amount, invoice.currency)}
              </td>
              <td className="px-4 py-3">
                <Badge variant={STATUS_VARIANT[invoice.status] ?? 'outline'}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                {invoice.pdfUrl ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a
                      href={invoice.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      PDF
                    </a>
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">--</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
