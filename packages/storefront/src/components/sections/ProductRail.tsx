import React, { useMemo } from 'react'
import { useProducts } from '../../hooks/useProducts'
import { getStorefrontComponents, useStorefrontConfig } from '../../config'
import { useStorefrontActions } from '../../hooks/useStorefront'
import { ProductCard } from '../ProductCard'
import { Reveal } from '../../motion'
import { Link } from '../../router'
import { TID } from '../../testids'

export function ProductRail({
  title,
  subtitle,
  eyebrow,
  filter = 'all',
  limit = 4,
}: {
  title: string
  subtitle?: string
  eyebrow?: string
  filter?: 'sale' | 'new' | 'all'
  limit?: number
}) {
  const config = useStorefrontConfig()
  const actions = useStorefrontActions()
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
    return list.slice(0, limit)
  }, [products, filter, limit])

  if (!loading && visible.length === 0) return null

  return (
    <section data-testid={TID.productRail} className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <Reveal className="mb-10 text-center">
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        )}
        <h2 className="sf-heading text-3xl font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
      </Reveal>
      {loading ? (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {Array.from({ length: limit }, (_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse bg-muted" style={{ borderRadius: 'var(--sf-radius-card)' }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {visible.map((p, i) => (
            <Reveal key={p.id} delay={i * 90}>
              <ProductCardComponent
                product={p}
                config={config}
                commerceMode={config.commerceMode}
                actions={actions}
              />
            </Reveal>
          ))}
        </div>
      )}
      <Reveal className="mt-10 text-center" delay={200}>
        <Link
          to={config.catalogPath}
          className="sf-cta inline-block border border-foreground/30 px-7 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:bg-foreground hover:text-background hover:shadow"
          style={{ borderRadius: 'var(--sf-radius-button)' }}
        >
          Ver tudo
        </Link>
      </Reveal>
    </section>
  )
}
