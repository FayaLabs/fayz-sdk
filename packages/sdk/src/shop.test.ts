import { describe, expect, it, vi } from 'vitest'

import { createFayzShopProvider } from './shop'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function productRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-1',
    tenant_id: 'store-1',
    name: 'Runner Vortex Neon',
    slug: 'runner-vortex-neon',
    sku: 'SNK-001',
    price: 499.9,
    metadata: {},
    images: [],
    ...overrides,
  }
}

describe('createFayzShopProvider', () => {
  it('uses the Fayz broker without provider credentials when apiBaseUrl and projectId are provided', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      products: [{
        id: 'prod-1',
        tenantId: 'store-1',
        name: 'Aurora Tote',
        slug: 'aurora-tote',
        sku: 'BAG-001',
        price: 149.9,
        metadata: {},
        images: [],
        category: { id: 'cat-1', name: 'Bags' },
      }],
    }))

    const provider = createFayzShopProvider({
      apiBaseUrl: 'http://localhost:5173/api',
      projectId: 'project-1',
      fetcher,
    })

    const [product] = await provider.listProducts({ status: 'active', limit: 4 })

    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:5173/api/public/projects/project-1/shop/products?status=active&limit=4',
      {},
    )
    expect(product?.categoryId).toBe('cat-1')
    expect(product?.categoryName).toBe('Bags')
  })

  it('merges app-owned product metadata overlays into listed products', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([
      productRow({
        metadata: {
          colorway: 'Backend wins',
        },
      }),
    ]))

    const provider = createFayzShopProvider({
      supabaseUrl: 'https://example.supabase.co',
      publishableKey: 'publishable-key',
      storeId: 'store-1',
      productMetadata: [
        {
          sku: 'SNK-001',
          slug: 'runner-vortex-neon',
          metadata: {
            colorway: 'Overlay loses',
            sizes: ['38', '39', '40'],
          },
        },
      ],
      fetcher,
    })

    const [product] = await provider.listProducts({ status: 'active' })

    expect(product?.metadata.sizes).toEqual(['38', '39', '40'])
    expect(product?.metadata.colorway).toBe('Backend wins')
  })

  it('uses slug overlays when fetching a single product', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([
      productRow({ sku: null }),
    ]))

    const provider = createFayzShopProvider({
      supabaseUrl: 'https://example.supabase.co',
      publishableKey: 'publishable-key',
      storeId: 'store-1',
      productMetadata: [
        {
          slug: 'runner-vortex-neon',
          metadata: {
            sizes: ['40', '41'],
          },
        },
      ],
      fetcher,
    })

    const product = await provider.getProduct('prod-1')

    expect(product?.metadata.sizes).toEqual(['40', '41'])
  })
})
