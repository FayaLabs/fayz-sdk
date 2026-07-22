import type { CrudQuery, CrudResult, DataProvider } from '@fayz-ai/core'
import type { CreateDiscountInput, Discount, UpdateDiscountInput } from '@fayz-ai/shop'
import { applyQuery, resolve, type ShopProviderResolver } from './shared'

export function createShopDiscountDataProvider(
  provider: ShopProviderResolver,
): DataProvider<Discount> {
  return {
    async list(query: CrudQuery): Promise<CrudResult<Discount>> {
      const rows = await resolve(provider).listDiscounts()
      const term = query.search?.trim().toLowerCase()
      const filtered = term
        ? rows.filter((d) =>
            d.title.toLowerCase().includes(term) || (d.code ?? '').toLowerCase().includes(term))
        : rows
      return applyQuery(filtered, query, 'status')
    },

    async create(data): Promise<Discount> {
      const input = data as unknown as Partial<Discount>
      return resolve(provider).createDiscount({
        ...(input as CreateDiscountInput),
        // Codes are matched case-insensitively server-side; store them upper so
        // the admin list reads consistently.
        code: input.code ? String(input.code).trim().toUpperCase() : undefined,
      } as CreateDiscountInput)
    },

    async update(id: string, data: Partial<Discount>): Promise<Discount> {
      // timesUsed is incremented by shop_place_order inside the order transaction.
      const { timesUsed: _used, ...patch } = data
      if (patch.code !== undefined) {
        patch.code = patch.code ? String(patch.code).trim().toUpperCase() : null
      }
      return resolve(provider).updateDiscount(id, patch as UpdateDiscountInput)
    },

    async remove(id: string): Promise<void> {
      await resolve(provider).deleteDiscount(id)
    },
  }
}
