import React from 'react'
import type { EntityDef, EntityImageConfig, FieldDef } from '@fayz-ai/core'
import type { Product, ShopProvider } from '@fayz-ai/shop'
import { ProductImagesTab } from './ProductImagesTab'

// ---------------------------------------------------------------------------
// Storefront Product — the single source of truth for the shop product CRUD.
// Drives the list columns AND the form sections via the generic CRUD scaffolding
// (createCrudPage → CrudListView + CrudFormPage), same pattern plugin-inventory
// uses for its ERP product.
//
// This is deliberately the STOREFRONT shape (what a shopper sees: name, price,
// compare-at, images, publication status), not the ERP shape plugin-inventory
// models (cost, margin, min/max levels). They are different products in
// different tables — see the shop/inventory bridge note in the roadmap.
//
// Not modelled here because the schema has nowhere to put them yet:
//   • variants (options/SKU/stock per variant) — needs plg_shop_variants
//   • SEO title/description — needs columns on plg_shop_products
//   • multi-category — the column is a single category_id
// ---------------------------------------------------------------------------

const STATUS_TONE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  draft: 'bg-gray-100 text-gray-700',
  archived: 'bg-orange-100 text-orange-700',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  draft: 'Rascunho',
  archived: 'Arquivado',
}

function money(value: unknown, currency = 'BRL') {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(n)
}

/** `name` → `name-do-produto`, so the storefront URL is filled in for you. */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Wires the form's image slot to the product's own images. `uploadProductImage`
 * has existed on the provider all along with nothing calling it — the slot was a
 * decorative square, so a product with a photo still showed an empty placeholder.
 */
function productImage(getProvider: () => ShopProvider): EntityImageConfig {
  return {
    get: (row) => {
      const images = (row as Partial<Product>).images
      return images?.find((i) => i.isPrimary)?.url ?? images?.[0]?.url
    },
    upload: async (file, row) => {
      if (!row.id) throw new Error('Salve o produto antes de enviar a imagem.')
      const image = await getProvider().uploadProductImage(row.id, file)
      return image.url
    },
    accept: 'image/*',
  }
}

