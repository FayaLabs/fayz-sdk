import type { CrudQuery, CrudResult, DataProvider } from '@fayz-ai/core'
import type { CreateProductInput, Product, UpdateProductInput } from '@fayz-ai/shop'
import { slugify } from '../views/productEntity'
import { applyQuery, resolve, type ShopProviderResolver } from './shared'

export type { ShopProviderResolver }

// ---------------------------------------------------------------------------
// Bridges the generic CRUD scaffolding (DataProvider) to the shop provider, so
// the product screens are the same createCrudPage machinery every other module
// uses instead of a bespoke form.
//
// Which shop provider is injected decides whether writes work at all:
//   • createSupabaseShopProvider — authenticates as the merchant (their JWT),
//     full CRUD, subject to the tenant-member RLS policies.
//   • createFayzShopProvider — the storefront's anonymous REST client. Reads
//     work; every write throws FayzShopError 501 by design. The form surfaces
//     that message rather than pretending the save succeeded.
// ---------------------------------------------------------------------------

export function createShopProductDataProvider(provider: ShopProviderResolver): DataProvider<Product> {
  return {
    async list(query: CrudQuery): Promise<CrudResult<Product>> {
      const rows = await resolve(provider).listProducts(
        query.search ? { search: query.search } : undefined,
      )
      return applyQuery(rows, query, 'status')
    },

    async create(data): Promise<Product> {
      const input = data as unknown as Partial<Product>
      // The storefront URL is required by the table's UNIQUE(tenant_id, slug);
      // deriving it from the name keeps the merchant from having to know that.
      const slug = input.slug?.trim() || slugify(String(input.name ?? ''))
      return resolve(provider).createProduct({
        ...(input as CreateProductInput),
        slug,
      } as CreateProductInput)
    },

    async update(id: string, data: Partial<Product>): Promise<Product> {
      const patch = { ...data }
      if (patch.slug !== undefined && !String(patch.slug).trim()) {
        // Cleared on purpose → regenerate rather than write an empty slug.
        patch.slug = slugify(String(patch.name ?? ''))
      }
      return resolve(provider).updateProduct(id, patch as UpdateProductInput)
    },

    async remove(id: string): Promise<void> {
      await resolve(provider).deleteProduct(id)
    },
  }
}
