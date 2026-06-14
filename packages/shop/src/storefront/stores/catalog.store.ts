import { create } from 'zustand'

export type CatalogSort = 'newest' | 'price-asc' | 'price-desc' | 'name'

export interface CatalogState {
  search: string
  categoryId: string | null
  priceMin: number | null
  priceMax: number | null
  inStockOnly: boolean
  sort: CatalogSort
  setSearch(search: string): void
  setCategoryId(categoryId: string | null): void
  setPriceMin(priceMin: number | null): void
  setPriceMax(priceMax: number | null): void
  setInStockOnly(inStockOnly: boolean): void
  setSort(sort: CatalogSort): void
  reset(): void
}

const initial = {
  search: '',
  categoryId: null,
  priceMin: null,
  priceMax: null,
  inStockOnly: false,
  sort: 'newest' as CatalogSort,
}

export const useCatalogStore = create<CatalogState>()((set) => ({
  ...initial,
  setSearch: (search) => set({ search }),
  setCategoryId: (categoryId) => set({ categoryId }),
  setPriceMin: (priceMin) => set({ priceMin }),
  setPriceMax: (priceMax) => set({ priceMax }),
  setInStockOnly: (inStockOnly) => set({ inStockOnly }),
  setSort: (sort) => set({ sort }),
  reset: () => set(initial),
}))
