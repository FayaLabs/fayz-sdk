import React from 'react'
import { useCategories } from '../../hooks/useCategories'
import { useCatalogStore } from '../../stores/catalog.store'
import { useStorefrontConfig } from '../../config'
import { bannerPlaceholder } from '../../sections'
import { Reveal } from '../../motion'
import { navigateTo } from '../../router'
import { TID } from '../../testids'

export function CategoryShowcase({ style, title }: { style: 'bubbles' | 'tiles'; title?: string }) {
  const { categories } = useCategories()
  const config = useStorefrontConfig()
  const setCategoryId = useCatalogStore((s) => s.setCategoryId)

  if (categories.length === 0) return null

  const go = (categoryId: string) => {
    useCatalogStore.getState().reset()
    setCategoryId(categoryId)
    navigateTo(config.catalogPath)
  }

  if (style === 'bubbles') {
    return (
      <section data-testid={TID.categoryShowcase} className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {title && (
          <Reveal>
            <h2 className="sf-heading mb-8 text-center text-3xl font-bold">{title}</h2>
          </Reveal>
        )}
        <div className="flex flex-wrap items-start justify-center gap-8">
          {categories.map((c, i) => (
            <Reveal key={c.id} delay={i * 80}>
              <button type="button" onClick={() => go(c.id)} className="group flex w-28 flex-col items-center gap-3">
                <span className="block h-24 w-24 overflow-hidden rounded-full border-2 border-transparent shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:border-primary group-hover:shadow-md">
                  <img
                    src={c.imageUrl ?? bannerPlaceholder(c.name, 30 + i * 70, 70 + i * 70, 200, 200)}
                    alt={c.name}
                    className="h-full w-full object-cover"
                  />
                </span>
                <span className="text-center text-xs font-medium leading-tight">{c.name}</span>
              </button>
            </Reveal>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section data-testid={TID.categoryShowcase} className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      {title && (
        <Reveal>
          <h2 className="sf-heading mb-8 text-center text-3xl font-bold">{title}</h2>
        </Reveal>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {categories.map((c, i) => (
          <Reveal key={c.id} delay={i * 90}>
            <button type="button" onClick={() => go(c.id)} className="group relative block aspect-[4/5] w-full overflow-hidden" style={{ borderRadius: 'var(--sf-radius-card)' }}>
              <img
                src={c.imageUrl ?? bannerPlaceholder(c.name, 30 + i * 70, 70 + i * 70, 480, 600)}
                alt={c.name}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-5 pt-12 text-left">
                <span className="sf-heading block text-lg font-semibold text-white">{c.name}</span>
                <span className="mt-0.5 block text-xs text-white/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  Explorar →
                </span>
              </span>
            </button>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
