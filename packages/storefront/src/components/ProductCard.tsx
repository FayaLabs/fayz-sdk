import React from 'react'
import { ShoppingBag } from 'lucide-react'
import type { Product } from '@fayz-ai/shop/types'
import { useCartStore } from '../stores/cart.store'
import { useStorefrontConfig } from '../config'
import { Link, navigateTo } from '../router'
import { getProductOptionGroups } from '../product-options'
import { Price } from './Price'
import { TID } from '../testids'
import { productCardSlotContract } from '../slot-contracts'

export interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const config = useStorefrontConfig()
  const addItem = useCartStore((s) => s.addItem)
  const hasOptions = getProductOptionGroups(product).length > 0
  const soldOut = product.inventoryCount <= 0
  const onSale = product.compareAtPrice != null && product.compareAtPrice > product.price
  const image = product.images.find((i) => i.isPrimary) ?? product.images[0]
  const cardStyle = config.theme?.productCard?.style ?? 'card'
  const aspect = config.theme?.productCard?.imageAspect === 'portrait' ? 'aspect-[3/4]' : 'aspect-square'

  return (
    <div
      {...productCardSlotContract.root}
      data-slug={product.slug}
      className={`group flex flex-col overflow-hidden transition-all duration-300 ${
        cardStyle === 'editorial'
          ? 'hover:-translate-y-1'
          : 'border bg-card hover:-translate-y-1 hover:shadow-lg'
      }`}
      style={{ borderRadius: 'var(--sf-radius-card)' }}
    >
      <Link to={`/product/${product.slug}`} className={`relative block ${aspect} overflow-hidden bg-muted`} style={{ borderRadius: cardStyle === 'editorial' ? 'var(--sf-radius-card)' : undefined }}>
        {image && (
          <img
            src={image.url}
            alt={image.altText ?? product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          {onSale && !soldOut && (
            <span
              data-testid={TID.badgeSale}
              className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white"
            >
              Oferta
            </span>
          )}
          {soldOut && (
            <span
              data-testid={TID.badgeSoldout}
              className="rounded-full bg-gray-900/80 px-2.5 py-0.5 text-xs font-semibold text-white"
            >
              Esgotado
            </span>
          )}
        </div>
      </Link>

      <div className={`flex flex-1 flex-col gap-1 ${cardStyle === 'editorial' ? 'px-1 py-3' : 'p-4'}`}>
        <span className="text-xs text-muted-foreground">{product.categoryName}</span>
        <Link
          to={`/product/${product.slug}`}
          {...productCardSlotContract.name}
          className="font-medium leading-snug hover:underline"
        >
          {product.name}
        </Link>
        <div className="mt-auto flex items-center justify-between pt-2">
          <Price
            value={product.price}
            compareAt={product.compareAtPrice}
            testId={productCardSlotContract.priceTestId}
          />
          <button
            type="button"
            {...productCardSlotContract.addButton}
            disabled={soldOut}
            aria-label={hasOptions ? `Escolher opções de ${product.name}` : `Adicionar ${product.name} ao carrinho`}
            onClick={() => {
              // Products with variants (size/color) must pick an option on the PDP
              // — quick-adding would create an option-less line. Others add inline
              // (addItem auto-opens the cart drawer).
              if (hasOptions) {
                navigateTo(`/product/${product.slug}`)
                return
              }
              addItem(product)
            }}
            className="rounded-full border bg-background/90 p-2.5 text-foreground shadow-sm transition-all duration-200 hover:scale-110 hover:bg-primary hover:text-primary-foreground hover:shadow disabled:cursor-not-allowed disabled:opacity-40 lg:translate-y-1 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100 lg:disabled:opacity-0 lg:group-hover:disabled:opacity-40"
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
