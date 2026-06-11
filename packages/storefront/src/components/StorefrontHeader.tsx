import React from 'react'
import { Mail, Phone, Search, ShoppingBag, User } from 'lucide-react'
import { useCartStore, selectCount } from '../stores/cart.store'
import { useCatalogStore } from '../stores/catalog.store'
import { useSessionStore } from '../stores/session.store'
import { useCategories } from '../hooks/useCategories'
import { useStorefrontConfig } from '../config'
import { useScrolled, usePopOnChange } from '../motion'
import { Link, navigateTo, useHashPath } from '../router'
import { TID } from '../testids'

// Header tokens come from the theme (--sf-header-bg/fg) so dark headers
// (Brasília pattern) work without component changes.
const headerStyle: React.CSSProperties = {
  backgroundColor: 'hsl(var(--sf-header-bg, var(--background)))',
  color: 'hsl(var(--sf-header-fg, var(--foreground)))',
}

function AnnouncementBar() {
  const config = useStorefrontConfig()
  if (!config.announcement) return null
  return (
    <div
      data-testid={TID.announcementBar}
      className="px-4 py-2 text-center text-xs font-semibold tracking-wide"
      style={{
        backgroundColor: 'hsl(var(--sf-announcement-bg, var(--primary)))',
        color: 'hsl(var(--sf-announcement-fg, var(--primary-foreground)))',
      }}
    >
      {config.announcement}
    </div>
  )
}

/** Slim utility strip (Flex pattern): contact on the left, social on the right. */
function UtilityBar() {
  const config = useStorefrontConfig()
  const contact = config.footer?.contact
  const social = config.footer?.social
  if (!contact?.phone && !contact?.email && !social?.length) return null
  return (
    <div className="hidden border-b border-current/10 text-xs opacity-80 md:block">
      <div className="mx-auto flex h-8 max-w-7xl items-center gap-5 px-4 sm:px-6">
        {contact?.phone && (
          <span className="inline-flex items-center gap-1.5">
            <Phone className="h-3 w-3" /> {contact.phone}
          </span>
        )}
        {contact?.email && (
          <span className="inline-flex items-center gap-1.5">
            <Mail className="h-3 w-3" /> {contact.email}
          </span>
        )}
        <span className="ml-auto flex items-center gap-4">
          {social?.map((s) => (
            <a key={s.href} href={s.href} target="_blank" rel="noreferrer" className="hover:underline">
              {s.label}
            </a>
          ))}
        </span>
      </div>
    </div>
  )
}

