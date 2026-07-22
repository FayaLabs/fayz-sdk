import type { CrudQuery, CrudResult } from '@fayz-ai/core'
import type { ShopProvider } from '@fayz-ai/shop'

export type ShopProviderResolver = ShopProvider | (() => ShopProvider)

export const resolve = (p: ShopProviderResolver): ShopProvider => (typeof p === 'function' ? p() : p)

/**
 * Paging, sorting and facet filtering applied client-side: the shop provider's
 * list methods take a search term but no offset, sort or filter parameters.
 * Fine at storefront catalogue sizes; revisit if a tenant grows past a few
 * thousand rows, where it should move into the query.
 */
export function applyQuery<T>(
  rows: T[],
  query: CrudQuery,
  facetKey?: keyof T & string,
): CrudResult<T> {
  const prop = (row: T, key: string): unknown => (row as Record<string, unknown>)[key]
  let data = rows

  if (facetKey) {
    const wanted = query.filters?.[facetKey]
    if (wanted && wanted !== 'all') data = data.filter((row) => prop(row, facetKey) === wanted)
  }

  if (query.sortBy) {
    const dir = query.sortDir === 'desc' ? -1 : 1
    const key = query.sortBy
    data = [...data].sort((a, b) => {
      const av = prop(a, key)
      const bv = prop(b, key)
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av ?? '').localeCompare(String(bv ?? ''), 'pt-BR') * dir
    })
  }

  const total = data.length
  const page = query.page ?? 1
  const size = query.pageSize ?? total
  return { data: data.slice((page - 1) * size, page * size), total }
}
