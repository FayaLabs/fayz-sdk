import * as React from 'react'
import {
  Menu,
  Home,
  Receipt,
  ArrowLeftRight,
  Calendar,
  CreditCard,
  Settings,
  MessageCircle,
  Wallet,
  PiggyBank,
  Plus,
  type LucideIcon,
} from 'lucide-react'
import { Sidebar, type NavigationItem, type SidebarUser, type SidebarProps } from './Sidebar'
import { Topbar } from './Topbar'
import { SaveBar, SaveBarProvider } from './SaveBar'
import { useLayoutStore } from '../stores/layout.store'
import { cn } from '../utils/cn'

// ---------------------------------------------------------------------------
// Module header slot — the page top-bar exposes a DOM node that module pages
// (ModulePage 'tabs' variant) portal their title + sub-nav into, so the module
// header lives in the shell's top-of-page container (GoHighLevel style).
// ---------------------------------------------------------------------------

const ModuleHeaderSlotContext = React.createContext<HTMLElement | null>(null)

export function useModuleHeaderSlot(): HTMLElement | null {
  return React.useContext(ModuleHeaderSlotContext)
}

// Right-aligned slot for a page's primary action buttons (e.g. "New campaign").
const ModuleHeaderActionsSlotContext = React.createContext<HTMLElement | null>(null)

