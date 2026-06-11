import * as React from 'react'
import { Menu } from 'lucide-react'
import { Sidebar, type NavigationItem, type SidebarUser } from './Sidebar'
import { Topbar } from './Topbar'
import { useLayoutStore } from '../stores/layout.store'
import { cn } from '../utils/cn'

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
  /** Add an inner frame/border around the content area */
  sidebarFrame?: boolean
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

  return (
    <div className={cn('flex h-screen overflow-hidden', frame && 'p-2 gap-2 bg-background')}>
      {/* Desktop Sidebar */}
      <div className={cn('hidden md:flex', frame && 'rounded-xl overflow-hidden')}>
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
          borderless={frame}
          userMenuSlot={userMenuSlot}
          notificationSlot={notificationSlot}
          unreadCount={unreadCount}
        />
      </div>

      {/* Main content */}
      <div className={cn(
        'flex flex-1 flex-col overflow-hidden',
        frame && 'rounded-xl border border-border bg-card overflow-hidden'
      )}>
        {/* Top bar for sidebar layout — only shows mobile hamburger + title + actions */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            {pageTitle && <h2 className="font-semibold text-lg">{pageTitle}</h2>}
            {topbarStart}
          </div>
          <div className="flex items-center gap-2">{topbarEnd}</div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <MobileOverlay
          navigation={navigation}
          logo={logo}
          onNavigate={(route) => {
            onNavigate?.(route)
            setMobileMenuOpen(false)
          }}
          onClose={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Topbar layout
// ---------------------------------------------------------------------------

function TopbarLayout({
  navigation = [],
  logo,
  user: _user,
  children,
  onNavigate,
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
  frame?: boolean
  currentPath?: string
  topbarStart?: React.ReactNode
  topbarEnd?: React.ReactNode
}) {
  return (
    <div className={cn('flex h-screen flex-col overflow-hidden', frame && 'p-2 gap-2 bg-background')}>
      <div className={cn(frame && 'rounded-xl overflow-hidden')}>
        <Topbar
          navigation={navigation}
          logo={logo}
          currentPath={currentPath}
          onNavigate={onNavigate}
          leftContent={topbarStart}
          rightContent={topbarEnd}
        />
      </div>
      <main className={cn(
        'flex-1 overflow-y-auto',
        frame && 'rounded-xl border border-border bg-card'
      )}>
        {children}
      </main>
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

function MobileOverlay({
  navigation,
  logo,
  onNavigate,
  onClose,
}: {
  navigation: NavigationItem[]
  logo?: React.ReactNode
  onNavigate: (route: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card">
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          {logo ?? <span className="text-lg font-bold">App</span>}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.route)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AppShell — main entry point
// ---------------------------------------------------------------------------

export function AppShell({
  variant,
  sidebarFrame,
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
          frame={sidebarFrame}
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
          frame={sidebarFrame}
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
