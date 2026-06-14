import React from 'react'
import type { Product } from '@fayz-ai/shop'
import { ProductCard } from './ProductCard'
import { useStorefrontConfig } from '../config'
import { TID } from '../testids'

export function ProductGrid({ products, loading }: { products: Product[]; loading: boolean }) {
  const config = useStorefrontConfig()
  const ProductCardComponent = config.slots?.ProductCard ?? ProductCard

  if (loading) {
    return (
      <div data-testid={TID.productGrid} className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }
  if (products.length === 0) {
    return (
      <div data-testid={TID.productGrid} className="py-20 text-center text-muted-foreground">
        Nenhum produto encontrado.
      </div>
    )
  }
  return (
    <div data-testid={TID.productGrid} className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <ProductCardComponent key={p.id} product={p} />
      ))}
    </div>
  )
}
