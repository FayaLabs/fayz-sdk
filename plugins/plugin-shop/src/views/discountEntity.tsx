import React from 'react'
import type { EntityDef, FieldDef } from '@fayz-ai/core'
import type { Discount } from '@fayz-ai/shop'

// ---------------------------------------------------------------------------
// Discount — declarative CRUD, same contract as products and customers.
//
// `timesUsed` is read-only: shop_place_order increments it inside the same
// transaction that validates the coupon, so the admin must never write it.
//
// `buy_x_get_y` is deliberately absent from the type options: the enum value
// exists in the database but shop_place_order records the code and applies no
// monetary effect (0003:116), so offering it would create coupons that silently
// do nothing.
// ---------------------------------------------------------------------------

const STATUS_TONE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  draft: 'bg-gray-100 text-gray-700',
  expired: 'bg-orange-100 text-orange-700',
  disabled: 'bg-red-100 text-red-700',
}

export function buildShopDiscountEntity(): EntityDef<Discount> {
  const fields: FieldDef[] = [
    // — Cupom —
    {
      key: 'title', label: 'Nome interno', type: 'text', required: true,
      group: 'coupon', placeholder: 'Bem-vindo 10%',
      hint: 'Só o admin vê. Serve para você identificar a campanha.',
      searchable: true, showInTable: true, sortable: true,
      renderCell: (_v, row: any) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.title}</p>
          {row.code && <p className="font-mono text-xs text-muted-foreground">{row.code}</p>}
        </div>
      ),
    },
    {
      key: 'code', label: 'Código', type: 'text', group: 'coupon',
      placeholder: 'ARTORIUS10',
      hint: 'O que o cliente digita no carrinho. Maiúsculas e minúsculas não importam.',
      searchable: true, showInTable: false,
    },

    // — Regra —
    {
      key: 'type', label: 'Tipo', type: 'segmented', required: true, group: 'rule', span: 2,
      options: [
        { label: 'Percentual', value: 'percentage', description: 'Desconta uma % do subtotal.' },
        { label: 'Valor fixo', value: 'fixed_amount', description: 'Desconta um valor em reais.' },
        { label: 'Frete grátis', value: 'free_shipping', description: 'Zera o frete do pedido.' },
      ],
      showInTable: true, sortable: false,
      renderCell: (v) => {
        const labels: Record<string, string> = {
          percentage: 'Percentual', fixed_amount: 'Valor fixo', free_shipping: 'Frete grátis', buy_x_get_y: 'Leve X pague Y',
        }
        return <span className="text-muted-foreground">{labels[String(v)] ?? String(v)}</span>
      },
    },
    {
      key: 'value', label: 'Valor', type: 'number', group: 'rule', min: 0,
      placeholder: '10',
      hint: 'Percentual: 10 = 10%. Valor fixo: 10 = R$ 10,00. Frete grátis ignora este campo.',
      showInTable: true, sortable: true,
      renderCell: (_v, row: any) => (
        <span className="block text-right font-medium">
          {row.type === 'percentage'
            ? `${row.value}%`
            : row.type === 'free_shipping'
              ? '—'
              : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(row.value) || 0)}
        </span>
      ),
    },

    // — Limites —
    {
      key: 'usageLimit', label: 'Limite de usos', type: 'number', group: 'limits', min: 0,
      placeholder: 'sem limite', hint: 'Deixe vazio para uso ilimitado.', showInTable: false,
    },
    {
      key: 'oncePerCustomer', label: 'Uma vez por cliente', type: 'boolean', group: 'limits',
      hint: 'Só vale para quem se identifica no checkout — compra como visitante não é rastreada.',
      showInTable: false,
    },
    {
      key: 'timesUsed', label: 'Usos', type: 'number',
      showInForm: false, showInTable: true, sortable: true,
      renderCell: (_v, row: any) => (
        <span className="block text-right text-muted-foreground">
          {row.timesUsed}{row.usageLimit ? ` / ${row.usageLimit}` : ''}
        </span>
      ),
    },

    // — Vigência —
    { key: 'startsAt', label: 'Início', type: 'date', group: 'schedule', showInTable: false },
    {
      key: 'endsAt', label: 'Fim', type: 'date', group: 'schedule',
      hint: 'Vazio = sem data de expiração.', showInTable: false,
    },
    {
      key: 'status', label: 'Status', type: 'segmented', required: true, group: 'schedule', span: 2,
      options: [
        { label: 'Rascunho', value: 'draft', description: 'Não aceito no carrinho.' },
        { label: 'Ativo', value: 'active', description: 'Valendo agora.' },
        { label: 'Desativado', value: 'disabled', description: 'Suspenso sem apagar o histórico.' },
      ],
      showInTable: true, sortable: false,
      renderCell: (v) => {
        const s = String(v ?? 'draft')
        return (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_TONE[s] ?? STATUS_TONE.draft}`}>
            {s}
          </span>
        )
      },
    },
  ]

  return {
    name: 'Desconto',
    namePlural: 'Descontos',
    icon: 'Tag',
    displayField: 'title',
    fields,
    fieldGroups: [
      { id: 'coupon', label: 'Cupom', columns: 2 },
      { id: 'rule', label: 'Regra', description: 'O desconto é recalculado no servidor a cada pedido.', columns: 2 },
      { id: 'limits', label: 'Limites de uso', columns: 2 },
      { id: 'schedule', label: 'Vigência', columns: 2 },
    ],
    facets: [{ field: 'status', allLabel: 'Todos' }],
  } as EntityDef<Discount>
}
