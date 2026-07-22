import type { CrudQuery, CrudResult, DataProvider } from '@fayz-ai/core'
import type { CreateCustomerInput, ShopCustomer, UpdateCustomerInput } from '@fayz-ai/shop'
import { applyQuery, resolve, type ShopProviderResolver } from './shared'

export function createShopCustomerDataProvider(
  provider: ShopProviderResolver,
): DataProvider<ShopCustomer> {
  return {
    async list(query: CrudQuery): Promise<CrudResult<ShopCustomer>> {
      const rows = await resolve(provider).listCustomers(
        query.search ? { search: query.search } : undefined,
      )
      return applyQuery(rows, query)
    },

    async create(data): Promise<ShopCustomer> {
      return resolve(provider).createCustomer(data as unknown as CreateCustomerInput)
    },

    async update(id: string, data: Partial<ShopCustomer>): Promise<ShopCustomer> {
      // ordersCount / totalSpent are trigger-maintained (shop_refresh_customer_stats);
      // never send them back or a stale form value would fight the database.
      const { ordersCount: _o, totalSpent: _t, ...patch } = data
      return resolve(provider).updateCustomer(id, patch as UpdateCustomerInput)
    },

    async remove(id: string): Promise<void> {
      await resolve(provider).deleteCustomer(id)
    },
  }
}
