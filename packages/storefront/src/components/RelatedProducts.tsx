import React from 'react'
import type { ListProductsOptions, Product } from '@fayz-ai/shop/types'
import { useProducts } from '../hooks/useProducts'
import { getStorefrontComponents, useStorefrontConfig } from '../config'
import { useStorefrontActions } from '../hooks/useStorefront'
import { ProductCard } from './ProductCard'

/** "Você também pode gostar" — products from the same category, excluding the
 *  current one. Renders through the store's configured card component for visual
 *  consistency with the catalog. Hidden when there's nothing relevant. */
export function RelatedProducts({ product }: { product: Product }) {
  const config = useStorefrontConfig()
  const actions = useStorefrontActions()
  const components = getStorefrontComponents(config)
  const Card = components.ProductCard ?? ProductCard
  const opts: ListProductsOptions = product.categoryId
    ? { categoryId: product.categoryId, status: 'active', limit: 5 }
    : { status: 'active', limit: 5 }
  const { products, loading } = useProducts(opts)
  const related = products.filter((p) => p.id !== product.id).slice(0, 4)

  if (loading || related.length === 0) return null

  return (
    <section className="mt-16">
      <h2 className="sf-heading text-xl font-semibold tracking-tight">Você também pode gostar</h2>
      <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-4">
        {related.map((p) => (
          <Card
            key={p.id}
            product={p}
            config={config}
            commerceMode={config.commerceMode}
            actions={actions}
          />
        ))}
      </div>
    </section>
  )
}
