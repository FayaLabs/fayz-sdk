import React from 'react'
import type { EntityDef, FieldDef } from '@fayz-ai/core'
import type { ShippingZone } from '@fayz-ai/shop'

// ---------------------------------------------------------------------------
// Delivery zone — declarative CRUD, same contract as products and discounts.
//
// A zone is a range of postal codes with its own price and estimate. Ranges may
// overlap on purpose: the cheapest match wins, which is how a merchant layers a
// promotion over a broader zone without deleting the broader one.
//
// The two things worth being loud about in the UI:
//   · a store with NO zones keeps charging its flat rate — zones are opt-in;
//   · once the first zone exists, an address outside every zone can no longer
//     order (shop_place_order refuses it), so the first save changes who can buy.
// ---------------------------------------------------------------------------

const cep = (value: string | undefined): string => {
  const digits = String(value ?? '').replace(/\D/g, '').padStart(8, '0')
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function buildShopShippingZoneEntity(currency = 'BRL'): EntityDef<ShippingZone> {
  const money = (value: number | null | undefined) =>
    value == null
      ? '—'
      : new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(value))

  const fields: FieldDef[] = [
    {
      key: 'name', label: 'Nome da zona', type: 'text', required: true, group: 'zone',
      placeholder: 'Rio de Janeiro — capital',
      hint: 'Aparece para o cliente na hora de escolher a entrega.',
      searchable: true, showInTable: true, sortable: true,
    },
    {
      key: 'carrier', label: 'Transportadora', type: 'text', group: 'zone',
      placeholder: 'Correios, motoboy próprio…',
      hint: 'Opcional. Mostrado antes do nome da zona quando preenchido.',
      showInTable: true,
    },
    {
      key: 'postalFrom', label: 'CEP inicial', type: 'text', required: true, group: 'zone',
      placeholder: '20000-000',
      hint: 'Início da faixa. Pode digitar com ou sem traço.',
      showInTable: true,
      renderCell: (_v, row: any) => (
        <span className="whitespace-nowrap font-mono text-xs">
          {cep(row.postalFrom)} → {cep(row.postalTo)}
        </span>
      ),
    },
    {
      key: 'postalTo', label: 'CEP final', type: 'text', required: true, group: 'zone',
      placeholder: '23799-999',
      hint: 'Fim da faixa, inclusive.',
      showInTable: false,
    },
    {
      key: 'rate', label: 'Valor do frete', type: 'number', required: true, group: 'pricing',
      hint: 'Cobrado nos pedidos entregues nessa faixa.',
      showInTable: true, sortable: true,
      renderCell: (value: any) => <span className="tabular-nums">{money(value)}</span>,
    },
    {
      key: 'freeAbove', label: 'Frete grátis acima de', type: 'number', group: 'pricing',
      hint: 'Deixe vazio para nunca dar frete grátis nessa zona. Vale mais que a regra geral da loja.',
      showInTable: true,
      renderCell: (value: any) => <span className="tabular-nums">{money(value)}</span>,
    },
    {
      key: 'etaMinDays', label: 'Prazo mínimo (dias)', type: 'number', group: 'delivery',
      hint: '0 = no mesmo dia.',
      showInTable: false,
    },
    {
      key: 'etaMaxDays', label: 'Prazo máximo (dias)', type: 'number', group: 'delivery',
      hint: 'O cliente vê a faixa "de X a Y dias úteis" na página do produto.',
      showInTable: true,
      renderCell: (_v, row: any) =>
        row.etaMinDays == null && row.etaMaxDays == null
          ? <span className="text-muted-foreground">—</span>
          : <span>{row.etaMinDays ?? 0}–{row.etaMaxDays ?? row.etaMinDays} dias</span>,
    },
    {
      key: 'active', label: 'Ativa', type: 'boolean', group: 'delivery',
      hint: 'Desativar para de cotar essa faixa sem apagar a configuração.',
      showInTable: true,
      renderCell: (value: any) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          value ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
          {value ? 'Ativa' : 'Inativa'}
        </span>
      ),
    },
    {
      key: 'sortOrder', label: 'Ordem', type: 'number', group: 'delivery',
      hint: 'Desempate quando duas zonas custam o mesmo. Menor aparece primeiro.',
      showInTable: false,
    },
  ]

  return {
    name: 'Zona de entrega',
    namePlural: 'Entrega',
    icon: 'Truck',
    displayField: 'name',
    fields,
    fieldGroups: [
      {
        id: 'zone', label: 'Faixa de CEP', columns: 2,
        description:
          'Faixas podem se sobrepor: quando duas cobrem o mesmo CEP, o cliente paga a mais barata.',
      },
      {
        id: 'pricing', label: 'Preço', columns: 2,
        description: 'O frete cobrado é recalculado no servidor a cada pedido, a partir daqui.',
      },
      { id: 'delivery', label: 'Prazo e status', columns: 2 },
    ],
    facets: [{ field: 'active', allLabel: 'Todas' }],
  } as EntityDef<ShippingZone>
}
