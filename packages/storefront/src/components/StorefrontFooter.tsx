import React from 'react'
import { useStorefrontConfig } from '../config'
import { useCategories } from '../hooks/useCategories'
import { useCatalogStore } from '../stores/catalog.store'
import { Link, navigateTo } from '../router'

export function StorefrontFooter() {
  const config = useStorefrontConfig()
  const { categories } = useCategories()
  const visibleCategories = categories.slice(0, 8)
  const hiddenCategoryCount = Math.max(categories.length - visibleCategories.length, 0)

  const goCategory = (categoryId: string) => {
    useCatalogStore.getState().reset()
    useCatalogStore.getState().setCategoryId(categoryId)
    navigateTo(config.catalogPath)
  }

  return (
    <footer className="mt-16 border-t bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <p className="sf-heading text-lg font-bold">{config.name}</p>
          {config.footer?.about && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{config.footer.about}</p>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Departamentos</h3>
          <ul className="space-y-2 text-sm">
            {visibleCategories.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => goCategory(c.id)}
                  className="max-w-full truncate text-left transition-opacity hover:opacity-70"
                >
                  {c.name}
                </button>
              </li>
            ))}
            {hiddenCategoryCount > 0 && (
              <li>
                <Link to={config.catalogPath} className="font-medium underline-offset-2 transition-opacity hover:underline">
                  Ver todos ({categories.length})
                </Link>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Navegação</h3>
          <ul className="space-y-2 text-sm">
            {config.nav.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="transition-opacity hover:opacity-70">{link.label}</Link>
              </li>
            ))}
            <li>
              <Link to="/account" className="transition-opacity hover:opacity-70">Minhas compras</Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Contato</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {config.footer?.contact?.phone && <li>{config.footer.contact.phone}</li>}
            {config.footer?.contact?.email && <li>{config.footer.contact.email}</li>}
            {config.footer?.contact?.address && <li>{config.footer.contact.address}</li>}
            {config.footer?.social?.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noreferrer" className="transition-opacity hover:opacity-70">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link to="/privacy" className="transition-colors hover:text-foreground">Privacidade</Link>
            <Link to="/terms" className="transition-colors hover:text-foreground">Termos</Link>
            <Link to="/refunds" className="transition-colors hover:text-foreground">Trocas e devoluções</Link>
          </nav>
          <p className="text-center">
            © {config.name} — powered by Fayz · Fotos:{' '}
            <a href="https://unsplash.com" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
              Unsplash
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
