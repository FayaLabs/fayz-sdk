import React from 'react'
import { InvoiceListView } from './InvoiceListView'
import { InvoiceFormView } from './InvoiceFormView'
import { InvoiceDetailView } from './InvoiceDetailView'
import type { ViewIntent } from '../FinancialPage'

export function PayablesView({ intent, onNavigate }: {
  intent: ViewIntent
  onNavigate: (view: string) => void
}) {
  if (intent.mode === 'new') {
    return <InvoiceFormView direction="debit" onSaved={(id) => onNavigate(id ? `payables-detail:${id}` : 'payables-list')} />
  }

  if (intent.mode === 'edit' && intent.editId) {
    return <InvoiceFormView direction="debit" editId={intent.editId} onSaved={() => onNavigate(`payables-detail:${intent.editId}`)} />
  }

  if (intent.mode === 'detail' && intent.editId) {
    return (
      <InvoiceDetailView
        invoiceId={intent.editId}
        direction="debit"
        onBack={() => onNavigate('payables-list')}
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
