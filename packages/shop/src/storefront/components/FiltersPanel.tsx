import React from 'react'
import { useCatalogStore } from '../stores/catalog.store'
import type { CatalogSort } from '../stores/catalog.store'
import { useCategories } from '../hooks/useCategories'
import { TID } from '../testids'

export function FiltersPanel() {
  const { categories } = useCategories()
  const catalog = useCatalogStore()

  return (
    <aside className="w-full shrink-0 space-y-6 lg:w-56">
      {/* Sort */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Ordenar por</h3>
        <select
          data-testid={TID.sortSelect}
          value={catalog.sort}
          onChange={(e) => catalog.setSort(e.target.value as CatalogSort)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="newest">Mais recentes</option>
          <option value="price-asc">Menor preço</option>
          <option value="price-desc">Maior preço</option>
          <option value="name">Nome (A–Z)</option>
        </select>
      </div>

      {/* Categories */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Categorias</h3>
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={() => catalog.setCategoryId(null)}
              className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                catalog.categoryId === null ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-muted'
              }`}
            >
              Todas
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                data-testid={TID.filterCategory(c.slug)}
                onClick={() => catalog.setCategoryId(catalog.categoryId === c.id ? null : c.id)}
                className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  catalog.categoryId === c.id ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-muted'
                }`}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Price range */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Preço</h3>
        <div className="flex items-center gap-2">
          <input
            data-testid={TID.filterPriceMin}
            type="number"
            placeholder="Mín"
            min={0}
            value={catalog.priceMin ?? ''}
            onChange={(e) => catalog.setPriceMin(e.target.value === '' ? null : Number(e.target.value))}
            className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm"
          />
          <span className="text-muted-foreground">–</span>
          <input
            data-testid={TID.filterPriceMax}
            type="number"
            placeholder="Máx"
            min={0}
            value={catalog.priceMax ?? ''}
            onChange={(e) => catalog.setPriceMax(e.target.value === '' ? null : Number(e.target.value))}
            className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* Availability */}
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          data-testid={TID.filterInstock}
          type="checkbox"
          checked={catalog.inStockOnly}
          onChange={(e) => catalog.setInStockOnly(e.target.checked)}
          className="h-4 w-4 rounded border"
        />
        Somente em estoque
      </label>

      <button
        type="button"
        data-testid={TID.filtersClear}
        onClick={() => catalog.reset()}
        className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Limpar filtros
      </button>
    </aside>
  )
}
