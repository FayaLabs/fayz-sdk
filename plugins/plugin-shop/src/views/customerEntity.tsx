import React from 'react'
import type { EntityDef, FieldDef } from '@fayz-ai/core'
import type { ShopCustomer } from '@fayz-ai/shop'
import { ClientOrdersTab, createClientOrdersProvider, adminNavigateTo } from '@fayz-ai/saas'
import type { ClientDocument } from '@fayz-ai/saas'

// ---------------------------------------------------------------------------
// Shop customer — same declarative contract as the product entity, so the list
// and the form both come from createCrudPage instead of a hand-rolled table.
//
// ordersCount / totalSpent are read-only: they are maintained server-side by the
// shop_refresh_customer_stats trigger on every order insert/update/delete, so
// putting them in the form would offer an edit the database would overwrite.
// ---------------------------------------------------------------------------

function money(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

export function buildShopCustomerEntity(): EntityDef<ShopCustomer> {
  const fields: FieldDef[] = [
    // — Contato —
    {
      key: 'firstName', label: 'Nome', type: 'text', required: true,
      group: 'contact', placeholder: 'Maria', searchable: true,
      showInTable: true, sortable: true,
      renderCell: (_v, row: any) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{[row.firstName, row.lastName].filter(Boolean).join(' ')}</p>
          {row.email && <p className="truncate text-xs text-muted-foreground">{row.email}</p>}
        </div>
      ),
    },
    { key: 'lastName', label: 'Sobrenome', type: 'text', group: 'contact', placeholder: 'Silva', searchable: true, showInTable: false },
    {
      key: 'email', label: 'E-mail', type: 'text', group: 'contact',
      placeholder: 'maria@exemplo.com', searchable: true,
      hint: 'É por ele que o pedido é vinculado ao cliente no checkout.',
      showInTable: false,
    },
    {
      key: 'phone', label: 'Telefone', type: 'text', group: 'contact',
      placeholder: '(21) 99999-0000', searchable: true,
      showInTable: true, sortable: false,
      renderCell: (v) => <span className="text-muted-foreground">{(v as string) || '—'}</span>,
    },

    // — Histórico (somente leitura) —
    {
      key: 'ordersCount', label: 'Pedidos', type: 'number',
      showInForm: false, showInTable: true, sortable: true,
      renderCell: (v) => <span className="block text-right">{Number(v) || 0}</span>,
    },
    {
      key: 'totalSpent', label: 'Total gasto', type: 'number',
      showInForm: false, showInTable: true, sortable: true,
      renderCell: (v) => <span className="block text-right font-medium">{money(v)}</span>,
    },

    // — Interno —
    {
      key: 'notes', label: 'Observações', type: 'textarea', group: 'internal', span: 2,
      placeholder: 'Preferências, restrições, combinados de entrega…',
      hint: 'Visível só no admin. O cliente nunca vê.',
      showInTable: false,
    },
  ]

  return {
    name: 'Cliente',
    namePlural: 'Clientes',
    icon: 'Users',
    displayField: 'firstName',
    // `person` layout brings the shared archetype tabs — including Endereços,
    // which reads the core addresses table and therefore works in every app.
    layout: 'person',
    // Without archetypeKind the shell shows every person tab, including the
    // staff-only Agenda (its visibleFor filter only runs when a kind is set).
    data: { table: 'plg_shop_customers', archetypeKind: 'customer' },
    fields,
    // The SAME tab and the SAME provider beauty-saas uses. Since the shop's
    // orders now live in public.orders with party_id set, the canonical provider
    // already returns them — a shop-specific adapter would be a second
    // implementation of "list this person's orders", which is how two apps end
    // up with two different answers to the same question.
    detailTabs: [{
      id: 'orders',
      label: 'Pedidos',
      icon: 'ShoppingBag',
      aliases: ['appointments', 'quotes'],
      component: ClientOrdersTab as never,
      props: {
        provider: createClientOrdersProvider(),
        currency: { code: 'BRL', locale: 'pt-BR' },
        // The one part that legitimately differs per app: where a document
        // leads. Beauty sends a booking to the agenda and an invoice to
        // receivables; a shop order goes to the order screen.
        navigator: {
          onNavigate: (doc: ClientDocument) => adminNavigateTo(`/shop/orders/${doc.id}`),
        },
      },
    }],
    fieldGroups: [
      { id: 'contact', label: 'Contato', columns: 2 },
      { id: 'internal', label: 'Notas internas', columns: 1 },
    ],
  } as EntityDef<ShopCustomer>
}
