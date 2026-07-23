import type { ShopProvider } from '@fayz-ai/shop'

/**
 * Feeds the shared PersonLink popover from the shop's own customer table.
 * The default lookup reads the `person` archetype (`people`), where a shop
 * customer does not exist — so without this the card would come up empty.
 */
export function shopCustomerLookup(provider: () => ShopProvider) {
  return {
    async getById(id: string) {
      const c = await provider().getCustomer(id)
      if (!c) return null
      const name = [c.firstName, c.lastName].filter(Boolean).join(' ')
      return {
        id: c.id,
        label: name || c.email || 'Cliente',
        subtitle: c.email ?? undefined,
        group: 'shop_customer',
        // PersonLink reads contact fields off `data`, so the keys must match the
        // shape it expects (email/phone), not our camelCase type.
        data: {
          email: c.email ?? undefined,
          phone: c.phone ?? undefined,
          kind: 'shop_customer',
          orders_count: c.ordersCount,
          total_spent: c.totalSpent,
        },
      }
    },
  }
}
