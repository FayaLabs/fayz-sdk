import * as React from 'react'
import {
  AppShell,
  type NavigationItem,
  type BottomNavItem,
  type MobileHeaderVariant,
  ModuleLayoutProvider,
  PageTransition,
  type ModuleNavVariant,
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  useLayoutStore,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@fayz-ai/ui'
import { CommandPalette, type CommandItem } from '../shell/components/layout/CommandPalette'
import { useAuth } from '@fayz-ai/auth'
import { AuthGate, type LoginAmbassador } from '@fayz-ai/plugin-auth'
import { usePluginRuntime, resolvePluginComponent, useTranslation } from '@fayz-ai/core'
import type { PermissionAction, PluginNavigationEntry, PluginRouteDefinition, PluginSettingsTab, SystemPermission } from '@fayz-ai/core'

/** Route/nav RBAC requirement (mirror of core's PluginPermissionRequirement,
 *  which is not re-exported from the package index). */
type PermissionRequirement = { feature: string; action: PermissionAction }
import { useAdminPath, navigateTo, matchRoute, routeScore } from './routing'
import type { CustomPage } from './config'
import type { AuthProvider } from '@fayz-ai/core'
import { setEntityRouteMap } from '../lib/entity-routes'
import { usePermissionOptional } from '../permissions/context'
import { usePermissionsStore } from '../permissions'
import { useTenantOptional } from '../org/context'
import { WidgetSlot } from '../plugins/WidgetSlot'
import { useNotifications } from '../shell/hooks/useNotifications'
import { NotificationInbox } from '../shell/components/notifications/NotificationInbox'
import { SettingsPage, useCoreSettingsTabs, type SettingsTab } from '../shell/components/settings/SettingsPage'
import { TeamTab } from '../shell/components/organization/TeamTab'
import { PermissionProfilesTab } from '../shell/components/organization/PermissionProfilesTab'
import { LocationsCrudPage } from '../shell/components/settings/LocationsCrudPage'
import { ConnectedFieldRulesSettings } from '../shell/components/settings/ConnectedFieldRulesSettings'
import { SubscriptionPage } from '../shell/components/billing/SubscriptionPage'
import { UpgradePrompt, UpgradeModal, SoftLimitBanner, useAccessOptional, getPlanEntitlements } from '../shell/components/billing'
import { useBillingStore, resolvePlanBadge } from '../billing'
import { ArrowLeft, Bell, CreditCard, Crown, LogOut, MapPin, Puzzle, Settings as SettingsIcon, ShieldAlert, ShieldCheck, SlidersHorizontal, Sparkles, UserCog, Users } from 'lucide-react'
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
  loginAmbassadors?: LoginAmbassador[]
  loginAmbassadorsLabel?: string
  showOAuth?: boolean
  oauthProviders?: Exclude<AuthProvider, 'email'>[]
  showSettings?: boolean
  showOrgSettings?: boolean
  /** Show the workspace/org switcher at the sidebar top. Default: true.
   *  Single-org apps (config.org.multiOrg === false) get false from the
   *  scaffold so B2C users never see an organization concept. */
  showOrgSwitcher?: boolean
  /** Show the branding ("Identidade Visual") + company "Geral" settings tabs.
   *  Default: true. B2C apps pass false to hide org-identity settings. */
  showBranding?: boolean
  /** Wrap the main content in an inset "framed" card (default: true). The
   *  sidebar is always flush/full-height. */
  contentFrame?: boolean
  /** How module-internal navigation renders. Defaults to 'tabs' for the
   *  'sidebar' layout and 'rail' for 'topbar'. */
  moduleNav?: ModuleNavVariant
  /** Mobile bottom tab bar, passed straight through to AppShell. */
  bottomNav?: BottomNavItem[]
  /** Fired when a bottom-nav `action` item (e.g. the center "+") is tapped. */
  onBottomNavAction?: (id: string) => void
  /** Mobile header treatment (<md), passed straight through to AppShell. */
  mobileHeader?: MobileHeaderVariant
}