export function useModuleHeaderActionsSlot(): HTMLElement | null {
  return React.useContext(ModuleHeaderActionsSlotContext)
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppShellUser {
  fullName: string
  avatarUrl?: string
  email: string
}

export interface AppShellProps {
  /** Layout variant */
  variant: 'sidebar' | 'topbar' | 'minimal'
  /** Wrap the main content in an inset framed card. The sidebar is always
   *  flush/full-height (GoHighLevel style). */
  contentFrame?: boolean
  navigation?: NavigationItem[]
  logo?: React.ReactNode
  user?: AppShellUser
  children?: React.ReactNode
  onNavigate?: (route: string) => void
  onSignOut?: () => void
  onProfile?: () => void
  onSettings?: () => void
  onBilling?: () => void
  pageTitle?: string
  currentPath?: string
  userMenuExtras?: { label: string; icon?: React.ReactNode; onClick: () => void }[]
  orgSwitcher?: React.ReactNode
  topbarStart?: React.ReactNode
  topbarEnd?: React.ReactNode
  sidebarTopContent?: React.ReactNode
  sidebarFooterContent?: React.ReactNode
  bottomNav?: Array<{ label: string; icon: string; route: string }>
  /** Rendered in sidebar bottom user slot */
  userMenuSlot?: React.ReactNode
  /** Rendered in sidebar bottom notification slot */
  notificationSlot?: React.ReactNode
  /** Unread notification count */
  unreadCount?: number
}

// ---------------------------------------------------------------------------
// Sidebar layout
// ---------------------------------------------------------------------------

function SidebarLayout({
  navigation = [],
  logo,
  user,
  children,
  onNavigate,
  onSignOut,
  onProfile,
  onSettings,
  onBilling,
  userMenuExtras: _userMenuExtras,
  orgSwitcher,
  sidebarTopContent,
  sidebarFooterContent,
  frame,
  currentPath,
  pageTitle,
  topbarStart,
  topbarEnd,
  userMenuSlot,
  notificationSlot,
  unreadCount = 0,
  hasBottomNav = false,
}: {
  navigation?: NavigationItem[]
  logo?: React.ReactNode
  user?: AppShellUser
  children?: React.ReactNode
  onNavigate?: (route: string) => void
  onSignOut?: () => void
  onProfile?: () => void
  onSettings?: () => void
  onBilling?: () => void
  userMenuExtras?: AppShellProps['userMenuExtras']
  orgSwitcher?: React.ReactNode
  sidebarTopContent?: React.ReactNode
  sidebarFooterContent?: React.ReactNode
  frame?: boolean
  currentPath?: string
  pageTitle?: string
  topbarStart?: React.ReactNode
  topbarEnd?: React.ReactNode
  userMenuSlot?: React.ReactNode
  notificationSlot?: React.ReactNode
  unreadCount?: number
  /** When a mobile bottom-nav bar is present, the mobile hamburger is
   *  suppressed so the bottom nav is the primary mobile navigation. */
  hasBottomNav?: boolean
}) {
  const sidebarCollapsed = useLayoutStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useLayoutStore((s) => s.setSidebarCollapsed)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [headerSlot, setHeaderSlot] = React.useState<HTMLElement | null>(null)
  const [actionsSlot, setActionsSlot] = React.useState<HTMLElement | null>(null)

  return (
    <SaveBarProvider>
    <ModuleHeaderSlotContext.Provider value={headerSlot}>
    <ModuleHeaderActionsSlotContext.Provider value={actionsSlot}>
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar — always flush / full-height (GoHighLevel style) */}
      <div className="hidden md:flex">
        <Sidebar
          navigation={navigation}
          logo={logo}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onNavigate={onNavigate}
          currentPath={currentPath}
          user={user}
          onSignOut={onSignOut}
          onProfile={onProfile}
          onSettings={onSettings}
          onBilling={onBilling}
          orgSwitcher={orgSwitcher}
          topContent={sidebarTopContent}
          footerContent={sidebarFooterContent}
          borderless={false}
          userMenuSlot={userMenuSlot}
          notificationSlot={notificationSlot}
          unreadCount={unreadCount}
        />
      </div>

      {/* Main content — optionally wrapped in an inset framed card.
          The inset/rounding is suppressed on mobile so the content stays
          edge-to-edge (the framed card only reads well on larger screens). */}
      <div className={cn(
        'relative flex flex-1 flex-col overflow-hidden',
        frame && 'md:m-2 md:rounded-xl md:border md:border-border md:bg-card'
      )}>
        {/* Top bar — mobile hamburger + module header slot (title + sub-nav) + actions */}
        <div className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* Mobile hamburger — suppressed when a bottom-nav bar owns mobile
                navigation (mobile-first apps). Desktop sidebar is untouched. */}
            {!hasBottomNav && (
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            {pageTitle && <h2 className="font-semibold text-lg">{pageTitle}</h2>}
            {topbarStart}
            {/* Module pages (tabs variant) portal their sub-nav here */}
            <div ref={setHeaderSlot} className="flex min-w-0 flex-1 items-center" />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Pages portal their primary action buttons here */}
            <div ref={setActionsSlot} className="flex items-center gap-2" />
            {topbarEnd}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>

        {/* App-wide floating SaveBar (spans the content column, not the sidebar) */}
        <SaveBar />
      </div>

      {/* Mobile drawer — animated, owns its own close transition. */}
      {mobileMenuOpen && (
        <MobileOverlay
          navigation={navigation}
          logo={logo}
          user={user}
          currentPath={currentPath}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          onProfile={onProfile}
          onSettings={onSettings}
          onBilling={onBilling}
          orgSwitcher={orgSwitcher}
          topContent={sidebarTopContent}
          footerContent={sidebarFooterContent}
          userMenuSlot={userMenuSlot}
          notificationSlot={notificationSlot}
          unreadCount={unreadCount}
          onClose={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
    </ModuleHeaderActionsSlotContext.Provider>
    </ModuleHeaderSlotContext.Provider>
    </SaveBarProvider>
  )
}

// ---------------------------------------------------------------------------
// Topbar layout
// ---------------------------------------------------------------------------

function TopbarLayout({
  navigation = [],
  logo,
  user,
  children,
  onNavigate,
  onSignOut,
  onProfile,
  onSettings,
  onBilling,
  userMenuExtras,
  frame,
  currentPath,
  topbarStart,
  topbarEnd,
  hasBottomNav = false,
}: {
  navigation?: NavigationItem[]
  logo?: React.ReactNode
  user?: AppShellUser
  children?: React.ReactNode
  onNavigate?: (route: string) => void
  onSignOut?: () => void
  onProfile?: () => void
  onSettings?: () => void
  onBilling?: () => void
  userMenuExtras?: AppShellProps['userMenuExtras']
  frame?: boolean
  currentPath?: string
  topbarStart?: React.ReactNode
  topbarEnd?: React.ReactNode
  /** When a mobile bottom-nav bar is present, the mobile hamburger is
   *  suppressed so the bottom nav is the primary mobile navigation. */
  hasBottomNav?: boolean
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  // Topbar is full-bleed (edge to edge); only the content area gets the frame.
  return (
    <SaveBarProvider>
    <div className="relative flex h-screen flex-col overflow-hidden bg-background">
      <Topbar
        navigation={navigation}
        logo={logo}
        user={user}
        currentPath={currentPath}
        onNavigate={onNavigate}
        onSignOut={onSignOut}
        onProfile={onProfile}
        onSettings={onSettings}
        onBilling={onBilling}
        userMenuExtras={userMenuExtras}
        leftContent={topbarStart}
        rightContent={topbarEnd}
        onMenuClick={hasBottomNav ? undefined : () => setMobileMenuOpen(true)}
      />
      {/* Frame inset/border only from md up, so mobile stays edge-to-edge. */}
      <main className={cn('flex-1 overflow-y-auto pb-16 md:pb-0', frame && 'md:p-2')}>
        <div className={cn('min-h-full', frame && 'md:rounded-xl md:border md:border-border md:bg-card')}>
          {children}
        </div>
      </main>

      {/* App-wide floating SaveBar */}
      <SaveBar />

      {/* Mobile drawer — topbar has no persistent sidebar, so the burger opens
          the same animated nav drawer used by the sidebar layout. */}
      {mobileMenuOpen && (
        <MobileOverlay
          navigation={navigation}
          logo={logo}
          user={user}
          currentPath={currentPath}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          onProfile={onProfile}
          onSettings={onSettings}
          onBilling={onBilling}
          userMenuSlot={user ? <DrawerUserRow user={user} /> : undefined}
          onClose={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
    </SaveBarProvider>
  )
}

// Compact user identity for the mobile drawer's bottom row.
function DrawerUserRow({ user }: { user: AppShellUser }) {
  const label = user.fullName || user.email
  return (
    <div className="flex min-w-0 items-center gap-2 px-1">
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {(label || '?').charAt(0).toUpperCase()}
        </span>
      )}
      <span className="truncate text-sm font-medium text-sidebar-foreground">{label}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Minimal layout
// ---------------------------------------------------------------------------

function MinimalLayout({
  logo,
  user: _user,
  children,
  headerEnd,
}: {
  logo?: React.ReactNode
  user?: AppShellUser
  children?: React.ReactNode
  headerEnd?: React.ReactNode
}) {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6">
        <div className="flex items-center gap-3">
          {logo ?? <span className="text-lg font-bold">App</span>}
        </div>
        {headerEnd && <div className="flex items-center gap-2">{headerEnd}</div>}
      </header>
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mobile overlay drawer
// ---------------------------------------------------------------------------

type MobileOverlayProps = Omit<SidebarProps, 'collapsed' | 'onToggle'> & {
  onClose: () => void
}

function MobileOverlay({ onClose, onNavigate, ...sidebarProps }: MobileOverlayProps) {
  // Mount hidden, then flip to visible on the next frame so the CSS transition
  // plays on open. On dismiss we play the exit transition first, then unmount.
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const close = React.useCallback(() => {
    setVisible(false)
    window.setTimeout(onClose, 250)
  }, [onClose])

  // Lock body scroll while the drawer is open.
  React.useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // Dismiss on Escape.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      {/* Backdrop — fades in/out */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-300 ease-out',
          visible ? 'opacity-100' : 'opacity-0',
        )}
        onClick={close}
      />
      {/* Drawer — slides in from the left, reusing the real Sidebar for full
          design parity (icons, active state, org switcher, bottom user row). */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 shadow-2xl transition-transform duration-300 ease-out will-change-transform',
          visible ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Sidebar
          {...sidebarProps}
          collapsed={false}
          onToggle={close}
          borderless
          onNavigate={(route) => {
            onNavigate?.(route)
            close()
          }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mobile bottom tab bar — rendered for every variant on small screens.
// ui must NOT import from saas, so the icon lookup is a small local map (a
// mirror of the saas icon convention). Unknown icon names fall back to Home.
// ---------------------------------------------------------------------------

const BOTTOM_NAV_ICONS: Record<string, LucideIcon> = {
  Home,
  Receipt,
  ArrowLeftRight,
  Calendar,
  CreditCard,
  Settings,
  Menu,
  MessageCircle,
  Wallet,
  PiggyBank,
  Plus,
}

function MobileBottomNav({
  items,
  currentPath,
  onNavigate,
}: {
  items: NonNullable<AppShellProps['bottomNav']>
  currentPath?: string
  onNavigate?: (route: string) => void
}) {
  const path = currentPath ?? ''
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background md:hidden">
      {items.map((item) => {
        const isActive =
          item.route === '/'
            ? path === '/' || path === ''
            : path === item.route || path.startsWith(item.route + '/')
        const Icon = BOTTOM_NAV_ICONS[item.icon] ?? Home
        return (
          <button
            key={item.route}
            type="button"
            onClick={() => onNavigate?.(item.route)}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

// ---------------------------------------------------------------------------
// AppShell — main entry point
// ---------------------------------------------------------------------------

export function AppShell({
  variant,
  contentFrame,
  navigation = [],
  logo,
  user,
  children,
  onNavigate,
  onSignOut,
  onProfile,
  onSettings,
  onBilling,
  pageTitle,
  currentPath,
  userMenuExtras,
  orgSwitcher,
  topbarStart,
  topbarEnd,
  sidebarTopContent,
  sidebarFooterContent,
  bottomNav,
  userMenuSlot,
  notificationSlot,
  unreadCount = 0,
}: AppShellProps) {
  const hasBottomNav = !!bottomNav?.length
  const bottomBar = hasBottomNav ? (
    <MobileBottomNav items={bottomNav!} currentPath={currentPath} onNavigate={onNavigate} />
  ) : null

  let layoutElement: React.ReactNode
  switch (variant) {
    case 'sidebar':
      layoutElement = (
        <SidebarLayout
          navigation={navigation}
          logo={logo}
          user={user}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          onProfile={onProfile}
          onSettings={onSettings}
          onBilling={onBilling}
          userMenuExtras={userMenuExtras}
          orgSwitcher={orgSwitcher}
          sidebarTopContent={sidebarTopContent}
          sidebarFooterContent={sidebarFooterContent}
          frame={contentFrame}
          currentPath={currentPath}
          pageTitle={pageTitle}
          topbarStart={topbarStart}
          topbarEnd={topbarEnd}
          userMenuSlot={userMenuSlot}
          notificationSlot={notificationSlot}
          unreadCount={unreadCount}
          hasBottomNav={hasBottomNav}
        >
          {children}
        </SidebarLayout>
      )
      break

    case 'topbar':
      layoutElement = (
        <TopbarLayout
          navigation={navigation}
          logo={logo}
          user={user}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          onProfile={onProfile}
          onSettings={onSettings}
          onBilling={onBilling}
          userMenuExtras={userMenuExtras}
          frame={contentFrame}
          currentPath={currentPath}
          topbarStart={topbarStart}
          topbarEnd={topbarEnd}
          hasBottomNav={hasBottomNav}
        >
          {children}
        </TopbarLayout>
      )
      break

    case 'minimal':
      layoutElement = (
        <MinimalLayout logo={logo} user={user} headerEnd={topbarEnd}>
          {children}
        </MinimalLayout>
      )
      break

    default: {
      const _exhaustive: never = variant
      return null
    }
  }

  return (
    <>
      {layoutElement}
      {bottomBar}
    </>
  )
}
