import React from 'react'
import type { Product } from '@fayz-ai/shop/types'

// Metadata keys that drive the option selector (size/color) are excluded here so
// specs don't duplicate the picker; the rest are internal SDK/seed/overlay keys
// that aren't customer-facing specs.
const EXCLUDED_KEYS = new Set([
  'options', 'sizes', 'colors',
  'fayzStoreCategory', 'source', 'storeKey', 'storeName', 'tenantId', 'slug',
])

// Internal namespaced keys (fayz*, _*) are never shown as specs.
function isInternalKey(key: string): boolean {
  return EXCLUDED_KEYS.has(key) || key.startsWith('_') || key.startsWith('fayz')
}

// Friendly PT-BR labels for common metadata keys; unknown keys are humanized.
const LABELS: Record<string, string> = {
  colorway: 'Cor',
  color: 'Cor',
  fit: 'Caimento',
  material: 'Material',
  vintage: 'Safra',
  region: 'Região',
  grape: 'Uva',
  pairing: 'Harmonização',
  abv: 'Teor alcoólico',
  volume: 'Volume',
  brand: 'Marca',
  origin: 'Origem',
  warranty: 'Garantia',
  dimensions: 'Dimensões',
}

function humanize(key: string): string {
  if (LABELS[key]) return LABELS[key]
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function scalarToString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  return null
}

/** Real product specs from standard fields + scalar metadata. Renders nothing
 *  when there's nothing to show. No invented data. */
export function ProductSpecs({ product }: { product: Product }) {
  const rows: Array<[string, string]> = []
  if (product.sku) rows.push(['SKU', product.sku])
  if (product.categoryName) rows.push(['Categoria', product.categoryName])
  if (product.weight != null) rows.push(['Peso', `${product.weight} ${product.weightUnit}`])
  for (const [key, value] of Object.entries(product.metadata ?? {})) {
    if (isInternalKey(key)) continue
    const str = scalarToString(value)
    if (str) rows.push([humanize(key), str])
  }
  if (rows.length === 0) return null

  return (
    <section className="mt-14">
      <h2 className="sf-heading text-xl font-semibold tracking-tight">Especificações</h2>
      <dl className="mt-5 grid gap-x-12 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 border-b py-3 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
