import React, { useState } from 'react'
import { CreditCard, LogOut, Mail, Menu, Package, Phone, Search, ShoppingBag, User, UserCircle, X } from 'lucide-react'
import { signOutCustomer } from '../auth'
import { useCartStore, selectCount } from '../stores/cart.store'
import { useCatalogStore } from '../stores/catalog.store'
import { useSessionStore } from '../stores/session.store'
import { useCategories } from '../hooks/useCategories'
import { useStorefrontConfig } from '../config'
import { useScrolled, usePopOnChange } from '../motion'
import { Link, navigateTo, useHashPath } from '../router'
import { TID } from '../testids'

// Header tokens come from the theme (--sf-header-bg/fg) so dark headers
// (Brasília pattern) work without component changes. Dividers derive from the
// header FOREGROUND (not the page --border token, which is light and shows as
// white lines on dark headers).
const headerStyle: React.CSSProperties = {
  backgroundColor: 'hsl(var(--sf-header-bg, var(--background)))',
  color: 'hsl(var(--sf-header-fg, var(--foreground)))',
  borderColor: 'hsl(var(--sf-header-fg, var(--foreground)) / 0.14)',
}

const headerDivider: React.CSSProperties = {
  borderColor: 'hsl(var(--sf-header-fg, var(--foreground)) / 0.14)',
}

const ANNOUNCEMENT_KEY = 'fayz.storefront.announcement.dismissed'