// ---------------------------------------------------------------------------
// WorkspaceSwitcher — sub-account / workspace selector at the sidebar top.
// Drives the native tenant context (useTenant). switchOrg re-hydrates the org
// (getOrg + members + permission profiles), so picking a workspace actually
// reloads the members list, role dropdowns and permission checks — the old
// setCurrentOrg(partial) path only swapped the name and left stores stale.
// ---------------------------------------------------------------------------

function WorkspaceSwitcher() {
  const tenant = useTenantOptional()
  const currentOrg = tenant?.org ?? null
  const t = useTranslation()
  if (!tenant || !currentOrg) return null

  const { userOrgs, switchOrg, loading } = tenant
  const Building = LucideIcons.Building2
  const Chevron = LucideIcons.ChevronsUpDown
  const Check = LucideIcons.Check
  const options = userOrgs.length
    ? userOrgs
    : [{ orgId: currentOrg.id, orgName: currentOrg.name, orgSlug: currentOrg.slug }]
  const isSingle = options.length <= 1
  const tr = (key: string, fallback: string) => {
    const v = t(key)
    return !v || v === key ? fallback : v
  }

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button
          className="flex w-full items-center gap-2 rounded-md border border-sidebar-border/60 bg-sidebar-accent/30 px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent disabled:opacity-70"
          disabled={loading}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-sidebar-accent text-sidebar-accent-foreground">
            <Building className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-sidebar-foreground">{currentOrg.name}</span>
          <Chevron className="h-3.5 w-3.5 shrink-0 text-sidebar-muted" />
        </button>
      </DropdownTrigger>
      <DropdownContent align="start" className="w-56 bg-sidebar text-sidebar-foreground border-sidebar-border">
        <DropdownLabel className="text-sidebar-muted">{tr('organization.workspaces', 'Workspaces')}</DropdownLabel>
        <DropdownSeparator className="bg-sidebar-border" />
        {options.map((m) => (
          <DropdownItem
            key={m.orgId}
            onClick={() => { if (m.orgId !== currentOrg.id) void switchOrg(m.orgId) }}
            className="flex items-center gap-2 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground"
          >
            <span className="min-w-0 flex-1 truncate">{m.orgName}</span>
            {currentOrg.id === m.orgId && <Check className="h-4 w-4 shrink-0" />}
          </DropdownItem>
        ))}
        {isSingle && (
          <p className="px-2 py-1.5 text-xs text-sidebar-muted">
            {tr('organization.onlyWorkspace', 'This is your only workspace.')}
          </p>
        )}
      </DropdownContent>
    </Dropdown>
  )
}

// ---------------------------------------------------------------------------
// AdminUserMenu — user dropdown rendered in the sidebar bottom row.
// ---------------------------------------------------------------------------

/** Small plan pill shown next to the user across both menus. */
function PlanBadge({ badge }: { badge: { label: string; paid: boolean } }) {
  return (
    <span
      className={
        badge.paid
          ? 'inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-300'
          : 'inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground'
      }
    >
      {badge.paid ? <Crown className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
      {badge.label}
    </span>
  )
}

function AdminUserMenu({
  user,
  planBadge,
  onProfile,
  onSettings,
  onBilling,
  onSignOut,
  profileLabel,
  settingsLabel,
  subscriptionLabel,
  signOutLabel,
}: {
  user?: { fullName?: string; email: string; avatarUrl?: string }
  planBadge?: { label: string; paid: boolean } | null
  onProfile?: () => void
  onSettings?: () => void
  onBilling?: () => void
  onSignOut?: () => void
  profileLabel: string
  settingsLabel: string
  subscriptionLabel: string
  signOutLabel: string
}) {
  if (!user) return null
  const name = user.fullName?.trim() || user.email
  const initials =
    name.replace(/[^A-Za-z0-9]/g, ' ').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() ||
    (user.email[0]?.toUpperCase() ?? '?')
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button className="flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-sidebar-foreground">{name}</span>
        </button>
      </DropdownTrigger>
      <DropdownContent align="start" className="w-60 bg-sidebar text-sidebar-foreground border-sidebar-border">
        <DropdownLabel className="truncate text-sidebar-muted">{user.email}</DropdownLabel>
        <DropdownSeparator className="bg-sidebar-border" />
        {onProfile && (
          <DropdownItem onClick={onProfile} className="flex items-center gap-2 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground">
            <UserCog className="h-4 w-4 shrink-0" />
            <span className="flex-1">{profileLabel}</span>
          </DropdownItem>
        )}
        {onSettings && (
          <DropdownItem onClick={onSettings} className="flex items-center gap-2 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground">
            <SettingsIcon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{settingsLabel}</span>
          </DropdownItem>
        )}
        {onBilling && (
          <DropdownItem onClick={onBilling} className="flex items-center gap-2 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground">
            <CreditCard className="h-4 w-4 shrink-0" />
            <span className="flex-1">{subscriptionLabel}</span>
            {planBadge && <PlanBadge badge={planBadge} />}
          </DropdownItem>
        )}
        <DropdownSeparator className="bg-sidebar-border" />
        {onSignOut && (
          <DropdownItem onClick={onSignOut} className="flex items-center gap-2 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground">
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="flex-1">{signOutLabel}</span>
          </DropdownItem>
        )}
      </DropdownContent>
    </Dropdown>
  )
}

