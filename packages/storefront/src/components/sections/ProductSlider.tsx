import React, { useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getStorefrontComponents, useStorefrontConfig } from '../../config'
import { useProducts } from '../../hooks/useProducts'
import { useStorefrontActions } from '../../hooks/useStorefront'
import { ProductCard } from '../ProductCard'
import { Link } from '../../router'
import { TID } from '../../testids'

export interface ProductSliderProps {
  title: string
  subtitle?: string
  eyebrow?: string
  filter?: 'sale' | 'new' | 'all'
  categoryName?: string
  collection?: string
  limit?: number
  cta?: string
  href?: string
  className?: string
}

export function ProductSlider({
  title,
  subtitle,
  eyebrow,
  filter = 'all',
  categoryName,
  collection,
  limit = 10,
  cta = 'View all',
  href,
  className = '',
}: ProductSliderProps) {
  const config = useStorefrontConfig()
  const actions = useStorefrontActions()
  const viewportRef = useRef<HTMLDivElement>(null)
  const components = getStorefrontComponents(config)
  const ProductCardComponent = components.ProductCard ?? ProductCard
  const { products, loading } = useProducts(
    filter === 'new'
      ? { status: 'active', orderBy: 'created_at', order: 'desc' }
      : { status: 'active' },
  )

  const visible = useMemo(() => {
    let list = products
    if (filter === 'sale') list = list.filter((p) => p.compareAtPrice != null && p.compareAtPrice > p.price)
    if (categoryName) list = list.filter((p) => p.categoryName === categoryName)
    if (collection) list = list.filter((p) => p.metadata?.collection === collection)
    return list.slice(0, limit)
  }, [categoryName, collection, filter, limit, products])

  const scroll = (direction: -1 | 1) => {
    viewportRef.current?.scrollBy({ left: direction * Math.max(320, viewportRef.current.clientWidth * 0.75), behavior: 'smooth' })
  }

  if (!loading && visible.length === 0) return null

  return (
    <section data-testid={TID.productSlider} className={`mx-auto max-w-7xl px-4 py-14 sm:px-6 ${className}`}>
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>}
          <h2 className="sf-heading text-3xl font-normal leading-tight tracking-normal sm:text-5xl">{title}</h2>
          {subtitle && <p className="mt-3 leading-7 text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous products"
            data-testid={TID.productSliderPrev}
            onClick={() => scroll(-1)}
            className="inline-flex h-10 w-10 items-center justify-center border border-border bg-background transition hover:bg-foreground hover:text-background"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next products"
            data-testid={TID.productSliderNext}
            onClick={() => scroll(1)}
            className="inline-flex h-10 w-10 items-center justify-center border border-border bg-background transition hover:bg-foreground hover:text-background"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div
        ref={viewportRef}
        data-testid={TID.productSliderViewport}
        className="flex snap-x gap-5 overflow-x-auto pb-5 [scrollbar-width:thin]"
      >
        {loading
          ? Array.from({ length: Math.min(limit, 6) }, (_, i) => (
              <div key={i} className="h-[360px] min-w-[260px] snap-start animate-pulse bg-muted" />
            ))
          : visible.map((product) => (
              <div key={product.id} className="min-w-[260px] max-w-[300px] flex-[0_0_72vw] snap-start sm:flex-[0_0_300px]">
                <ProductCardComponent
                  product={product}
                  config={config}
                  commerceMode={config.commerceMode}
                  actions={actions}
                />
              </div>
            ))}
      </div>
      {cta && (
        <Link
          to={href ?? config.catalogPath}
          className="mt-4 inline-flex border border-foreground/30 px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition hover:bg-foreground hover:text-background"
        >
          {cta}
        </Link>
      )}
    </section>
  )
}
