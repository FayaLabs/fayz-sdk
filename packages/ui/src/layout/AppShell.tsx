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

// ---------------------------------------------------------------------------
// Bottom-nav item model
//
// Two kinds share the mobile tab bar:
//  - route  (default): a normal tab that navigates to `route`.
//  - action: a NON-route item rendered as a raised, elevated circular center
//    button (Mobills style). It fires `onBottomNavAction(id)` instead of
//    navigating — e.g. a global quick-add "+".
// ---------------------------------------------------------------------------

export interface BottomNavRouteItem {
  kind?: 'route'
  label: string
  icon: string
  route: string
}

export interface BottomNavActionItem {
  kind: 'action'
  /** Identifier passed to onBottomNavAction. */
  id: string
  icon: string
  /** Optional accessible label. */
  label?: string
}

export type BottomNavItem = BottomNavRouteItem | BottomNavActionItem

/** Mobile header treatment (small screens, <md). Desktop is unaffected.
 *  - 'minimal'     : a small top header bar (the default / today's behavior).
 *  - 'transparent' : NO header bar; content is edge-to-edge with a floating
 *                    profile avatar pinned top-right (calls onProfile).
 *  - 'hidden'      : no header bar and no floating avatar. */
export type MobileHeaderVariant = 'transparent' | 'minimal' | 'hidden'

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
  /** Current-plan pill shown next to the user in the topbar menu. */
  userPlan?: { label: string; paid: boolean }
  /** i18n label for the billing/subscription user-menu item. */
  billingLabel?: string
  pageTitle?: string
  currentPath?: string
  userMenuExtras?: { label: string; icon?: React.ReactNode; onClick: () => void }[]
  orgSwitcher?: React.ReactNode
  topbarStart?: React.ReactNode
  topbarEnd?: React.ReactNode
  sidebarTopContent?: React.ReactNode
  sidebarFooterContent?: React.ReactNode
  bottomNav?: BottomNavItem[]
  /** Fired when a bottom-nav `action` item (e.g. the center "+") is tapped. */
  onBottomNavAction?: (id: string) => void
  /** Mobile header treatment (<md). Default: 'minimal'. Desktop unaffected. */
  mobileHeader?: MobileHeaderVariant
  /** Rendered in sidebar bottom user slot */
  userMenuSlot?: React.ReactNode
  /** Rendered in sidebar bottom notification slot */
  notificationSlot?: React.ReactNode
  /** Unread notification count */
  unreadCount?: number
  /** Optional headings above the sidebar nav sections (contextual sidebars). */
  sidebarSectionLabels?: { main?: string; secondary?: string; settings?: string }
  /** Identity of the current sidebar context — changing it animates the rail
   *  swap as a push (new nav in, previous nav out). */
  sidebarNavKey?: string
  /** Push direction for a `sidebarNavKey` change. Default 'forward'. */
  sidebarNavDirection?: 'forward' | 'back'
  /**
   * Full-height column pinned to the right (the assistant dock, a tasks
   * panel). Rendered as a flex SIBLING of the layout, so the app narrows to
   * make room instead of being covered — the difference between a split view
   * and a modal that happens to be tall.
   *
   * Falsy renders nothing and costs nothing: no wrapper, no divider, the
   * layout element stands alone exactly as before.
   */
  rightRail?: React.ReactNode
  /** Whether the rail is showing. Separate from `rightRail` so the column can
   *  animate its width instead of snapping when it closes. */
  rightRailOpen?: boolean
  /** Starting width in px. Ignored once the user drags. Default 380. */
  defaultRightRailWidth?: number
  /** Fired after every drag so the host can persist the preference. */
  onRightRailWidthChange?: (width: number) => void
  /** Drag bounds in px. Defaults 300 / 720. */
  rightRailMinWidth?: number
  rightRailMaxWidth?: number
  /** Accessible name for the drag handle. */
  rightRailResizeLabel?: string
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
  mobileHeader = 'minimal',
  sidebarSectionLabels,
  sidebarNavKey,
  sidebarNavDirection,
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
  /** Mobile header treatment (<md). Desktop keeps its top bar untouched. */
  mobileHeader?: MobileHeaderVariant
  sidebarSectionLabels?: AppShellProps['sidebarSectionLabels']
  sidebarNavKey?: string
  sidebarNavDirection?: 'forward' | 'back'
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
    <div className={cn(
      'flex h-screen overflow-hidden bg-background',
      // Frame mode: the inset gap around the framed card takes the sidebar (menu)
      // color, so the white card reads as a panel floating on the same tone as the
      // left menu. The card's own md:m-2 margin reveals this behind it.
      frame && 'md:bg-sidebar',
    )}>
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
          sectionLabels={sidebarSectionLabels}
          navKey={sidebarNavKey}
          navDirection={sidebarNavDirection}
        />
      </div>

      {/* Main content — optionally wrapped in an inset framed card.
          The inset/rounding is suppressed on mobile so the content stays
          edge-to-edge (the framed card only reads well on larger screens). */}
      <div className={cn(
        'relative flex flex-1 flex-col overflow-hidden',
        frame && 'md:m-2 md:rounded-xl md:border md:border-border md:bg-card'
      )}>
        {/* Top bar — mobile hamburger + module header slot (title + sub-nav) + actions.
            On mobile the bar is suppressed for the 'transparent' / 'hidden' header
            treatments (content goes edge-to-edge); desktop keeps it always. The
            portal targets below stay mounted (display:none on mobile) so module
            pages can still portal their sub-nav on desktop without crashing. */}
        <div className={cn(
          'flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-2',
          mobileHeader !== 'minimal' && 'hidden md:flex',
        )}>
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
        <main className="min-w-0 flex-1 overflow-y-auto pb-16 md:pb-0">
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
  userPlan,
  billingLabel,
  userMenuExtras,
  orgSwitcher,
  frame,
  currentPath,
  topbarStart,
  topbarEnd,
  notificationSlot,
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
  userPlan?: AppShellProps['userPlan']
  billingLabel?: AppShellProps['billingLabel']
  userMenuExtras?: AppShellProps['userMenuExtras']
  /** Workspace switcher — rendered beside the logo (desktop) and in the mobile drawer. */
  orgSwitcher?: React.ReactNode
  frame?: boolean
  currentPath?: string
  topbarStart?: React.ReactNode
  topbarEnd?: React.ReactNode
  /** Bell/inbox slot — in the topbar layout it renders with the right-side actions. */
  notificationSlot?: React.ReactNode
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
        userPlan={userPlan}
        billingLabel={billingLabel}
        userMenuExtras={userMenuExtras}
        orgSwitcher={orgSwitcher}
        leftContent={topbarStart}
        rightContent={(topbarEnd || notificationSlot) ? <>{topbarEnd}{notificationSlot}</> : undefined}
        onMenuClick={hasBottomNav ? undefined : () => setMobileMenuOpen(true)}
      />
      {/* Frame inset/border only from md up, so mobile stays edge-to-edge. The
          inset gap behind the framed card is the header color (bg-sidebar), so the
          white card reads as a panel floating on the same navy as the topbar. */}
      {/* The frame is fixed to the viewport and the content scrolls INSIDE it,
          mirroring SidebarLayout. With `main` as the scroller the card grew with
          the page and its bottom edge rode off-screen. */}
      <main className={cn('flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden', frame && 'md:bg-sidebar md:p-2')}>
        <div className={cn('flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden', frame && 'md:rounded-xl md:border md:border-border md:bg-card')}>
          <div className="min-h-0 flex-1 overflow-y-auto pb-16 md:pb-0">
            {children}
          </div>
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
          orgSwitcher={orgSwitcher}
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
      <main className="min-w-0 flex-1 overflow-y-auto pb-16 md:pb-0">
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

