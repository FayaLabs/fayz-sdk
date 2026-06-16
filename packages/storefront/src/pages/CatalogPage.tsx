import React, { useEffect, useMemo, useRef } from 'react'
import { useCatalogStore, type CatalogSort } from '../stores/catalog.store'
import { useProducts } from '../hooks/useProducts'
import { ProductGrid } from '../components/ProductGrid'
import { FiltersPanel } from '../components/FiltersPanel'
import { useStorefrontConfig } from '../config'
import { useStorefrontHead } from '../hooks/useStorefrontHead'
import type { ListProductsOptions } from '@fayz-ai/shop/types'

const SORT_MAP: Record<string, Pick<ListProductsOptions, 'orderBy' | 'order'>> = {
  newest: { orderBy: 'created_at', order: 'desc' },
  'price-asc': { orderBy: 'price', order: 'asc' },
  'price-desc': { orderBy: 'price', order: 'desc' },
  name: { orderBy: 'name', order: 'asc' },
}

const SORTS: CatalogSort[] = ['newest', 'price-asc', 'price-desc', 'name']

/**
 * Two-way sync between catalog filters and the URL hash query, so a filtered/
 * searched catalog is shareable, bookmarkable, and survives a refresh. Uses
 * history.replaceState (no navigation / no scroll jump).
 */
function useCatalogUrlSync() {
  const hydrated = useRef(false)
  const catalog = useCatalogStore()

  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    const q = window.location.hash.split('?')[1]
    if (!q) return
    const p = new URLSearchParams(q)
    const s = useCatalogStore.getState()
    if (p.has('search')) s.setSearch(p.get('search') ?? '')
    if (p.get('category')) s.setCategoryId(p.get('category'))
    const sort = p.get('sort')
    if (sort && (SORTS as string[]).includes(sort)) s.setSort(sort as CatalogSort)
    if (p.get('stock') === '1') s.setInStockOnly(true)
    if (p.has('min')) s.setPriceMin(Number(p.get('min')) || null)
    if (p.has('max')) s.setPriceMax(Number(p.get('max')) || null)
  }, [])

  useEffect(() => {
    const p = new URLSearchParams()
    if (catalog.search) p.set('search', catalog.search)
    if (catalog.categoryId) p.set('category', catalog.categoryId)
    if (catalog.sort !== 'newest') p.set('sort', catalog.sort)
    if (catalog.inStockOnly) p.set('stock', '1')
    if (catalog.priceMin != null) p.set('min', String(catalog.priceMin))
    if (catalog.priceMax != null) p.set('max', String(catalog.priceMax))
    const base = window.location.hash.split('?')[0] || '#/catalog'
    const qs = p.toString()
    const next = qs ? `${base}?${qs}` : base
    if (next !== window.location.hash) window.history.replaceState(null, '', next)
  }, [catalog.search, catalog.categoryId, catalog.sort, catalog.inStockOnly, catalog.priceMin, catalog.priceMax])
}

export function CatalogPage() {
  const config = useStorefrontConfig()
  const catalog = useCatalogStore()
  useCatalogUrlSync()
  useStorefrontHead({
    title: catalog.search ? `“${catalog.search}” — ${config.name}` : `${config.name} — Loja`,
  })

  const providerOpts: ListProductsOptions = {
    status: 'active',
    categoryId: catalog.categoryId ?? undefined,
    search: catalog.search || undefined,
    ...SORT_MAP[catalog.sort],
  }
  const { products, loading, error, reload } = useProducts(providerOpts)

  // Price range + availability are client-side refinements over the fetched set
  const filtered = useMemo(
    () =>
      products.filter((p) => {
        if (catalog.priceMin != null && p.price < catalog.priceMin) return false
        if (catalog.priceMax != null && p.price > catalog.priceMax) return false
        if (catalog.inStockOnly && p.inventoryCount <= 0) return false
        return true
      }),
    [products, catalog.priceMin, catalog.priceMax, catalog.inStockOnly],
  )

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">{config.name}</h1>
        <p className="mt-1 text-muted-foreground">
          {catalog.search
            ? `Resultados para “${catalog.search}”`
            : 'Produtos selecionados com qualidade e entrega rápida.'}
        </p>
      </div>
      <div className="flex flex-col gap-8 lg:flex-row">
        <FiltersPanel />
        <div className="flex-1">
          {error ? (
            <div className="rounded-2xl border bg-card py-16 text-center">
              <p className="text-muted-foreground">Não foi possível carregar os produtos.</p>
              <button
                type="button"
                onClick={reload}
                className="mt-4 rounded-lg border px-4 py-2 text-sm font-semibold transition hover:bg-muted"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <ProductGrid products={filtered} loading={loading} />
          )}
        </div>
      </div>
    </main>
  )
}
