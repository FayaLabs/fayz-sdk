import React from 'react'
import { ShoppingBag } from 'lucide-react'
import type { Product } from '@fayz/shop'
import { useCartStore } from '../stores/cart.store'
import { useStorefrontConfig } from '../config'
import { Link } from '../router'
import { Price } from './Price'
import { TID } from '../testids'

export function ProductCard({ product }: { product: Product }) {
  const config = useStorefrontConfig()
  const addItem = useCartStore((s) => s.addItem)
  const openDrawer = useCartStore((s) => s.openDrawer)
  const soldOut = product.inventoryCount <= 0
  const onSale = product.compareAtPrice != null && product.compareAtPrice > product.price
  const image = product.images.find((i) => i.isPrimary) ?? product.images[0]
  const cardStyle = config.theme?.productCard?.style ?? 'card'
  const aspect = config.theme?.productCard?.imageAspect === 'portrait' ? 'aspect-[3/4]' : 'aspect-square'

  return (
    <div
      data-testid={TID.productCard}
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
          data-testid={TID.productCardName}
          className="font-medium leading-snug hover:underline"
        >
          {product.name}
        </Link>
        <div className="mt-auto flex items-center justify-between pt-2">
          <Price
            value={product.price}
            compareAt={product.compareAtPrice}
            testId={TID.productCardPrice}
          />
          <button
            type="button"
            data-testid={TID.productCardAdd}
            disabled={soldOut}
            aria-label={`Adicionar ${product.name} ao carrinho`}
            onClick={() => {
              addItem(product)
              openDrawer()
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
