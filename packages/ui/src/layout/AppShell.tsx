import * as React from 'react'
import { Menu } from 'lucide-react'
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
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
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
        <main className="flex-1 overflow-y-auto">
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
        onMenuClick={() => setMobileMenuOpen(true)}
      />
      {/* Frame inset/border only from md up, so mobile stays edge-to-edge. */}
      <main className={cn('flex-1 overflow-y-auto', frame && 'md:p-2')}>
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
      <main className="flex-1 overflow-y-auto">
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
  userMenuSlot,
  notificationSlot,
  unreadCount = 0,
}: AppShellProps) {
  switch (variant) {
    case 'sidebar':
      return (
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
        >
          {children}
        </SidebarLayout>
      )

    case 'topbar':
      return (
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
        >
          {children}
        </TopbarLayout>
      )

    case 'minimal':
      return (
        <MinimalLayout logo={logo} user={user} headerEnd={topbarEnd}>
          {children}
        </MinimalLayout>
      )

    default: {
      const _exhaustive: never = variant
      return null
    }
  }
}