// ---------------------------------------------------------------------------
// AccessDenied — rendered in place of a page/plugin route whose declared
// permission the current user does not hold (RBAC route guard).
// ---------------------------------------------------------------------------

function AccessDenied({ tr }: { tr: (key: string, fallback: string) => string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-12 text-center">
      <ShieldAlert className="mb-3 h-10 w-10 text-muted-foreground" />
      <p className="text-lg font-semibold text-foreground">
        {tr('shell.accessDenied.title', 'Access restricted')}
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {tr('shell.accessDenied.message', "You don't have permission to view this page.")}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AdminNotifications — the sidebar notification bell. Fetches once on mount
// (degrades to an empty inbox if the notifications table/store is unavailable)
// and opens a functional inbox popover with mark-read / mark-all-read wired.
// ---------------------------------------------------------------------------

function AdminNotifications() {
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotifications()
  const [open, setOpen] = React.useState(false)
  const fetchedRef = React.useRef(false)
  React.useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    void fetchNotifications()
  }, [fetchNotifications])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative inline-flex shrink-0 items-center justify-center rounded-md p-2 text-sidebar-muted transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        <NotificationInbox
          notifications={notifications}
          onMarkRead={markAsRead}
          onMarkAllRead={markAllAsRead}
        />
      </PopoverContent>
    </Popover>
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
    permission: entry.permission as NavigationItem['permission'],
  }
}

type OrderedNavigationItem = NavigationItem & { position: number }

interface RouteEntry {
  path: string
  Component: React.ComponentType<Record<string, unknown>>
  /** Render edge-to-edge with no page padding wrapper (chat, kanban, canvas). */
  fullBleed?: boolean
  /** RBAC guard — when set and unsatisfied the route renders <AccessDenied>. */
  permission?: PermissionRequirement
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

function compareNavigation(a: NavigationItem & { position?: number }, b: NavigationItem & { position?: number }): number {
  const sectionDelta = sectionOrder(a.section) - sectionOrder(b.section)
  if (sectionDelta !== 0) return sectionDelta
  return (a.position ?? 0) - (b.position ?? 0)
}

function findModuleParent(
  item: OrderedNavigationItem,
  items: OrderedNavigationItem[],
): OrderedNavigationItem | null {
  const candidates = items
    .filter((candidate) =>
      candidate.section === item.section &&
      candidate.route !== item.route &&
      item.route.startsWith(`${candidate.route}/`)
    )
    .sort((a, b) => b.route.length - a.route.length)

  return candidates[0] ?? null
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
      ?.filter((child) => child.nav !== false)
      .map((child, index) => pageToNavigationItem(child, index))
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
      const Component = page.component as React.ComponentType<Record<string, unknown>>
      out.push({ path: page.path, Component, permission: page.permission })
      out.push({ path: `${page.path}/*`, Component, permission: page.permission })
    }
    if (page.children?.length) collectPageRoutes(page.children, out, entityRouteMap)
  }
  return out
}