function SearchInput({ className }: { className?: string }) {
  const config = useStorefrontConfig()
  const search = useCatalogStore((s) => s.search)
  const setSearch = useCatalogStore((s) => s.setSearch)
  const path = useHashPath()

  return (
    <div className={`relative ${className ?? ''}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
      <input
        data-testid={TID.headerSearch}
        type="search"
        placeholder="Buscar produtos..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          if (path !== config.catalogPath) navigateTo(config.catalogPath)
        }}
        className="w-full border border-current/20 bg-white/10 py-2 pl-9 pr-4 text-sm outline-none transition-colors placeholder:opacity-60 focus:border-primary focus:bg-white focus:text-gray-900"
        style={{ borderRadius: 'var(--sf-radius-input)' }}
      />
    </div>
  )
}

function HeaderActions() {
  const config = useStorefrontConfig()
  const count = useCartStore(selectCount)
  const openDrawer = useCartStore((s) => s.openDrawer)
  const session = useSessionStore()
  const pop = usePopOnChange(count)
  const firstName = session.name?.split(/\s+/)[0]
  return (
    <nav className="flex items-center gap-1">
      {config.features.accounts && (
        <Link
          to="/account"
          data-testid={TID.accountLink}
          aria-label="Minhas compras"
          className="flex items-center gap-1.5 rounded-full p-2.5 transition-opacity hover:opacity-70"
        >
          <User className="h-5 w-5" />
          {firstName && (
            <span data-testid={TID.accountName} className="hidden max-w-24 truncate text-sm font-medium lg:inline">
              {firstName}
            </span>
          )}
        </Link>
      )}
      <button
        type="button"
        data-testid={TID.cartButton}
        aria-label="Carrinho"
        onClick={openDrawer}
        className="relative rounded-full p-2.5 transition-opacity hover:opacity-70"
      >
        <ShoppingBag className="h-5 w-5" />
        {count > 0 && (
          <span
            data-testid={TID.cartCount}
            className={`absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground ${
              pop ? 'animate-badge-pop' : ''
            }`}
          >
            {count}
          </span>
        )}
      </button>
    </nav>
  )
}

function NavLinks({ className }: { className?: string }) {
  const config = useStorefrontConfig()
  const { categories } = useCategories()
  const setCategoryId = useCatalogStore((s) => s.setCategoryId)

  const goCategory = (categoryId: string) => {
    useCatalogStore.getState().reset()
    setCategoryId(categoryId)
    navigateTo(config.catalogPath)
  }

  return (
    <nav className={`flex items-center gap-6 ${className ?? ''}`}>
      {config.nav.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          data-testid={TID.navLink(link.label)}
          className="sf-nav-link text-sm font-medium transition-opacity hover:opacity-70"
        >
          {link.label}
        </Link>
      ))}
      {categories.slice(0, 6).map((c) => (
        <button
          key={c.id}
          type="button"
          data-testid={TID.navCategory(c.slug)}
          onClick={() => goCategory(c.id)}
          className="sf-nav-link group relative hidden text-sm font-medium transition-opacity hover:opacity-80 lg:inline"
        >
          {c.name}
          <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
        </button>
      ))}
    </nav>
  )
}

export function StorefrontHeader() {
  const config = useStorefrontConfig()
  const variant = config.theme?.header?.variant ?? 'classic'
  const scrolled = useScrolled()
  const logo = (
    <Link to="/" className="sf-heading shrink-0 text-xl font-bold tracking-tight">
      {config.logo ?? config.name}
    </Link>
  )

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-shadow duration-300 ${scrolled ? 'shadow-md' : ''}`}
      style={headerStyle}
    >
      <AnnouncementBar />
      <UtilityBar />

      {variant === 'centered' ? (
        // Rio/Flex pattern: centered logo row, nav row below
        <>
          <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6">
            <SearchInput className="hidden w-full max-w-xs sm:block" />
            <div className="text-center">{logo}</div>
            <div className="justify-self-end">
              <HeaderActions />
            </div>
          </div>
          <div className="hidden justify-center border-t border-current/10 py-2.5 sm:flex">
            <NavLinks />
          </div>
        </>
      ) : variant === 'search' ? (
        // Brasília pattern: prominent search left, logo center, actions right; nav row below
        <>
          <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-6 px-4 sm:px-6">
            <SearchInput className="hidden w-full max-w-sm sm:block" />
            <div className="text-center">{logo}</div>
            <div className="justify-self-end">
              <HeaderActions />
            </div>
          </div>
          <div className="hidden border-t border-current/10 sm:block">
            <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6">
              <NavLinks />
            </div>
          </div>
        </>
      ) : variant === 'minimal' ? (
        // Uyuni pattern: nav left, centered logo, actions right — single compact row
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6">
          <div className="flex items-center gap-5">
            <NavLinks className="hidden sm:flex" />
          </div>
          <div className="text-center">{logo}</div>
          <div className="flex items-center justify-end gap-3">
            <SearchInput className="hidden w-44 lg:block" />
            <HeaderActions />
          </div>
        </div>
      ) : (
        // classic: logo left, search center-right, actions right (original layout)
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          {logo}
          <NavLinks className="hidden md:flex" />
          <SearchInput className="ml-auto hidden w-full max-w-sm sm:block" />
          <HeaderActions />
        </div>
      )}
    </header>
  )
}