// Floating profile avatar — mobile-only (md:hidden), pinned top-right over the
// content. Used with the 'transparent' mobile header treatment so there is no
// header bar but the user still has a one-tap route into their profile.
function FloatingProfileAvatar({ user, onClick }: { user?: AppShellUser; onClick?: () => void }) {
  if (!user) return null
  const label = user.fullName || user.email
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Profile"
      className="fixed right-3 top-3 z-40 md:hidden"
    >
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt=""
          className="h-9 w-9 rounded-full object-cover shadow-md ring-2 ring-background"
        />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-md ring-2 ring-background">
          {(label || '?').charAt(0).toUpperCase()}
        </span>
      )}
    </button>
  )
}

function MobileBottomNav({
  items,
  currentPath,
  onNavigate,
  onAction,
}: {
  items: NonNullable<AppShellProps['bottomNav']>
  currentPath?: string
  onNavigate?: (route: string) => void
  onAction?: (id: string) => void
}) {
  const path = currentPath ?? ''
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background md:hidden">
      {items.map((item) => {
        // Elevated center ACTION button (Mobills style) — raised above the bar,
        // circular, primary-filled; fires onBottomNavAction instead of routing.
        if (item.kind === 'action') {
          const ActionIcon = BOTTOM_NAV_ICONS[item.icon] ?? Plus
          return (
            <div key={item.id} className="flex flex-1 items-start justify-center">
              <button
                type="button"
                onClick={() => onAction?.(item.id)}
                aria-label={item.label ?? 'Add'}
                className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95"
              >
                <ActionIcon className="h-6 w-6" />
              </button>
            </div>
          )
        }
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
  userPlan,
  billingLabel,
  pageTitle,
  currentPath,
  userMenuExtras,
  orgSwitcher,
  topbarStart,
  topbarEnd,
  sidebarTopContent,
  sidebarFooterContent,
  bottomNav,
  onBottomNavAction,
  mobileHeader = 'minimal',
  userMenuSlot,
  notificationSlot,
  unreadCount = 0,
  sidebarSectionLabels,
  sidebarNavKey,
  sidebarNavDirection,
  rightRail,
  rightRailOpen = true,
  defaultRightRailWidth,
  onRightRailWidthChange,
  rightRailMinWidth,
  rightRailMaxWidth,
  rightRailResizeLabel,
}: AppShellProps) {
  const hasBottomNav = !!bottomNav?.length
  const bottomBar = hasBottomNav ? (
    <MobileBottomNav
      items={bottomNav!}
      currentPath={currentPath}
      onNavigate={onNavigate}
      onAction={onBottomNavAction}
    />
  ) : null
  // Transparent mobile header → no bar, a floating avatar top-right instead.
  const floatingAvatar =
    mobileHeader === 'transparent' && user ? (
      <FloatingProfileAvatar user={user} onClick={onProfile} />
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
          mobileHeader={mobileHeader}
          sidebarSectionLabels={sidebarSectionLabels}
          sidebarNavKey={sidebarNavKey}
          sidebarNavDirection={sidebarNavDirection}
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
          userPlan={userPlan}
          billingLabel={billingLabel}
          userMenuExtras={userMenuExtras}
          orgSwitcher={orgSwitcher}
          frame={contentFrame}
          currentPath={currentPath}
          topbarStart={topbarStart}
          topbarEnd={topbarEnd}
          notificationSlot={notificationSlot}
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
      {rightRail ? (
        <SplitWithRightRail
          rail={rightRail}
          open={rightRailOpen}
          frame={contentFrame}
          defaultWidth={defaultRightRailWidth}
          onWidthChange={onRightRailWidthChange}
          minWidth={rightRailMinWidth}
          maxWidth={rightRailMaxWidth}
          resizeLabel={rightRailResizeLabel}
        >
          {layoutElement}
        </SplitWithRightRail>
      ) : (
        layoutElement
      )}
      {floatingAvatar}
      {bottomBar}
    </>
  )
}

// ---------------------------------------------------------------------------
// SplitWithRightRail — the app on the left, a full-height rail on the right,
// a divider the user owns between them.
//
// The layouts all root at `h-screen overflow-hidden`, so putting them in a
// `flex-1 min-w-0` cell keeps their height and lets them shrink. `min-w-0` is
// load-bearing: without it a flex child refuses to go below its content width
// and the rail gets pushed off-screen instead of the content reflowing.
// ---------------------------------------------------------------------------

function SplitWithRightRail({
  children,
  rail,
  open,
  frame,
  defaultWidth = 380,
  onWidthChange,
  minWidth = 300,
  maxWidth = 720,
  resizeLabel = 'Resize panel',
}: {
  children: React.ReactNode
  rail: React.ReactNode
  open: boolean
  /** Frame mode: the gutter between content and rail takes the sidebar tone,
   *  the same surface the content card floats on. Without this the split shows
   *  a bare strip of page background and the rail reads as bolted on. */
  frame?: boolean
  defaultWidth?: number
  onWidthChange?: (width: number) => void
  minWidth?: number
  maxWidth?: number
  resizeLabel?: string
}) {
  const [width, setWidth] = React.useState(defaultWidth)
  const [dragging, setDragging] = React.useState(false)

  const clamp = React.useCallback(
    (value: number) => Math.min(maxWidth, Math.max(minWidth, value)),
    [minWidth, maxWidth],
  )

  // The app follows the pointer to the pixel, so the drag runs on window
  // listeners rather than on the handle: the cursor routinely outruns a 6px
  // target, and a resize that stops when you move too fast feels broken.
  React.useEffect(() => {
    if (!dragging) return
    const onMove = (event: PointerEvent) => {
      event.preventDefault()
      setWidth(clamp(window.innerWidth - event.clientX))
    }
    const stop = () => setDragging(false)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    // Text selection across the whole app while dragging a divider is pure
    // noise, and iframes/canvases would otherwise swallow the pointer.
    const previousSelect = document.body.style.userSelect
    const previousCursor = document.body.style.cursor
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
      document.body.style.userSelect = previousSelect
      document.body.style.cursor = previousCursor
    }
  }, [dragging, clamp])

  // Report only on release: firing per pointer frame would write to
  // localStorage ~60×/second for one gesture.
  React.useEffect(() => {
    if (dragging) return
    onWidthChange?.(width)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging])

  const nudge = (delta: number) => setWidth((current) => clamp(current + delta))

  return (
    // Sidebar tone always: the gutter and the divider sit in the shell's
    // chrome, next to the menu — painting them page-white put a bright strip
    // between the dark chrome and the rail, which read as a seam rather than
    // as space.
    <div className={cn('flex h-screen w-full overflow-hidden bg-sidebar', !frame && 'md:bg-background')}>
      <div className="min-w-0 flex-1">{children}</div>

      {/* Divider — desktop only; on a phone the rail is a sheet over the app,
          and there is nothing to divide. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={resizeLabel}
        aria-valuenow={width}
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        tabIndex={0}
        onPointerDown={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDoubleClick={() => setWidth(clamp(defaultWidth))}
        onKeyDown={(event) => {
          // Keyboard resize: a pointer-only divider makes the split view
          // unusable for anyone not using a mouse.
          if (event.key === 'ArrowLeft') { event.preventDefault(); nudge(24) }
          else if (event.key === 'ArrowRight') { event.preventDefault(); nudge(-24) }
          else if (event.key === 'Home') { event.preventDefault(); setWidth(maxWidth) }
          else if (event.key === 'End') { event.preventDefault(); setWidth(minWidth) }
        }}
        className={cn(
          'group relative hidden w-1 shrink-0 cursor-col-resize focus-visible:outline-none',
          open && 'md:block',
        )}
      >
        {/* Invisible at rest: the gutter's own tone already separates the two
            panes, and a permanent rule there just adds a line to look at.
            It appears when you reach for it. */}
        <span
          className={cn(
            'absolute inset-y-6 left-1/2 w-px -translate-x-1/2 rounded-full bg-transparent transition-colors',
            'group-hover:bg-primary/60 group-focus-visible:bg-primary',
            dragging && 'bg-primary',
          )}
        />
        {/* Hit area wider than the line: 1px is honest visually and hostile
            to aim for. */}
        <span className="absolute inset-y-0 -left-1.5 -right-1.5" />
      </div>

      {/* Rendered once: two copies would mount the rail's contents twice. On a
          phone the box collapses to zero width and the rail positions itself
          `fixed` over the screen. The frame inset is padding HERE rather than
          margin on the rail — a full-height child plus vertical margins
          overflows its own box. */}
      <aside
        style={{ ['--fayz-rail-w' as string]: `${width}px` }}
        className={cn(
          'w-0 shrink-0 overflow-hidden',
          // Animating WIDTH is what makes the app glide back instead of
          // snapping; skipped mid-drag so the divider stays glued to the cursor.
          !dragging && 'motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-out',
          open && 'md:w-[var(--fayz-rail-w)]',
          frame && 'md:py-2 md:pr-2',
        )}
      >
        {rail}
      </aside>
    </div>
  )
}