function buildSettingsTabs(
  pluginTabs: PluginSettingsTab[],
  can: (feature: string, action?: PermissionAction) => boolean,
  hasSystem: (perm: SystemPermission) => boolean,
  t: (key: string, params?: Record<string, string | number>) => string,
  showOrgSettings: boolean,
  hasBilling: boolean,
): SettingsTab[] {
  const settingsTabs: SettingsTab[] = []

  // Subscription — present whenever billing is configured, gated (like the other
  // org tabs) on the system `manage_billing` permission. Route: /settings/subscription.
  if (hasBilling && hasSystem('manage_billing')) {
    const subLabel = t('settings.subscription')
    settingsTabs.push({
      id: 'subscription',
      label: subLabel === 'settings.subscription' ? 'Subscription' : subLabel,
      icon: <Crown className="h-4 w-4" />,
      iconName: 'Crown',
      component: <SubscriptionPage />,
    })
  }

  if (showOrgSettings) {
    // Org-management tabs are gated on the profile's SYSTEM permissions (the
    // grants-based can() has no team/permissions/locations feature). Owner and
    // no-RBAC profiles pass hasSystem() through, so the owner is never blocked.
    if (hasSystem('manage_team'))
      settingsTabs.push({ id: 'team', label: t('settings.team'), icon: <Users className="h-4 w-4" />, iconName: 'Users', component: <TeamTab /> })
    if (hasSystem('manage_permissions'))
      settingsTabs.push({ id: 'permissions', label: t('settings.permissions'), icon: <ShieldCheck className="h-4 w-4" />, iconName: 'ShieldCheck', component: <PermissionProfilesTab /> })
    if (hasSystem('manage_settings')) {
      settingsTabs.push(
        { id: 'locations', label: t('settings.locations'), icon: <MapPin className="h-4 w-4" />, iconName: 'MapPin', component: <LocationsCrudPage /> },
        { id: 'field-rules', label: t('settings.fieldRules'), icon: <SlidersHorizontal className="h-4 w-4" />, iconName: 'SlidersHorizontal', component: <ConnectedFieldRulesSettings /> },
      )
    }
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
      iconName: tab.icon ?? 'Puzzle',
      component: React.createElement(tab.component),
      // Flag plugin-contributed tabs so SettingsPage draws the core/plugins divider.
      isPlugin: true,
    })
  }

  return settingsTabs
}

