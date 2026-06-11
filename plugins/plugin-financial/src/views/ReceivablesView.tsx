import React from 'react'
import { InvoiceListView } from './InvoiceListView'
import { InvoiceFormView } from './InvoiceFormView'
import { InvoiceDetailView } from './InvoiceDetailView'
import type { ViewIntent } from '../FinancialPage'

export function ReceivablesView({ intent, onNavigate }: {
  intent: ViewIntent
  onNavigate: (view: string) => void
}) {
  if (intent.mode === 'new') {
    return <InvoiceFormView direction="credit" onSaved={(id) => onNavigate(id ? `receivables-detail:${id}` : 'receivables-list')} />
  }

  if (intent.mode === 'edit' && intent.editId) {
    return <InvoiceFormView direction="credit" editId={intent.editId} onSaved={() => onNavigate(`receivables-detail:${intent.editId}`)} />
  }

  if (intent.mode === 'detail' && intent.editId) {
    return (
      <InvoiceDetailView
        invoiceId={intent.editId}
        direction="credit"
        onBack={() => onNavigate('receivables-list')}
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
