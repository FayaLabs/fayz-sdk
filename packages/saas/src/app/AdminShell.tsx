import * as React from 'react'
import {
  AppShell,
  type NavigationItem,
  ModuleLayoutProvider,
  PageTransition,
  type ModuleNavVariant,
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@fayz-ai/ui'
import { useOrganizationStore } from '../org/store'
import { useAuth } from '@fayz-ai/auth'
import { usePluginRuntime, resolvePluginComponent, useTranslation } from '@fayz-ai/core'
import type { PermissionAction, PluginNavigationEntry, PluginRouteDefinition, PluginSettingsTab } from '@fayz-ai/core'
import { useAdminPath, navigateTo, matchRoute, routeScore } from './routing'
import { LoginPage } from './LoginPage'
import type { CustomPage } from './config'
import type { AuthProvider } from '@fayz-ai/core'
import { setEntityRouteMap } from '../lib/entity-routes'
import { usePermissionOptional } from '../permissions/context'
import { SettingsPage } from '../shell/components/settings/SettingsPage'
import { TeamTab } from '../shell/components/organization/TeamTab'
import { PermissionProfilesTab } from '../shell/components/organization/PermissionProfilesTab'
import { LocationsCrudPage } from '../shell/components/settings/LocationsCrudPage'
import { ConnectedFieldRulesSettings } from '../shell/components/settings/ConnectedFieldRulesSettings'
import { MapPin, Puzzle, ShieldCheck, SlidersHorizontal, Users } from 'lucide-react'
import * as LucideIcons from 'lucide-react'

// ---------------------------------------------------------------------------
// AdminShell — the working admin surface. Mounted INSIDE the providers (see
// AdminProviders). Reads the resolved plugin runtime for navigation + routes,
// wires the @fayz-ai/ui AppShell, and switches the main content on the hash path.
// Custom pages (config.pages / manifest pages already resolved to components)
// are merged into the same nav + route table.
// ---------------------------------------------------------------------------

export interface AdminShellProps {
  appName: string
  layout?: 'sidebar' | 'topbar' | 'minimal'
  logo?: React.ReactNode
  pages?: CustomPage[]
  requireAuth?: boolean
  loginTagline?: string
  loginDescription?: string
  loginLogo?: React.ReactNode
  loginLayout?: 'split' | 'centered'
  showOAuth?: boolean
  oauthProviders?: Exclude<AuthProvider, 'email'>[]
  showSettings?: boolean
  showOrgSettings?: boolean
  /** Wrap the main content in an inset "framed" card (default: true). The
   *  sidebar is always flush/full-height. */
  contentFrame?: boolean
  /** How module-internal navigation renders. Defaults to 'tabs' for the
   *  'sidebar' layout and 'rail' for 'topbar'. */
  moduleNav?: ModuleNavVariant
}

// ---------------------------------------------------------------------------
// WorkspaceSwitcher — sub-account / workspace selector at the sidebar top.
// Reads the native org store (the one AdminProviders populates).
// ---------------------------------------------------------------------------

function WorkspaceSwitcher() {
  const currentOrg = useOrganizationStore((s) => s.currentOrg)
  const userOrgs = useOrganizationStore((s) => s.userOrgs)
  const setCurrentOrg = useOrganizationStore((s) => s.setCurrentOrg)
  if (!currentOrg) return null

  const Building = LucideIcons.Building2
  const Chevron = LucideIcons.ChevronsUpDown
  const Check = LucideIcons.Check
  const options = userOrgs.length
    ? userOrgs
    : [{ orgId: currentOrg.id, orgName: currentOrg.name, orgSlug: currentOrg.slug }]

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-md border border-sidebar-border/60 bg-sidebar-accent/30 px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-sidebar-accent text-sidebar-accent-foreground">
            <Building className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-sidebar-foreground">{currentOrg.name}</span>
          <Chevron className="h-3.5 w-3.5 shrink-0 text-sidebar-muted" />
        </button>
      </DropdownTrigger>
      <DropdownContent align="start" className="w-56 bg-sidebar text-sidebar-foreground border-sidebar-border">
        <DropdownLabel className="text-sidebar-muted">Workspaces</DropdownLabel>
        <DropdownSeparator className="bg-sidebar-border" />
        {options.map((m) => (
          <DropdownItem
            key={m.orgId}
            onClick={() => setCurrentOrg({ id: m.orgId, name: m.orgName, slug: m.orgSlug, createdAt: '', updatedAt: '' })}
            className="flex items-center gap-2 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground"
          >
            <span className="min-w-0 flex-1 truncate">{m.orgName}</span>
            {currentOrg.id === m.orgId && <Check className="h-4 w-4 shrink-0" />}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  )
}

// ---------------------------------------------------------------------------
// AdminUserMenu — user dropdown rendered in the sidebar bottom row.
// ---------------------------------------------------------------------------

function AdminUserMenu({
  user,
  onProfile,
  onSettings,
  onSignOut,
}: {
  user?: { fullName?: string; email: string; avatarUrl?: string }
  onProfile?: () => void
  onSettings?: () => void
  onSignOut?: () => void
}) {
  if (!user) return null
  const name = user.fullName ?? user.email
  const initials = name.replace(/[^A-Za-z0-9]/g, ' ').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-sidebar-accent/50">
          <Avatar className="h-7 w-7 shrink-0">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={name} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 truncate text-xs font-medium text-sidebar-foreground">{name}</span>
        </button>
      </DropdownTrigger>
      <DropdownContent align="start" className="w-56 bg-sidebar text-sidebar-foreground border-sidebar-border">
        <DropdownLabel className="truncate text-sidebar-muted">{user.email}</DropdownLabel>
        <DropdownSeparator className="bg-sidebar-border" />
        {onProfile && (
          <DropdownItem onClick={onProfile} className="focus:bg-sidebar-accent focus:text-sidebar-accent-foreground">Profile</DropdownItem>
        )}
        {onSettings && (
          <DropdownItem onClick={onSettings} className="focus:bg-sidebar-accent focus:text-sidebar-accent-foreground">Settings</DropdownItem>
        )}
        <DropdownSeparator className="bg-sidebar-border" />
        {onSignOut && (
          <DropdownItem onClick={onSignOut} className="focus:bg-sidebar-accent focus:text-sidebar-accent-foreground">Sign out</DropdownItem>
        )}
      </DropdownContent>
    </Dropdown>
  )
}

function navEntryToItem(entry: PluginNavigationEntry): NavigationItem {
  return {
    id: entry.id ?? `${entry.route}`,
    label: entry.label,
    icon: entry.icon ?? 'LayoutTemplate',
    route: entry.route,
    section: entry.section,
    badge: entry.badge,
  }
}

type OrderedNavigationItem = NavigationItem & { position: number }

interface RouteEntry {
  path: string
  Component: React.ComponentType<Record<string, unknown>>
  /** Render edge-to-edge with no page padding wrapper (chat, kanban, canvas). */
  fullBleed?: boolean
}

function registerEntityRoute(
  component: unknown,
  path: string,
  entityRouteMap: Map<string, string>,
): void {
  const entityDef = (component as any)?.__entityDef
  if (!entityDef?.data) return

  if (entityDef.data.archetypeKind) {
    entityRouteMap.set(`${entityDef.data.archetype ?? ''}:${entityDef.data.archetypeKind}`, path)
  } else if (entityDef.data.archetype) {
    entityRouteMap.set(entityDef.data.archetype, path)
  }
}

function sectionOrder(section: NavigationItem['section']): number {
  return section === 'main' ? 0 : section === 'secondary' ? 1 : 2
}

function compareNavigation(a: OrderedNavigationItem, b: OrderedNavigationItem): number {
  const sectionDelta = sectionOrder(a.section) - sectionOrder(b.section)
  if (sectionDelta !== 0) return sectionDelta
  return a.position - b.position
}

function pageToNavigationItem(page: CustomPage, fallbackPosition: number): OrderedNavigationItem | null {
  if (!page.label) return null
  return {
    id: `page:${page.path}`,
    label: page.label,
    icon: page.icon ?? 'FileText',
    route: page.path,
    section: page.section ?? 'main',
    badge: page.badge,
    permission: page.permission,
    position: page.position ?? fallbackPosition,
    children: page.children
      ?.map((child, index) => pageToNavigationItem(child, index))
      .filter((item): item is OrderedNavigationItem => Boolean(item)),
  }
}

function collectPageRoutes(
  pages: CustomPage[],
  out: RouteEntry[] = [],
  entityRouteMap: Map<string, string> = new Map(),
): RouteEntry[] {
  for (const page of pages) {
    if (page.component && page.path !== '/settings') {
      if ((page.component as any).__isCrudPage) {
        ;(page.component as any).__crudBasePath = page.path
        registerEntityRoute(page.component, page.path, entityRouteMap)
      }
      out.push({ path: page.path, Component: page.component as React.ComponentType<Record<string, unknown>> })
      out.push({ path: `${page.path}/*`, Component: page.component as React.ComponentType<Record<string, unknown>> })
    }
    if (page.children?.length) collectPageRoutes(page.children, out, entityRouteMap)
  }
  return out
}

function buildSettingsTabs(
  pluginTabs: PluginSettingsTab[],
  can: (feature: string, action?: PermissionAction) => boolean,
  t: (key: string, params?: Record<string, string | number>) => string,
  showOrgSettings: boolean,
): { id: string; label: string; icon?: React.ReactNode; component: React.ReactNode }[] {
  const settingsTabs: { id: string; label: string; icon?: React.ReactNode; component: React.ReactNode }[] = []

  if (showOrgSettings) {
    settingsTabs.push(
      { id: 'team', label: t('settings.team'), icon: <Users className="h-4 w-4" />, component: <TeamTab /> },
      { id: 'permissions', label: t('settings.permissions'), icon: <ShieldCheck className="h-4 w-4" />, component: <PermissionProfilesTab /> },
      { id: 'locations', label: t('settings.locations'), icon: <MapPin className="h-4 w-4" />, component: <LocationsCrudPage /> },
      { id: 'field-rules', label: t('settings.fieldRules'), icon: <SlidersHorizontal className="h-4 w-4" />, component: <ConnectedFieldRulesSettings /> },
    )
  }

  for (const tab of pluginTabs) {
    if (tab.permission && !can(tab.permission.feature, tab.permission.action)) continue
    if (!tab.component) continue

    const IconComp = tab.icon ? (LucideIcons as any)[tab.icon] ?? Puzzle : Puzzle
    const labelKey = `settings.plugin.${tab.id}`
    const translated = t(labelKey)
    settingsTabs.push({
      id: tab.id,
      label: translated === labelKey ? tab.label : translated,
      icon: React.createElement(IconComp as React.ComponentType<{ className?: string }>, { className: 'h-4 w-4' }),
      component: React.createElement(tab.component),
      // Flag plugin-contributed tabs so SettingsPage draws the core/plugins divider.
      isPlugin: true,
    } as any)
  }

  return settingsTabs
}

function AdminShellInner({ appName, layout = 'sidebar', logo, pages = [], showSettings = true, showOrgSettings = false, contentFrame = true, moduleNav }: AdminShellProps) {
  const runtime = usePluginRuntime()
  const t = useTranslation()
  const can = usePermissionOptional()
  const tr = (key: string, fallback: string) => {
    const v = t(key)
    return !v || v === key ? fallback : v
  }
  const path = useAdminPath()
  const { user, signOut } = useAuth()

  // Navigation: plugin entries + custom pages (deduped, plugin order preserved).
  const navigation = React.useMemo<NavigationItem[]>(() => {
    const items: OrderedNavigationItem[] = runtime.navigation.map((entry) => ({
      ...navEntryToItem(entry),
      position: entry.position,
    }))
    for (const [index, page] of pages.entries()) {
      const item = pageToNavigationItem(page, index + 1000)
      if (item) items.push(item)
    }
    return items.sort(compareNavigation)
  }, [runtime.navigation, pages])

  // Route table: plugin routes + custom pages, most-specific-first.
  const routes = React.useMemo<RouteEntry[]>(() => {
    const list: RouteEntry[] = []
    const entityRouteMap = new Map<string, string>()
    for (const r of runtime.routes as PluginRouteDefinition[]) {
      const Component = resolvePluginComponent(r) as React.ComponentType<Record<string, unknown>> | undefined
      if (Component) {
        list.push({ path: r.path, Component, fullBleed: r.fullBleed })
        list.push({ path: `${r.path}/*`, Component, fullBleed: r.fullBleed })
      }
    }
    if (showSettings) list.push({ path: '/settings/*', Component: SettingsPage as React.ComponentType<Record<string, unknown>> })
    if (showSettings) list.push({ path: '/settings', Component: SettingsPage as React.ComponentType<Record<string, unknown>> })
    collectPageRoutes(pages, list, entityRouteMap)
    setEntityRouteMap(entityRouteMap)
    return list.sort((a, b) => routeScore(b.path) - routeScore(a.path))
  }, [runtime.routes, pages, showSettings])

  const match = React.useMemo(() => {
    for (const r of routes) {
      const params = matchRoute(r.path, path)
      if (params) return { route: r, params }
    }
    return null
  }, [routes, path])

  // Treat '/' as the index: redirect to the first nav entry once it's known.
  React.useEffect(() => {
    if (!match && (path === '/' || path === '') && navigation.length > 0) {
      navigateTo(navigation[0]!.route)
    }
  }, [match, path, navigation])

  const ActiveComponent = match?.route.Component
  const activeParams = match?.params ?? {}
  const settingsTabs = React.useMemo(
    () => buildSettingsTabs(runtime.settingsTabs as PluginSettingsTab[], can, t, showOrgSettings),
    [runtime.settingsTabs, can, t, showOrgSettings],
  )

  const shellUser = user
    ? { fullName: user.fullName ?? user.email, email: user.email, avatarUrl: user.avatarUrl }
    : undefined

  // Module-internal nav style: explicit override, else by layout (GHL-style
  // tabs for sidebar products, left rail for topbar products).
  const moduleVariant: ModuleNavVariant = moduleNav ?? (layout === 'sidebar' ? 'tabs' : 'rail')

  // The layout owns the page title (shown in the top header), derived from the
  // active navigation entry — individual pages don't render their own title.
  const activePageTitle = React.useMemo(() => {
    if (path === '/settings' || path.startsWith('/settings/')) return tr('common.settings', 'Settings')
    const candidates = navigation
      .filter((n) => n.route)
      .sort((a, b) => b.route.length - a.route.length)
    const hit = candidates.find((n) =>
      n.route === '/' ? path === '/' || path === '' : path === n.route || path.startsWith(n.route + '/') || path.startsWith(n.route),
    )
    return hit?.label ?? candidates.find((n) => n.route === '/')?.label ?? ''
  }, [navigation, path, tr])

  const activeContent = ActiveComponent ? (
    match.route.path === '/settings' || match.route.path === '/settings/*'
      ? <SettingsPage extraTabs={settingsTabs} />
      : <ActiveComponent {...activeParams} />
  ) : null

  return (
    <ModuleLayoutProvider variant={moduleVariant}>
    <AppShell
      variant={layout}
      contentFrame={contentFrame}
      navigation={navigation}
      logo={logo ?? <span className="text-lg font-bold">{appName}</span>}
      user={shellUser}
      pageTitle={activePageTitle}
      currentPath={path}
      onNavigate={(route) => navigateTo(route)}
      onSignOut={() => { void signOut() }}
      onSettings={() => navigateTo('/settings')}
      sidebarTopContent={<WorkspaceSwitcher />}
      userMenuSlot={
        <AdminUserMenu
          user={shellUser}
          onSettings={() => navigateTo('/settings')}
          onSignOut={() => { void signOut() }}
        />
      }
    >
      {activeContent ? (
        <PageTransition
          transitionKey={match?.route.path ?? path}
          className={match?.route.fullBleed ? 'h-full min-h-0' : undefined}
        >
          {match?.route.fullBleed
            ? <div className="h-full min-h-0 overflow-hidden">{activeContent}</div>
            : <div className="space-y-6 p-6">{activeContent}</div>}
        </PageTransition>
      ) : (
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <p className="text-lg font-semibold text-foreground">
            {navigation.length ? tr('common.notFound', 'Page not found') : tr('common.welcome', 'Welcome')}
          </p>
          {navigation.length > 0 && (
            <button
              className="mt-3 text-sm text-primary underline"
              onClick={() => navigateTo(navigation[0]!.route)}
            >
              {navigation[0]!.label}
            </button>
          )}
        </div>
      )}
    </AppShell>
    </ModuleLayoutProvider>
  )
}

/** The shell + an auth gate in front of it. */
export function AdminShell(props: AdminShellProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const requireAuth = props.requireAuth ?? true

  if (requireAuth && !isAuthenticated) {
    if (isLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      )
    }
    return (
      <LoginPage
        appName={props.appName}
        logo={props.logo}
        loginLogo={props.loginLogo}
        layout={props.loginLayout}
        tagline={props.loginTagline}
        description={props.loginDescription}
        showOAuth={props.showOAuth}
        oauthProviders={props.oauthProviders}
      />
    )
  }

  return <AdminShellInner {...props} />
}
AdminShell.displayName = 'AdminShell'