function AdminShellInner({ appName, layout = 'sidebar', logo, pages = [], showSettings = true, showOrgSettings = false, showBranding = true, showOrgSwitcher = true, contentFrame = true, moduleNav, bottomNav, onBottomNavAction, mobileHeader }: AdminShellProps) {
  const runtime = usePluginRuntime()
  const t = useTranslation()
  const can = usePermissionOptional()
  // Composed access (role × plan). Nav + route guard use this to distinguish a
  // role denial (hide / AccessDenied) from a plan denial (Crown badge / UpgradePrompt).
  const access = useAccessOptional()
  const currentProfile = usePermissionsStore((s) => s.currentProfile)
  // Org-management (system) permission check. A null profile (owner / no RBAC
  // loaded) passes through so the owner is never blocked — the grants-based
  // owner bypass lives in permissions/context.tsx and is not duplicated here.
  const hasSystem = React.useCallback(
    (perm: SystemPermission) => {
      if (!currentProfile) return true
      // Owner is never blocked (mirrors the owner bypass in permissions/context).
      if (currentProfile.id === 'owner' || currentProfile.name?.toLowerCase() === 'owner') return true
      return currentProfile.systemPermissions?.includes(perm) ?? false
    },
    [currentProfile],
  )
  const tr = (key: string, fallback: string) => {
    const v = t(key)
    return !v || v === key ? fallback : v
  }
  const path = useAdminPath()
  const { user, signOut } = useAuth()

  // Billing surface — plans are seeded into the store from `config.billing` (see
  // BillingInitializer). A non-empty plan list is the signal that billing is
  // configured: it drives the Subscription settings tab, the user-menu item, and
  // the current-plan badge shown next to the user.
  const billingPlans = useBillingStore((s) => s.plans)
  const hasBilling = billingPlans.length > 0
  const orgPlan = useTenantOptional()?.org?.plan
  const planBadge = React.useMemo(
    () => (hasBilling ? resolvePlanBadge(orgPlan, billingPlans) : null),
    [hasBilling, orgPlan, billingPlans],
  )
  // Soft-limit monitoring — every limit key the active plan declares. The banner
  // only surfaces a key whose usage EXCEEDS its cap (used > max), the Notion-style
  // overshoot path (e.g. public bookings pushing clients past the free cap).
  const softLimitKeys = React.useMemo(() => {
    const plan = billingPlans.find((p) => p.id === (orgPlan || 'free'))
    return Object.keys(getPlanEntitlements(plan)?.limits ?? {})
  }, [billingPlans, orgPlan])

  // Navigation: plugin entries + custom pages (deduped, plugin order preserved).
  const navigation = React.useMemo<NavigationItem[]>(() => {
    // Plugin entries whose route is a sub-path of another plugin entry nest as
    // its children (same rule pages get below) — e.g. the courses modules
    // (/courses/members, /courses/sales…) group under /courses instead of
    // scattering across the rail. Sort by position first so parents land
    // before their children.
    const flat = runtime.navigation
      .map((entry) => ({ ...navEntryToItem(entry), position: entry.position }))
      .sort(compareNavigation)
    const items: OrderedNavigationItem[] = []
    for (const item of flat) {
      const parent = findModuleParent(item, items)
      if (parent) {
        const children = parent.children ?? [{
          ...parent,
          id: `${parent.id}:index`,
          children: undefined,
          position: -1,
        }]
        if (!children.some((child) => child.route === item.route)) {
          parent.children = [...children, item].sort(compareNavigation)
        }
        continue
      }
      items.push(item)
    }
    for (const [index, page] of pages.entries()) {
      // `nav: false` routes the page but keeps it out of the sidebar/topbar nav
      // (mobile-only pages reached via bottomNav/avatar). Routes are still built
      // from `pages` in collectPageRoutes below, so the page remains navigable.
      if (page.nav === false) continue
      const item = pageToNavigationItem(page, index + 1000)
      if (!item) continue

      const parent = findModuleParent(item, items)
      if (parent) {
        const children = parent.children ?? [{
          ...parent,
          id: `${parent.id}:index`,
          children: undefined,
          position: -1,
        }]
        if (!children.some((child) => child.route === item.route)) {
          parent.children = [...children, item].sort(compareNavigation)
        }
        continue
      }

      items.push(item)
    }
    // Access-aware nav gating. Role denial hides the entry (owner/no-profile pass
    // through). Plan denial KEEPS it (freemium discovery) with a Crown badge that
    // leads to the route's UpgradePrompt. Children follow the same rule.
    const decide = (perm?: NavigationItem['permission']): { keep: boolean; premium: boolean } => {
      if (!perm) return { keep: true, premium: false }
      const d = access.can(perm.feature, perm.action)
      if (!d.allowed && d.reason === 'role') return { keep: false, premium: false }
      return { keep: true, premium: !d.allowed && d.reason === 'plan' }
    }
    return items
      .map((item): OrderedNavigationItem | null => {
        const dec = decide(item.permission)
        if (!dec.keep) return null
        const children = item.children
          ?.map((child): NavigationItem | null => {
            const cd = decide(child.permission)
            return cd.keep ? { ...child, premium: cd.premium } : null
          })
          .filter((c): c is NavigationItem => c !== null)
        return { ...item, premium: dec.premium, children }
      })
      .filter((item): item is OrderedNavigationItem => item !== null)
      .sort(compareNavigation)
  }, [runtime.navigation, pages, access])

  // Command palette (⌘K + the topbar Search button). The palette owns the ⌘K
  // key listener, so it must be MOUNTED for the shortcut to work — the topbar
  // Search button drives the same shared layout store.
  const commandPaletteOpen = useLayoutStore((s) => s.commandPaletteOpen)
  const setCommandPaletteOpen = useLayoutStore((s) => s.setCommandPaletteOpen)
  const commandItems = React.useMemo<CommandItem[]>(() => {
    const navGroup = tr('layout.commandPalette.navigation', 'Navigation')
    const items: CommandItem[] = []
    for (const nav of navigation) {
      items.push({ id: nav.id, label: nav.label, icon: nav.icon, group: navGroup, action: () => navigateTo(nav.route) })
      for (const child of nav.children ?? []) {
        items.push({ id: child.id, label: `${nav.label} · ${child.label}`, icon: child.icon, group: navGroup, action: () => navigateTo(child.route) })
      }
    }
    return items
  }, [navigation])

  // Route table: plugin routes + custom pages, most-specific-first.
  const routes = React.useMemo<RouteEntry[]>(() => {
    const list: RouteEntry[] = []
    const entityRouteMap = new Map<string, string>()
    for (const r of runtime.routes as PluginRouteDefinition[]) {
      const Component = resolvePluginComponent(r) as React.ComponentType<Record<string, unknown>> | undefined
      if (Component) {
        list.push({ path: r.path, Component, fullBleed: r.fullBleed, permission: r.permission })
        list.push({ path: `${r.path}/*`, Component, fullBleed: r.fullBleed, permission: r.permission })
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
    () => buildSettingsTabs(runtime.settingsTabs as PluginSettingsTab[], can, hasSystem, t, showOrgSettings, hasBilling),
    [runtime.settingsTabs, can, hasSystem, t, showOrgSettings, hasBilling],
  )

  // Resolved chrome routes: profile lands on a dedicated /perfil|/profile page
  // if one is registered, else the Settings → Profile tab; billing only when a
  // matching route actually exists (no dead nav item otherwise).
  const profileRoute = React.useMemo(() => {
    const explicit = routes.find((r) => r.path === '/perfil' || r.path === '/profile')
    if (explicit) return explicit.path
    return showSettings ? '/settings/profile' : null
  }, [routes, showSettings])
  const onProfile = profileRoute ? () => navigateTo(profileRoute) : undefined
  // Subscription lives at the always-present /settings/subscription tab whenever
  // billing is configured — no need to hunt for a standalone billing route.
  const onBilling = hasBilling && showSettings ? () => navigateTo('/settings/subscription') : undefined

  // Contextual /settings sidebar (desktop sidebar layout only): the app rail is
  // replaced by "← Back to home" + the settings links, so settings isn't a menu
  // inside a menu. `coreSettingsTabs` mirrors what SettingsPage renders.
  const coreSettingsTabs = useCoreSettingsTabs({ showCompany: showBranding, showBranding })
  const allSettingsTabs = React.useMemo(
    () => [...coreSettingsTabs, ...settingsTabs],
    [coreSettingsTabs, settingsTabs],
  )
  const inSettings = showSettings && layout === 'sidebar' && (path === '/settings' || path.startsWith('/settings/'))
  const homeRoute = navigation[0]?.route ?? '/'
  // With the contextual sidebar the shell owns settings navigation, so it also
  // owns the active tab: parse it from the URL and drive SettingsPage as a
  // controlled component (bare /settings → first tab). This is what makes
  // clicking another settings link actually swap the content.
  const activeSettingsTab = inSettings
    ? (path === '/settings'
        ? allSettingsTabs[0]?.id
        : path.slice('/settings/'.length).split('/')[0])
    : undefined
  const settingsNavigation = React.useMemo<NavigationItem[]>(
    () => allSettingsTabs.map((tab) => ({
      id: `settings:${tab.id}`,
      label: tab.label,
      icon: tab.iconName ?? 'Settings',
      route: `/settings/${tab.id}`,
      // Plugin tabs land in the second group so the sidebar can head them
      // "Plugins", matching the divider the in-page nav used to draw.
      section: tab.isPlugin ? 'secondary' : 'main',
    })),
    [allSettingsTabs],
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

  // Access-aware route guard. A role denial renders <AccessDenied>; a plan denial
  // renders a full-page <UpgradePrompt> for the route's feature ("Premium feature"
  // + upgrade cards) instead of pretending the page doesn't exist.
  const routeDecision = match?.route.permission
    ? access.can(match.route.permission.feature, match.route.permission.action)
    : { allowed: true as const }
  const activeContent = ActiveComponent ? (
    !routeDecision.allowed ? (
      routeDecision.reason === 'plan' ? (
        <UpgradePrompt feature={match!.route.permission!.feature} />
      ) : (
        <AccessDenied tr={tr} />
      )
    ) : match.route.path === '/settings' || match.route.path === '/settings/*' ? (
      <SettingsPage tabs={allSettingsTabs} showCompany={showBranding} showBranding={showBranding} hideNav={inSettings} activeTabId={activeSettingsTab} />
    ) : (
      <ActiveComponent {...activeParams} />
    )
  ) : null

  const settingsBackLink = (
    <button
      onClick={() => navigateTo(homeRoute)}
      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
    >
      <ArrowLeft className="h-4 w-4 shrink-0" />
      <span className="truncate">{tr('settings.backToHome', 'Back to home')}</span>
    </button>
  )

  return (
    <ModuleLayoutProvider variant={moduleVariant}>
    <AppShell
      variant={layout}
      contentFrame={contentFrame}
      navigation={inSettings ? settingsNavigation : navigation}
      sidebarSectionLabels={inSettings ? {
        main: tr('settings.navLinks', 'Settings links'),
        secondary: tr('common.plugins', 'Plugins'),
      } : undefined}
      // Entering settings pushes forward (new rail in from the right); going
      // back to the app rail reverses it.
      sidebarNavKey={inSettings ? 'settings' : 'app'}
      sidebarNavDirection={inSettings ? 'forward' : 'back'}
      logo={logo ?? <span className="text-lg font-bold">{appName}</span>}
      user={shellUser}
      pageTitle={activePageTitle}
      // Bare /settings renders the first tab, so highlight it in the rail too.
      currentPath={inSettings && path === '/settings' ? `/settings/${allSettingsTabs[0]?.id ?? ''}` : path}
      bottomNav={bottomNav}
      onBottomNavAction={onBottomNavAction}
      mobileHeader={mobileHeader}
      onNavigate={(route) => navigateTo(route)}
      onSignOut={() => { void signOut() }}
      onProfile={onProfile}
      onBilling={onBilling}
      onSettings={() => navigateTo('/settings')}
      userPlan={planBadge ? { label: planBadge.label, paid: planBadge.paid } : undefined}
      billingLabel={tr('settings.subscription', 'Subscription')}
      sidebarTopContent={inSettings ? settingsBackLink : showOrgSwitcher ? <WorkspaceSwitcher /> : undefined}
      topbarStart={<WidgetSlot zone="shell.topbar.start" />}
      topbarEnd={<WidgetSlot zone="shell.topbar.end" />}
      notificationSlot={<AdminNotifications />}
      userMenuSlot={
        <AdminUserMenu
          user={shellUser}
          planBadge={planBadge}
          onProfile={onProfile}
          onSettings={() => navigateTo('/settings')}
          onBilling={onBilling}
          onSignOut={() => { void signOut() }}
          profileLabel={tr('settings.profile', 'Profile')}
          settingsLabel={tr('settings.title', 'Settings')}
          subscriptionLabel={tr('settings.subscription', 'Subscription')}
          signOutLabel={tr('auth.signOut', 'Sign out')}
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
            : (
              <div className="space-y-4 p-3 md:space-y-6 md:p-6">
                {softLimitKeys.length > 0 && <SoftLimitBanner keys={softLimitKeys} />}
                {activeContent}
              </div>
            )}
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
    <CommandPalette
      commands={commandItems}
      open={commandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
    />
    {/* Global upgrade dialog — opened imperatively by LimitGate / useLimitGuard. */}
    <UpgradeModal />
    </ModuleLayoutProvider>
  )
}

/** The shell + an auth gate in front of it. */
export function AdminShell(props: AdminShellProps) {
  return (
    <AuthGate
      requireAuth={props.requireAuth ?? true}
      appName={props.appName}
      logo={props.logo}
      loginLogo={props.loginLogo}
      layout={props.loginLayout}
      tagline={props.loginTagline}
      description={props.loginDescription}
      loginAmbassadors={props.loginAmbassadors}
      loginAmbassadorsLabel={props.loginAmbassadorsLabel}
      showOAuth={props.showOAuth}
      oauthProviders={props.oauthProviders}
    >
      <AdminShellInner {...props} />
    </AuthGate>
  )
}
AdminShell.displayName = 'AdminShell'
