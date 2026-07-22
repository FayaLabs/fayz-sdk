import type { CrudQuery, CrudResult, DataProvider } from '@fayz-ai/core'
import type { CreateShippingZoneInput, ShippingZone, UpdateShippingZoneInput } from '@fayz-ai/shop'
import { applyQuery, resolve, type ShopProviderResolver } from './shared'

/**
 * Delivery zones CRUD.
 *
 * The form takes CEPs however the merchant types them ('22.041-001', '22041001')
 * and the provider normalises to the 8 bare digits shipping_zones compares on —
 * asking a shop owner to strip punctuation is how a range silently stops
 * matching and a whole city stops being served.
 */
export function createShopShippingZoneDataProvider(
  provider: ShopProviderResolver,
): DataProvider<ShippingZone> {
  const shop = () => {
    const p = resolve(provider)
    if (!p.listShippingZones) {
      throw new Error('Este provider de loja não suporta zonas de entrega.')
    }
    return p
  }

  return {
    async list(query: CrudQuery): Promise<CrudResult<ShippingZone>> {
      const rows = await shop().listShippingZones!()
      const term = query.search?.trim().toLowerCase()
      const filtered = term
        ? rows.filter((z) =>
            z.name.toLowerCase().includes(term) || (z.carrier ?? '').toLowerCase().includes(term))
        : rows
      return applyQuery(filtered, query)
    },

    async create(data): Promise<ShippingZone> {
      return shop().createShippingZone!(data as unknown as CreateShippingZoneInput)
    },

    async update(id: string, data: Partial<ShippingZone>): Promise<ShippingZone> {
      // tenantId is set from the session on the server side; never from the form.
      const { id: _id, tenantId: _tenant, ...patch } = data
      return shop().updateShippingZone!(id, patch as UpdateShippingZoneInput)
    },

    async remove(id: string): Promise<void> {
      await shop().deleteShippingZone!(id)
    },
  }
}