export function buildShopProductEntity(
  currencyCode = 'BRL',
  getProvider?: () => ShopProvider,
): EntityDef<Product> {
  const fields: FieldDef[] = [
    // — Geral —
    {
      key: 'name', label: 'Nome do produto', type: 'text', required: true,
      group: 'general', placeholder: 'Costela Bovina Defumada 400g',
      searchable: true, showInTable: true, sortable: true,
      renderCell: (_v, row: any) => (
        <div className="flex items-center gap-3">
          {row.images?.[0]?.url && (
            <img
              src={row.images[0].url}
              alt=""
              className="h-9 w-9 rounded object-cover"
              loading="lazy"
            />
          )}
          <div className="min-w-0">
            <p className="truncate font-medium">{row.name}</p>
            {row.sku && <p className="text-xs text-muted-foreground">{row.sku}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'slug', label: 'URL', type: 'text', group: 'general',
      placeholder: 'gerado a partir do nome',
      hint: 'Endereço do produto na loja. Deixe em branco para gerar automaticamente.',
      showInTable: false,
    },
    {
      key: 'description', label: 'Descrição', type: 'textarea', group: 'general', span: 2,
      placeholder: 'Como é feito, como preparar, o que acompanha…',
      showInTable: false,
    },

    // — Preço —
    {
      key: 'price', label: 'Preço de venda', type: 'currency', required: true,
      group: 'pricing', currency: currencyCode, currencySymbol: 'R$', currencyLocale: 'pt-BR',
      showInTable: true, sortable: true,
      renderCell: (v, row: any) => (
        <div className="text-right">
          <span className="font-medium">{money(v, row.currency)}</span>
          {row.compareAtPrice > row.price && (
            <span className="ml-2 text-xs text-muted-foreground line-through">
              {money(row.compareAtPrice, row.currency)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'compareAtPrice', label: 'Preço comparativo', type: 'currency', group: 'pricing',
      currency: currencyCode, currencySymbol: 'R$', currencyLocale: 'pt-BR',
      hint: 'Preço "de" riscado. Deixe vazio se não estiver em promoção.',
      showInTable: false,
    },
    {
      key: 'discount', label: 'Desconto', type: 'computed', group: 'pricing', showInTable: false,
      compute: (vals) => {
        const price = Number(vals.price) || 0
        const compare = Number(vals.compareAtPrice) || 0
        if (compare <= 0 || price <= 0 || compare <= price) return null
        const pct = ((compare - price) / compare) * 100
        return { display: `-${pct.toFixed(0)}%`, tone: 'positive' }
      },
    },

    // — Estoque —
    {
      key: 'sku', label: 'SKU', type: 'text', group: 'inventory',
      placeholder: 'ART-001', searchable: true, showInTable: false,
    },
    {
      key: 'inventoryCount', label: 'Estoque', type: 'number', group: 'inventory', min: 0,
      placeholder: '0', hint: 'Chega a zero e o produto aparece como esgotado na loja.',
      showInTable: true, sortable: true,
      renderCell: (v) => {
        const n = Number(v) || 0
        return (
          <span className={`block text-right ${n === 0 ? 'font-medium text-destructive' : n <= 3 ? 'text-orange-600' : ''}`}>
            {n}
          </span>
        )
      },
    },

    // — Publicação —
    {
      key: 'status', label: 'Status', type: 'segmented', required: true,
      group: 'publishing', span: 2,
      options: [
        { label: 'Rascunho', value: 'draft', description: 'Só você vê. Não aparece na loja.' },
        { label: 'Ativo', value: 'active', description: 'Publicado e à venda.' },
        { label: 'Arquivado', value: 'archived', description: 'Fora da loja, histórico preservado.' },
      ],
      showInTable: true, sortable: false,
      renderCell: (v) => {
        const s = String(v ?? 'draft')
        return (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_TONE[s] ?? STATUS_TONE.draft}`}>
            {STATUS_LABEL[s] ?? s}
          </span>
        )
      },
    },
    {
      key: 'sortOrder', label: 'Ordem na vitrine', type: 'number', group: 'publishing',
      placeholder: '0', hint: 'Menor aparece primeiro.', showInTable: false,
    },

    // — Envio —
    {
      key: 'isPhysical', label: 'Produto físico', type: 'boolean', group: 'shipping',
      hint: 'Desmarque para itens digitais, que não calculam frete.', showInTable: false,
    },
    { key: 'weight', label: 'Peso', type: 'number', group: 'shipping', min: 0, placeholder: '0.4', showInTable: false },
    {
      key: 'weightUnit', label: 'Unidade', type: 'select', group: 'shipping', showInTable: false,
      options: [{ label: 'kg', value: 'kg' }, { label: 'g', value: 'g' }, { label: 'lb', value: 'lb' }],
    },
  ]

  return {
    name: 'Produto',
    namePlural: 'Produtos',
    icon: 'Package',
    displayField: 'name',
    fields,
    fieldGroups: [
      // imageSlot renders the scaffolding's image uploader alongside the group.
      { id: 'general', label: 'Informações', columns: 2, imageSlot: true },
      { id: 'pricing', label: 'Preço', description: 'O preço comparativo vira o "de" riscado na vitrine.', columns: 3 },
      { id: 'inventory', label: 'Estoque', columns: 2 },
      { id: 'publishing', label: 'Publicação', description: 'Controla se o produto aparece na loja.', columns: 2 },
      { id: 'shipping', label: 'Envio', columns: 3 },
    ],
    facets: [{ field: 'status', allLabel: 'Todos' }],
    image: getProvider ? productImage(getProvider) : undefined,
    // The form's image slot sets the COVER; this tab manages the rest of the
    // gallery. plg_shop_product_images has always held a collection, and until
    // now nothing in the admin could add a second row to it — so the storefront
    // carousel had exactly one slide for every product in the pool.
    detailTabs: getProvider
      ? [{
          id: 'images',
          label: 'Fotos',
          icon: 'Image',
          component: ProductImagesTab as never,
          props: { getProvider },
        }]
      : undefined,
  } as EntityDef<Product>
}
