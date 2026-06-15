import type { Product } from '@fayz-ai/shop/types'

export interface ProductOptionGroup {
  id: string
  label: string
  values: string[]
}

export type ProductOptionSelection = Record<string, string>

function cleanValues(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)))
}

function cleanOptionGroup(value: unknown): ProductOptionGroup | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const id = typeof record.id === 'string' ? record.id : typeof record.name === 'string' ? record.name : null
  const label = typeof record.label === 'string' ? record.label : typeof record.name === 'string' ? record.name : id
  const values = cleanValues(record.values)
  if (!id || !label || values.length === 0) return null
  return { id, label, values }
}

export function getProductOptionGroups(product: Product): ProductOptionGroup[] {
  const options = product.metadata.options
  const explicit = Array.isArray(options)
    ? options.map(cleanOptionGroup).filter((group): group is ProductOptionGroup => Boolean(group))
    : []

  if (explicit.length > 0) return explicit

  const groups: ProductOptionGroup[] = []
  const sizes = cleanValues(product.metadata.sizes)
  const colors = cleanValues(product.metadata.colors)

  if (sizes.length > 0) groups.push({ id: 'Tamanho', label: 'Tamanho', values: sizes })
  if (colors.length > 0) groups.push({ id: 'Cor', label: 'Cor', values: colors })

  return groups
}

export function normalizeProductOptionSelection(selection?: ProductOptionSelection | null): ProductOptionSelection {
  if (!selection) return {}
  return Object.fromEntries(
    Object.entries(selection)
      .filter((entry): entry is [string, string] => entry[0].trim().length > 0 && entry[1].trim().length > 0)
      .sort(([a], [b]) => a.localeCompare(b)),
  )
}

export function formatProductOptionSelection(selection?: ProductOptionSelection | null): string {
  return Object.entries(normalizeProductOptionSelection(selection))
    .map(([label, value]) => `${label}: ${value}`)
    .join(' · ')
}

export function productOptionSelectionKey(selection?: ProductOptionSelection | null): string {
  const normalized = normalizeProductOptionSelection(selection)
  const entries = Object.entries(normalized)
  return entries.length > 0 ? JSON.stringify(entries) : ''
}
