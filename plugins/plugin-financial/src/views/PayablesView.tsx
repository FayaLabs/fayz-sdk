import React from 'react'
import { useTranslation } from '@fayz-ai/core'
import { InvoiceListView } from './InvoiceListView'
import { InvoiceFormView } from './InvoiceFormView'
import { InvoiceDetailView } from './InvoiceDetailView'
import { referrerLabel } from './navReferrer'
import type { ViewIntent } from '../FinancialPage'

export function PayablesView({ intent, onNavigate, previousView, back }: {
  intent: ViewIntent
  onNavigate: (view: string) => void
  /** The in-module view the user came from — drives the context-aware back link. */
  previousView?: string | null
  /** Return to the actual previous page (falls back to the given view). */
  back?: (fallbackView?: string) => void
}) {
  const t = useTranslation()

  if (intent.mode === 'new') {
    return <InvoiceFormView direction="debit" onSaved={(id) => onNavigate(id ? `payables-detail:${id}` : 'payables-list')} />
  }

  if (intent.mode === 'edit' && intent.editId) {
    return <InvoiceFormView direction="debit" editId={intent.editId} onSaved={() => onNavigate(`payables-detail:${intent.editId}`)} />
  }

  if (intent.mode === 'detail' && intent.editId) {
    // Back to where the user actually came from (e.g. statements), else the list.
    const prevLabel = referrerLabel(previousView, t)
    return (
      <InvoiceDetailView
        invoiceId={intent.editId}
        direction="debit"
        backLabel={prevLabel ?? undefined}
        onBack={prevLabel && back ? () => back('payables-list') : () => onNavigate('payables-list')}
        onEdit={() => onNavigate(`payables-edit:${intent.editId}`)}
      />
    )
  }

  return (
    <InvoiceListView
      direction="debit"
      onNew={() => onNavigate('payables-new')}
      onEdit={(id) => onNavigate(`payables-detail:${id}`)}
    />
  )
}
