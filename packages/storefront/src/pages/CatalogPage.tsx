import React, { useMemo } from 'react'
import { useCatalogStore } from '../stores/catalog.store'
import { useProducts } from '../hooks/useProducts'
import { ProductGrid } from '../components/ProductGrid'
import { FiltersPanel } from '../components/FiltersPanel'
import { useStorefrontConfig } from '../config'
import type { ListProductsOptions } from '@fayz-ai/shop'

const SORT_MAP: Record<string, Pick<ListProductsOptions, 'orderBy' | 'order'>> = {
  newest: { orderBy: 'created_at', order: 'desc' },
  'price-asc': { orderBy: 'price', order: 'asc' },
  'price-desc': { orderBy: 'price', order: 'desc' },
  name: { orderBy: 'name', order: 'asc' },
}

export function CatalogPage() {
  const config = useStorefrontConfig()
  const catalog = useCatalogStore()

  const providerOpts: ListProductsOptions = {
    status: 'active',
    categoryId: catalog.categoryId ?? undefined,
    search: catalog.search || undefined,
    ...SORT_MAP[catalog.sort],
  }
  const { products, loading } = useProducts(providerOpts)

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
          <ProductGrid products={filtered} loading={loading} />
        </div>
      </div>
    </main>
  )
}
