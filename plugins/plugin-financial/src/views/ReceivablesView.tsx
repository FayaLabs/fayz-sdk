import React from 'react'
import { useTranslation } from '@fayz-ai/core'
import { InvoiceListView } from './InvoiceListView'
import { InvoiceFormView } from './InvoiceFormView'
import { InvoiceDetailView } from './InvoiceDetailView'
import { referrerLabel } from './navReferrer'
import type { ViewIntent } from '../FinancialPage'

export function ReceivablesView({ intent, onNavigate, previousView, back }: {
  intent: ViewIntent
  onNavigate: (view: string) => void
  /** The in-module view the user came from — drives the context-aware back link. */
  previousView?: string | null
  /** Return to the actual previous page (falls back to the given view). */
  back?: (fallbackView?: string) => void
}) {
  const t = useTranslation()

  if (intent.mode === 'new') {
    return <InvoiceFormView direction="credit" onSaved={(id) => onNavigate(id ? `receivables-detail:${id}` : 'receivables-list')} />
  }

  if (intent.mode === 'edit' && intent.editId) {
    return <InvoiceFormView direction="credit" editId={intent.editId} onSaved={() => onNavigate(`receivables-detail:${intent.editId}`)} />
  }

  if (intent.mode === 'detail' && intent.editId) {
    // Back to where the user actually came from (e.g. statements), else the list.
    const prevLabel = referrerLabel(previousView, t)
    return (
      <InvoiceDetailView
        invoiceId={intent.editId}
        direction="credit"
        backLabel={prevLabel ?? undefined}
        onBack={prevLabel && back ? () => back('receivables-list') : () => onNavigate('receivables-list')}
        onEdit={() => onNavigate(`receivables-edit:${intent.editId}`)}
      />
    )
  }

  return (
    <InvoiceListView
      direction="credit"
      onNew={() => onNavigate('receivables-new')}
      onEdit={(id) => onNavigate(`receivables-detail:${id}`)}
    />
  )
}