function AnnouncementBar() {
  const config = useStorefrontConfig()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(ANNOUNCEMENT_KEY) === config.announcement
    } catch {
      return false
    }
  })
  if (!config.announcement || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(ANNOUNCEMENT_KEY, config.announcement ?? '')
    } catch {
      /* storage unavailable — dismiss for this session only */
    }
  }

  return (
    <div
      data-testid={TID.announcementBar}
      className="relative px-4 py-2 text-center text-xs font-semibold tracking-wide"
      style={{
        backgroundColor: 'hsl(var(--sf-announcement-bg, var(--primary)))',
        color: 'hsl(var(--sf-announcement-fg, var(--primary-foreground)))',
      }}
    >
      {config.announcement}
      <button
        type="button"
        aria-label="Fechar aviso"
        onClick={dismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 opacity-70 transition-opacity hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
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
    <div className="hidden border-b text-xs opacity-80 md:block" style={headerDivider}>
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

function SearchInput({ className, iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  const config = useStorefrontConfig()
  const search = useCatalogStore((s) => s.search)
  const setSearch = useCatalogStore((s) => s.setSearch)
  const path = useHashPath()
  const [open, setOpen] = useState(false)

  // Icon-only: a compact search button that expands into the input on click and
  // collapses again on Escape / blur-when-empty.
  if (iconOnly && !open) {
    return (
      <button
        type="button"
        aria-label="Buscar produtos"
        data-testid={TID.headerSearchToggle}
        onClick={() => setOpen(true)}
        className="rounded-full p-2.5 transition-opacity hover:opacity-70"
      >
        <Search className="h-5 w-5" />
      </button>
    )
  }

  return (
    <div className={`relative ${iconOnly ? 'w-full max-w-xs' : (className ?? '')}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
      <input
        data-testid={TID.headerSearch}
        type="search"
        placeholder="Buscar produtos..."
        value={search}
        autoFocus={iconOnly}
        onChange={(e) => {
          setSearch(e.target.value)
          if (path !== config.catalogPath) navigateTo(config.catalogPath)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && iconOnly) setOpen(false)
        }}
        onBlur={() => {
          if (iconOnly && !search) setOpen(false)
        }}
        className="w-full border bg-white/10 py-2 pl-9 pr-4 text-sm outline-none transition-colors placeholder:opacity-60 focus:border-primary focus:bg-white focus:text-gray-900"
        style={{
          borderRadius: 'var(--sf-radius-input)',
          borderColor: 'hsl(var(--sf-header-fg, var(--foreground)) / 0.25)',
        }}
      />
    </div>
  )
}

function HeaderActions({ onMenuClick }: { onMenuClick?: () => void }) {
  const config = useStorefrontConfig()
  const count = useCartStore(selectCount)
  const openDrawer = useCartStore((s) => s.openDrawer)
  const session = useSessionStore()
  const [accountOpen, setAccountOpen] = useState(false)
  const pop = usePopOnChange(count)
  const firstName = session.name?.split(/\s+/)[0]
  const initial = (firstName ?? session.email ?? 'C').slice(0, 1).toUpperCase()
  return (
    <nav className="flex items-center gap-1">
      {config.features.accounts && (
        <div className="relative">
          {session.email ? (
            <button
              type="button"
              data-testid={TID.accountLink}
              aria-label="Abrir menu da conta"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((open) => !open)}
              className="flex items-center gap-1.5 rounded-full p-1.5 transition-opacity hover:opacity-80"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {initial}
              </span>
              {firstName && (
                <span data-testid={TID.accountName} className="hidden max-w-24 truncate text-sm font-medium lg:inline">
                  {firstName}
                </span>
              )}
            </button>
          ) : (
            <Link
              to="/account"
              data-testid={TID.accountLink}
              aria-label="Minhas compras"
              className="flex items-center gap-1.5 rounded-full p-2.5 transition-opacity hover:opacity-70"
            >
              <User className="h-5 w-5" />
            </Link>
          )}
          {accountOpen && session.email && (
            <div
              data-testid={TID.accountDropdown}
              className="absolute right-0 top-full z-50 mt-3 w-72 overflow-hidden rounded-xl border bg-background text-foreground shadow-xl"
            >
              <div className="border-b p-4">
                <p className="font-semibold">{session.name || firstName || 'Cliente'}</p>
                <p className="truncate text-sm text-muted-foreground">{session.email}</p>
              </div>
              <div className="p-2">
                <Link to="/account" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-muted">
                  <UserCircle className="h-4 w-4" />
                  Perfil
                </Link>
                <Link to="/account" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-muted">
                  <Package className="h-4 w-4" />
                  Meus pedidos
                </Link>
                <Link to="/account" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-muted">
                  <CreditCard className="h-4 w-4" />
                  Pagamentos
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen(false)
                    void signOutCustomer()
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-muted"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {config.features.cart && (
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
      )}
      {onMenuClick && (
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={onMenuClick}
          className="relative rounded-full p-2.5 transition-opacity hover:opacity-70 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
    </nav>
  )
}

function NavLinks({ className }: { className?: string }) {
  const config = useStorefrontConfig()
  const { categories } = useCategories()
  const setCategoryId = useCatalogStore((s) => s.setCategoryId)
  const showCategories = config.theme?.header?.showCategories !== false

  const goCategory = (categoryId: string) => {
    useCatalogStore.getState().reset()
    setCategoryId(categoryId)
    navigateTo(config.catalogPath)
  }

  return (
    <nav className={`flex min-w-max items-center gap-6 ${className ?? ''}`}>
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
      {showCategories &&
        categories.slice(0, 6).map((c) => (
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

function MobileMenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const config = useStorefrontConfig()
  const { categories } = useCategories()
  const setCategoryId = useCatalogStore((s) => s.setCategoryId)
  const showCategories = config.theme?.header?.showCategories !== false

  const goCategory = (categoryId: string) => {
    useCatalogStore.getState().reset()
    setCategoryId(categoryId)
    navigateTo(config.catalogPath)
    onClose()
  }

  // a11y: close on Escape
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="absolute inset-0 animate-fade-in bg-black/40"
        aria-hidden
        onClick={onClose}
      />
      <div
        data-testid="mobile-menu-drawer"
        role="dialog"
        aria-label="Menu Principal"
        className="absolute right-0 top-0 flex h-full w-full max-w-[280px] animate-slide-in-from-right flex-col bg-background shadow-2xl"
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold">Menu</h2>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <nav className="flex flex-col gap-4">
            {config.nav.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={onClose}
                className="text-base font-semibold transition-opacity hover:opacity-70"
              >
                {link.label}
              </Link>
            ))}
            {showCategories && categories.length > 0 && (
              <>
                <div className="my-2 border-t" />
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Categorias
                </div>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => goCategory(c.id)}
                    className="text-left text-sm font-medium transition-opacity hover:opacity-80"
                  >
                    {c.name}
                  </button>
                ))}
              </>
            )}
          </nav>
        </div>
      </div>
    </div>
  )
}

export function StorefrontHeader() {
  const config = useStorefrontConfig()
  const variant = config.theme?.header?.variant ?? 'classic'
  const scrolled = useScrolled()
  const showSearch = config.theme?.header?.showSearch !== false
  const iconSearch = config.theme?.header?.searchStyle === 'icon'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
            {showSearch ? <SearchInput iconOnly={iconSearch} className="hidden w-full max-w-xs sm:block" /> : <div />}
            <div className="text-center">{logo}</div>
            <div className="justify-self-end">
              <HeaderActions />
            </div>
          </div>
          <div className="flex overflow-x-auto border-t py-2.5 sm:justify-center" style={headerDivider}>
            <NavLinks />
          </div>
        </>
      ) : variant === 'search' ? (
        // Brasília pattern: prominent search left, logo center, actions right; nav row below
        <>
          <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-6 px-4 sm:px-6">
            {showSearch ? <SearchInput iconOnly={iconSearch} className="hidden w-full max-w-sm sm:block" /> : <div />}
            <div className="text-center">{logo}</div>
            <div className="justify-self-end">
              <HeaderActions />
            </div>
          </div>
          <div className="overflow-x-auto border-t" style={headerDivider}>
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
            {showSearch && <SearchInput iconOnly={iconSearch} className="hidden w-44 lg:block" />}
            <HeaderActions />
          </div>
        </div>
      ) : (
        // classic: logo left, nav, then a right-aligned search + actions cluster.
        // NavLinks is hidden below md in the primary row (no room for it there) —
        // below md a hamburger opens MobileMenuDrawer instead, otherwise mobile
        // has no way to reach nav/category links at all.
        <>
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
            {logo}
            <NavLinks className="hidden md:flex" />
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {showSearch && <SearchInput iconOnly={iconSearch} className={iconSearch ? '' : 'hidden w-full max-w-sm sm:block'} />}
              <HeaderActions onMenuClick={() => setMobileMenuOpen(true)} />
            </div>
          </div>
          <MobileMenuDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        </>
      )}
    </header>
  )
}
