import React from 'react'
import { useThemeStore } from './stores/theme.store'
import { useBillingStore } from './stores/billing.store'
import { useAuthStore } from './stores/auth.store'
import { usePermissionsStore } from './stores/permissions.store'
import { createSupabaseClient, getSupabaseClientOptional } from './lib/supabase'
import { setEntityRouteMap, resolveEntityHref } from './lib/entity-routes'
import { ToastProvider } from './components/notifications/ToastProvider'
import { RouterProvider, setGlobalRouter, hashRouterAdapter, type RouterAdapter } from './lib/router'
import { AppShell } from '@fayz-ai/ui'
import type { NavigationItem as UiNavigationItem } from '@fayz-ai/ui'
import { MockModeBanner } from './components/layout/MockModeBanner'
import { WidgetSlot } from '../plugins/WidgetSlot'
import { SettingsPage } from './components/settings/SettingsPage'
import { BillingPage } from './components/billing/BillingPage'
import { ChatFab } from './components/chat/ChatFab'
import { ChatPanel } from './components/chat/ChatPanel'
import { CommandPalette, type CommandItem, type EntitySearchResult, type EntitySearchFn } from './components/layout/CommandPalette'
import { useLayoutStore } from './stores/layout.store'
import { LoginPage } from './components/auth/LoginPage'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AuthAdapterProvider } from './lib/auth-context'
import { OrgAdapterProvider } from './lib/org-context'
import { createMockAuthAdapter } from './lib/auth-adapters/mock'
import { createSupabaseAuthAdapter } from './lib/auth-adapters/supabase'
import { createMockOrgAdapter } from './lib/org-adapters/mock'
import { createSupabaseOrgAdapter } from './lib/org-adapters/supabase'
import { OrgSwitcher } from './components/organization/OrgSwitcher'
import { OrgInitializer } from './components/organization/OrgInitializer'
import { PermissionGate } from '../permissions/PermissionGate'
import { ImpersonationBanner } from './components/organization/ImpersonationBanner'
import { TeamTab } from './components/organization/TeamTab'
import { PermissionProfilesTab } from './components/organization/PermissionProfilesTab'
import { ConnectedLocationsOverview } from './components/settings/ConnectedLocationsOverview'
import { LocationsCrudPage } from './components/settings/LocationsCrudPage'
import { LocationSwitchOverlay } from './components/layout/LocationSwitchOverlay'
import { ConnectedHolidaysSettings } from './components/settings/ConnectedHolidaysSettings'
import { ConnectedFieldRulesSettings } from './components/settings/ConnectedFieldRulesSettings'
import { Users, ShieldCheck, MapPin, CalendarOff, SlidersHorizontal, Puzzle } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { resolvePluginRuntime, PluginRuntimeProvider } from './lib/plugins'
import type { AuthAdapter } from './types/auth-adapter'
import type { OrgAdapter } from './types/org-adapter'
import type { NavigationItem } from './types/layout'
import type { Plan, PlanConfig } from './types/billing'
import { normalizePlanConfig } from './types/billing'
import type { PluginManifest, TenantPluginBinding } from '@fayz-ai/core'
import type {
  PluginPermissionRequirement,
  ResolvedPluginManifest,
  PluginSettingsTab,
} from './types/plugins'
import type { CreateThemeOptions } from './config/theme/utils'
import { resolveTheme } from './config/theme/utils'
import type { SaasTheme } from './config/theme/tokens'
import type { AuthProvider } from './types/auth'
import type { PermissionsConfig, PermissionAction } from './types/permissions'
import { useOrganizationStore } from './stores/organization.store'
import { usePermission } from './hooks/usePermission'
import { useTenantPlugins } from './hooks/useTenantPlugins'
import { I18nProvider, builtInLocales } from './lib/i18n'
import { useLocaleStore } from './stores/locale.store'
import { setDefaultCurrency, setCurrentLocale, registerTranslations } from '@fayz-ai/core'
import { useTranslation } from './hooks/useTranslation'

// ---------------------------------------------------------------------------
// Page config — unifies navigation + routing in one declaration
// ---------------------------------------------------------------------------
export interface PageConfig {
  /** URL path, e.g. '/' or '/clients' */
  path: string
  /** Sidebar/nav label */
  label: string
  /** Lucide icon name */
  icon: string
  /** The page component to render */
  component: React.ComponentType
  /** Navigation section (default: 'main') */
  section?: 'main' | 'secondary' | 'settings'
  /** Sort order within section (auto-incremented if omitted) */
  position?: number
  /** Optional badge */
  badge?: string | number
  /** Permission required to access this page */
  permission?: { feature: string; action: PermissionAction }
  /** Child pages — renders as a dropdown in topbar, collapsible in sidebar.
   *  Children can omit `component` to be navigation-only links (pointing to routes the parent handles). */
  children?: Array<Omit<PageConfig, 'component'> & { component?: React.ComponentType }>
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
export interface SaasAppConfig {
  /** App display name (used in sidebar header) */
  name: string
  /** Logo — string renders as initial badge, ReactNode renders as-is */
  logo?: string | React.ReactNode
  /** Supabase project URL — one project per SaaS (core in saas_core schema, data in public) */
  supabaseUrl?: string
  /** Supabase anon key */
  supabaseAnonKey?: string
  /** Theme overrides — use SaasTheme (friendly) or CreateThemeOptions (granular) */
  theme?: CreateThemeOptions | SaasTheme
  /** Default theme mode: 'light' or 'dark'. User can toggle. Default: 'light' */
  defaultThemeMode?: 'light' | 'dark'
  /** Layout variant (default: 'sidebar') */
  layout?: 'sidebar' | 'topbar' | 'minimal'
  /** Content floats in a rounded frame over the sidebar background (default: true). Set false to disable. */
  sidebarFrame?: boolean
  /** Vertical-specific pages */
  pages: PageConfig[]
  /** Plugins to register */
  plugins?: PluginManifest[]
  /** Runtime plugin activation for tenant-aware apps */
  pluginRuntime?: {
    /** Opt into loading tenant plugin bindings from the backend RPC. Static apps should leave this off. */
    hydrateTenantPlugins?: boolean
    tenantPlugins?: TenantPluginBinding[]
    resolveTenantPlugins?: (context: {
      tenant: { id: string; slug: string; verticalId?: string; plan?: string } | null
      user: { id: string } | null
    }) => TenantPluginBinding[] | undefined
  }
  /** Router adapter (default: hashRouterAdapter) */
  router?: RouterAdapter
  /** Billing configuration */
  billing?: {
    plans: PlanConfig[]
    stripePublishableKey?: string
  }
  /** AI chat configuration */
  chat?: {
    enabled?: boolean
    systemPrompt?: string
    apiEndpoint?: string
    title?: string
  }
  /** Notification configuration */
  notifications?: {
    changelogUrl?: string
  }
  /** Locale / i18n configuration */
  locale?: {
    default?: string
    supported?: string[]
    translations?: Record<string, Record<string, string>>
    /** ISO 4217 currency code for all currency fields (e.g. 'BRL'). Inferred from locale when omitted. */
    currency?: string
  }
  /** Mock user for demo/dev (will be replaced by auth in production) */
  user?: {
    fullName: string
    email: string
    avatarUrl?: string
  }
  /** Auth configuration */
  auth?: {
    adapter?: AuthAdapter | 'mock' | 'supabase'
    requireAuth?: boolean
    loginLogo?: React.ReactNode
    loginLayout?: 'split' | 'centered'
    loginTagline?: string
    loginDescription?: string
    showOAuth?: boolean
    oauthProviders?: Exclude<AuthProvider, 'email'>[]
  }
  /** Organization / multi-tenant configuration */
  organization?: {
    adapter?: OrgAdapter | 'mock' | 'supabase'
    multiOrg?: boolean
  }
  /** Vertical/niche ID — auto-set on tenant creation, skips niche selection in onboarding */
  verticalId?: string
  /** Permission profiles configuration */
  permissions?: PermissionsConfig
  /** Additional settings tabs to merge with built-in ones */
  settingsTabs?: { id: string; label: string; component: React.ReactNode }[]
  /** Set to false to hide built-in Settings page (default: true) */
  showSettings?: boolean
  /** Set to false to hide built-in Billing page (default: true when plans provided) */
  showBilling?: boolean
  /** Custom mobile bottom nav items (max 5). If omitted, auto-picks first main items. */
  bottomNav?: Array<{ label: string; icon: string; route: string }>
}

// ---------------------------------------------------------------------------
// Internal: build NavigationItem[] from PageConfig[] + built-ins
// ---------------------------------------------------------------------------
type RouteEntry = {
  component: React.ComponentType<any>
  permission?: PluginPermissionRequirement
  plugin?: ResolvedPluginManifest
}

function sortNavigation(
  navigation: (NavigationItem & { permission?: PluginPermissionRequirement })[],
): (NavigationItem & { permission?: PluginPermissionRequirement })[] {
  return [...navigation].sort((a, b) => {
    const sectionOrder = { main: 0, secondary: 1, settings: 2 }
    const sa = sectionOrder[a.section] ?? 1
    const sb = sectionOrder[b.section] ?? 1
    if (sa !== sb) return sa - sb
    return a.position - b.position
  })
}

function buildNavigation(
  pages: PageConfig[],
  config: SaasAppConfig
): { navigation: (NavigationItem & { permission?: PluginPermissionRequirement })[]; routes: Map<string, RouteEntry>; entityRouteMap: Map<string, string> } {
  const navigation: (NavigationItem & { permission?: PluginPermissionRequirement })[] = []
  const routes = new Map<string, RouteEntry>()
  // Maps "archetype:kind" (e.g. "person:staff") or "archetype" to route path
  const entityRouteMap = new Map<string, string>()

  // Vertical pages
  let mainPos = 0
  let secondaryPos = 0
  for (const page of pages) {
    const section = page.section ?? 'main'
    const position = page.position ?? (section === 'main' ? mainPos++ : secondaryPos++)

    // Build child navigation items + routes
    const childNavItems: NavigationItem[] = []
    if (page.children) {
      for (const child of page.children) {
        childNavItems.push({
          id: child.path.slice(1).replace(/\//g, '-'),
          label: child.label,
          icon: child.icon,
          route: child.path,
          section,
          position: 0,
          badge: child.badge,
        })
        // Only register route if child has its own component and path isn't already handled
        if (child.component && !routes.has(child.path)) {
          if ((child.component as any)?.__isCrudPage) {
            ;(child.component as any).__crudBasePath = child.path
            const eDef = (child.component as any).__entityDef
            if (eDef?.data?.archetypeKind) {
              entityRouteMap.set(`${eDef.data.archetype ?? ''}:${eDef.data.archetypeKind}`, child.path)
            } else if (eDef?.data?.archetype) {
              entityRouteMap.set(eDef.data.archetype, child.path)
            }
          }
          routes.set(child.path, { component: child.component, permission: child.permission })
        }
      }
    }

    navigation.push({
      id: page.path === '/' ? 'home' : page.path.slice(1).replace(/\//g, '-'),
      label: page.label,
      icon: page.icon,
      route: page.path,
      section,
      position,
      badge: page.badge,
      permission: page.permission,
      ...(childNavItems.length > 0 ? { children: childNavItems } : {}),
    })
    // Set basePath on CRUD pages so they know their mount point
    if ((page.component as any)?.__isCrudPage) {
      ;(page.component as any).__crudBasePath = page.path
      const eDef = (page.component as any).__entityDef
      if (eDef?.data?.archetypeKind) {
        entityRouteMap.set(`${eDef.data.archetype ?? ''}:${eDef.data.archetypeKind}`, page.path)
      } else if (eDef?.data?.archetype) {
        entityRouteMap.set(eDef.data.archetype, page.path)
      }
    }
    routes.set(page.path, { component: page.component, permission: page.permission })
  }

  // Built-in Billing page (route exists but no sidebar nav item — accessed via user dropdown)
  const showBilling = config.showBilling ?? (config.billing?.plans && config.billing.plans.length > 0)
  if (showBilling) {
    routes.set('/billing', { component: BillingPage })
  }

  // Built-in Settings page (route exists but no sidebar nav item — accessed via user dropdown)
  const showSettings = config.showSettings !== false
  if (showSettings) {
    routes.set('/settings', { component: SettingsPage })
  }

  return { navigation: sortNavigation(navigation), routes, entityRouteMap }
}

// ---------------------------------------------------------------------------
// Internal: render logo from string or ReactNode
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Global entity search — queries persons, products, services in parallel
// ---------------------------------------------------------------------------

function createGlobalEntitySearch(): EntitySearchFn {
  return async (query: string): Promise<EntitySearchResult[]> => {
    const supabase = getSupabaseClientOptional()
    if (!supabase) return []

    const term = `%${query}%`
    const limit = 8

    const [persons, products, services] = await Promise.all([
      supabase.schema('saas_core').from('persons')
        .select('id, name, email, phone, kind')
        .eq('is_active', true)
        .ilike('name', term)
        .limit(limit)
        .then((r: any) => r.data ?? []),
      supabase.schema('saas_core').from('products')
        .select('id, name, sku, price')
        .eq('is_active', true)
        .ilike('name', term)
        .limit(limit)
        .then((r: any) => r.data ?? []),
      supabase.schema('saas_core').from('services')
        .select('id, name, price, duration_minutes')
        .eq('is_active', true)
        .ilike('name', term)
        .limit(limit)
        .then((r: any) => r.data ?? []),
    ])

    const results: EntitySearchResult[] = []

    for (const p of persons) {
      const kind = p.kind ? String(p.kind) : 'person'
      const kindLabel = kind.charAt(0).toUpperCase() + kind.slice(1) + 's'
      results.push({
        id: p.id,
        label: p.name,
        subtitle: [p.email, p.phone].filter(Boolean).join(' · ') || undefined,
        group: kindLabel,
        icon: 'User',
        data: { ...p, archetype: 'person' },
      })
    }
    for (const p of products) {
      results.push({
        id: p.id,
        label: p.name,
        subtitle: [p.sku, p.price != null ? `$${p.price}` : null].filter(Boolean).join(' · ') || undefined,
        group: 'Products',
        icon: 'Box',
        data: { ...p, archetype: 'product' },
      })
    }
    for (const s of services) {
      results.push({
        id: s.id,
        label: s.name,
        subtitle: [
          s.duration_minutes ? `${s.duration_minutes}min` : null,
          s.price != null ? `$${s.price}` : null,
        ].filter(Boolean).join(' · ') || undefined,
        group: 'Services',
        icon: 'Sparkles',
        data: { ...s, archetype: 'service' },
      })
    }

    return results
  }
}

function CommandPaletteWrapper({ navigation, routerAdapter }: { navigation: NavigationItem[]; routerAdapter: RouterAdapter }) {
  const { commandPaletteOpen, setCommandPaletteOpen } = useLayoutStore()

  const entitySearch = React.useMemo(() => createGlobalEntitySearch(), [])

  const commands: CommandItem[] = React.useMemo(() => {
    const items: CommandItem[] = []
    for (const nav of navigation) {
      items.push({
        id: nav.id,
        label: nav.label,
        icon: nav.icon,
        group: 'Pages',
        action: () => routerAdapter.navigate(nav.route),
      })
      if ((nav as any).children) {
        for (const child of (nav as any).children) {
          items.push({
            id: child.id,
            label: child.label,
            icon: child.icon,
            group: nav.label,
            action: () => routerAdapter.navigate(child.route),
          })
        }
      }
    }
    // System actions
    items.push(
      { id: 'settings', label: 'Settings', icon: 'Settings', group: 'System', action: () => routerAdapter.navigate('/settings') },
      { id: 'billing', label: 'Billing', icon: 'CreditCard', group: 'System', action: () => routerAdapter.navigate('/billing') },
    )
    return items
  }, [navigation, routerAdapter])

  const handleEntitySelect = React.useCallback((result: EntitySearchResult) => {
    const archetype = result.data?.archetype ? String(result.data.archetype) : undefined
    const kind = result.data?.kind ? String(result.data.kind) : undefined
    const href = resolveEntityHref(result.id, archetype, kind)
    routerAdapter.navigate(href)
  }, [routerAdapter])

  return React.createElement(CommandPalette, {
    commands,
    open: commandPaletteOpen,
    onOpenChange: setCommandPaletteOpen,
    onEntitySearch: entitySearch,
    onEntitySelect: handleEntitySelect,
  })
}

function renderLogo(name: string, logo?: string | React.ReactNode): React.ReactNode {
  if (logo && typeof logo !== 'string') return logo
  const initial = typeof logo === 'string' ? logo : name.charAt(0).toUpperCase()
  return React.createElement('div', { className: 'flex items-center gap-3' },
    React.createElement('div', {
      className: 'w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm',
    }, initial),
    React.createElement('span', { className: 'font-bold text-lg' }, name),
  )
}

// ---------------------------------------------------------------------------
// Internal: resolve auth adapter from config
// ---------------------------------------------------------------------------
function resolveAuthAdapter(config: SaasAppConfig): AuthAdapter | null {
  if (!config.auth?.adapter) return null
  if (typeof config.auth.adapter === 'object') return config.auth.adapter
  if (config.auth.adapter === 'mock') return createMockAuthAdapter()
  if (config.auth.adapter === 'supabase') {
    if (!getSupabaseClientOptional()) return createMockAuthAdapter()
    return createSupabaseAuthAdapter()
  }
  return null
}

// ---------------------------------------------------------------------------
// Internal: resolve org adapter from config
// ---------------------------------------------------------------------------
function resolveOrgAdapter(config: SaasAppConfig): OrgAdapter | null {
  if (!config.organization?.adapter) return null
  if (typeof config.organization.adapter === 'object') return config.organization.adapter
  if (config.organization.adapter === 'mock') {
    return createMockOrgAdapter(config.permissions?.defaultProfiles)
  }
  if (config.organization.adapter === 'supabase') {
    if (!getSupabaseClientOptional()) return createMockOrgAdapter(config.permissions?.defaultProfiles)
    return createSupabaseOrgAdapter()
  }
  return null
}

function buildSettingsTabs(
  config: SaasAppConfig,
  pluginTabs: PluginSettingsTab[],
  can: (feature: string, action: PermissionAction) => boolean,
  t: (key: string, params?: Record<string, string | number>) => string,
): { id: string; label: string; icon?: React.ReactNode; component: React.ReactNode }[] {
  const settingsTabs: { id: string; label: string; icon?: React.ReactNode; component: React.ReactNode }[] = []

  if (config.organization) {
    settingsTabs.push(
      { id: 'team', label: t('settings.team'), icon: React.createElement(Users, { className: 'h-4 w-4' }), component: React.createElement(TeamTab) },
      { id: 'permissions', label: t('settings.permissions'), icon: React.createElement(ShieldCheck, { className: 'h-4 w-4' }), component: React.createElement(PermissionProfilesTab) },
      { id: 'locations', label: t('settings.locations'), icon: React.createElement(MapPin, { className: 'h-4 w-4' }), component: React.createElement(LocationsCrudPage) },
      { id: 'field-rules', label: t('settings.fieldRules'), icon: React.createElement(SlidersHorizontal, { className: 'h-4 w-4' }), component: React.createElement(ConnectedFieldRulesSettings) },
    )
  }

  if (config.settingsTabs) {
    settingsTabs.push(...config.settingsTabs)
  }

  for (const tab of pluginTabs) {
    if (tab.permission && !can(tab.permission.feature, tab.permission.action)) {
      continue
    }

    const IconComp = tab.icon ? (LucideIcons as any)[tab.icon] ?? Puzzle : Puzzle
    // Try to translate plugin settings tab label via t('settings.plugin.{id}'), fallback to raw label
    const pluginLabelKey = `settings.plugin.${tab.id}`
    const pluginLabel = t(pluginLabelKey)
    settingsTabs.push({
      id: tab.id,
      label: pluginLabel === pluginLabelKey ? tab.label : pluginLabel,
      icon: React.createElement(IconComp, { className: 'h-4 w-4' }),
      component: React.createElement(tab.component),
      isPlugin: true,
    } as any)
  }

  return settingsTabs
}

// ---------------------------------------------------------------------------
// createSaasApp — returns a ready-to-render App component
// ---------------------------------------------------------------------------
export function createSaasApp(config: SaasAppConfig): React.FC {
  // Initialize Supabase — single project, core tables in saas_core schema
  if (config.supabaseUrl && config.supabaseAnonKey) {
    createSupabaseClient(config.supabaseUrl, config.supabaseAnonKey)
  }

  const routerAdapter = config.router ?? hashRouterAdapter()
  setGlobalRouter(routerAdapter)

  const { navigation: baseNavigation, routes: baseRoutes, entityRouteMap } = buildNavigation(config.pages, config)
  setEntityRouteMap(entityRouteMap)
  const layout = config.layout ?? 'sidebar'
  const logoNode = renderLogo(config.name, config.logo)

  // Resolve adapters at creation time
  const authAdapter = resolveAuthAdapter(config)
  const orgAdapter = resolveOrgAdapter(config)
  const requireAuth = config.auth?.requireAuth ?? !!authAdapter

  // Login page component
  const LoginPageWrapper: React.FC = () => {
    return React.createElement(LoginPage, {
      appName: config.name,
      logo: config.auth?.loginLogo ?? logoNode,
      layout: config.auth?.loginLayout ?? 'split',
      tagline: config.auth?.loginTagline,
      description: config.auth?.loginDescription,
      showOAuth: config.auth?.showOAuth,
      oauthProviders: config.auth?.oauthProviders,
      onSuccess: () => { routerAdapter.navigate('/') },
    })
  }

  // The inner app (authenticated content)
  const AppContent: React.FC = () => {
    const route = routerAdapter.usePathname()
    const authUser = useAuthStore((s) => s.user)
    const currentOrg = useOrganizationStore((s) => s.currentOrg)
    const currentProfile = usePermissionsStore((s) => s.currentProfile)
    const { can } = usePermission()
    const shouldHydrateTenantPlugins =
      config.pluginRuntime?.hydrateTenantPlugins === true &&
      !config.pluginRuntime?.resolveTenantPlugins &&
      !config.pluginRuntime?.tenantPlugins
    const { tenantPlugins: hydratedTenantPlugins } = useTenantPlugins({ enabled: shouldHydrateTenantPlugins })
    const { t } = useTranslation()

    // Derive display user from auth or config fallback
    const user = authUser
      ? { fullName: authUser.fullName, email: authUser.email, avatarUrl: authUser.avatarUrl }
      : config.user

    // Merge plugin-declared features into permission store (must be before any early return)
    React.useEffect(() => {
      const pf = config.plugins?.flatMap((p) => p.declaredFeatures ?? []) ?? []
      if (pf.length === 0) return
      const store = usePermissionsStore.getState()
      const existing = new Set(store.features.map((f) => f.id))
      const toAdd = pf.filter((f) => !existing.has(f.id))
      if (toAdd.length > 0) store.setFeatures([...store.features, ...toAdd])
    }, [])

    // If we're on the login route, render login page
    if (route === '/login') {
      return React.createElement(LoginPageWrapper)
    }

    const tenantPluginBindings = config.pluginRuntime?.resolveTenantPlugins?.({
      tenant: currentOrg
        ? {
            id: currentOrg.id,
            slug: currentOrg.slug,
            verticalId: currentOrg.verticalId,
            plan: currentOrg.plan,
          }
        : null,
      user: authUser ? { id: authUser.id } : null,
    }) ?? config.pluginRuntime?.tenantPlugins ?? hydratedTenantPlugins
    const usesHydratedTenantBindings = shouldHydrateTenantPlugins && !!currentOrg

    const initialPluginRuntime = resolvePluginRuntime({
      plugins: config.plugins as any,
      tenantPlugins: tenantPluginBindings as any,
      hasTenantBindings: usesHydratedTenantBindings ? true : undefined,
      context: {
        tenant: currentOrg
          ? {
              id: currentOrg.id,
              slug: currentOrg.slug,
              verticalId: currentOrg.verticalId,
              plan: currentOrg.plan,
            }
          : null,
        user: authUser
          ? {
              id: authUser.id,
              role: currentProfile?.id,
            }
          : null,
        currentPath: route,
        matchedPath: route,
        layout,
        hasPermission: (requirement) => can(requirement.feature, requirement.action),
      },
    })

    const navigation = sortNavigation([
      ...baseNavigation,
      ...initialPluginRuntime.navigation.map((item) => ({
        id: item.id ?? item.route,
        label: item.label,
        icon: item.icon ?? 'Package',
        route: item.route,
        section: item.section,
        position: item.position,
        badge: item.badge,
        permission: item.permission,
      })),
    ])
    const routes = new Map(baseRoutes)
    for (const pluginRoute of initialPluginRuntime.routes) {
      routes.set(pluginRoute.path, {
        component: pluginRoute.component as any,
        permission: pluginRoute.permission,
        plugin: pluginRoute.plugin as any,
      })
    }

    // Resolve page: exact match first, then prefix match for CRUD sub-routes and plugin routes
    let matchedPath = route
    let routeEntry = routes.get(route)
    if (!routeEntry) {
      // Try prefix match (e.g. /services/new → /services, /financial/settings/... → /financial)
      for (const [path, entry] of routes) {
        if (path !== '/' && route.startsWith(path + '/')) {
          routeEntry = entry
          matchedPath = path
          break
        }
      }
    }
    const pluginRuntime = {
      ...initialPluginRuntime,
      context: {
        ...initialPluginRuntime.context,
        matchedPath,
      },
    }
    const NotFoundPage: React.FC = () => React.createElement('div', { className: 'flex flex-col items-center justify-center py-24 text-center' },
      React.createElement('h1', { className: 'text-6xl font-bold text-muted-foreground/20 mb-4' }, t('app.notFound.title')),
      React.createElement('h2', { className: 'text-xl font-semibold mb-2' }, t('app.notFound.heading')),
      React.createElement('p', { className: 'text-sm text-muted-foreground mb-6' }, t('app.notFound.message')),
      React.createElement('button', {
        className: 'rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors',
        onClick: () => routerAdapter.navigate('/'),
      }, t('app.notFound.goToDashboard')),
    )
    const PageComponent = routeEntry?.component ?? NotFoundPage
    const pagePermission = routeEntry?.permission
    const pageTitle = navigation.find((n) => n.route === matchedPath)?.label ?? navigation.find((n) => n.route === route)?.label ?? navigation[0]?.label ?? ''
    const settingsTabs = buildSettingsTabs(config, pluginRuntime.settingsTabs as any, can, t)

    const handleSignOut = async () => {
      if (authAdapter) {
        try {
          await authAdapter.signOut()
          useAuthStore.getState().reset()
          useAuthStore.getState().setInitialized(true)
        } catch {
          // ignore sign out errors
        }
        routerAdapter.navigate('/login')
      }
    }

    const renderedPage = matchedPath === '/settings' && config.showSettings !== false
      ? React.createElement(SettingsPage, {
          extraTabs: settingsTabs,
          beforeContent: React.createElement(WidgetSlot, {
            zone: 'settings.before',
            className: 'space-y-4',
            contextOverrides: { matchedPath },
          }),
          afterContent: React.createElement(WidgetSlot, {
            zone: 'settings.after',
            className: 'space-y-4',
            contextOverrides: { matchedPath },
          }),
        })
      : React.createElement(PageComponent, routeEntry?.plugin ? {
          plugin: routeEntry.plugin,
          runtime: pluginRuntime.context,
          config: routeEntry.plugin.config,
        } : undefined)

    // Build page element — wrap in PermissionGate if page has permission config
    const pageContent = React.createElement('div', { key: matchedPath, className: 'saas-page-enter space-y-6 p-6' },
      React.createElement(WidgetSlot, {
        zone: 'page.before',
        className: 'space-y-4',
        contextOverrides: { matchedPath },
      }),
      renderedPage,
      React.createElement(WidgetSlot, {
        zone: 'page.after',
        className: 'space-y-4',
        contextOverrides: { matchedPath },
      }),
    )
    const pageElement: React.ReactNode = pagePermission
      ? React.createElement(
          PermissionGate,
          {
            feature: pagePermission.feature,
            action: pagePermission.action,
            fallback: React.createElement('div', { className: 'flex items-center justify-center py-24' },
              React.createElement('div', { className: 'text-center' },
                React.createElement('h2', { className: 'text-xl font-semibold mb-2' }, t('app.accessDenied.heading')),
                React.createElement('p', { className: 'text-muted-foreground' }, t('app.accessDenied.message'))
              )
            ),
            children: pageContent,
          },
        )
      : pageContent

    // Build orgSwitcher if configured
    const orgSwitcherElement = orgAdapter
      ? React.createElement(OrgSwitcher)
      : undefined

    const content = React.createElement(
      PluginRuntimeProvider,
      { value: pluginRuntime },
      React.createElement(
        React.Fragment,
        null,
        React.createElement(MockModeBanner),
        React.createElement(ImpersonationBanner),
        React.createElement(
          AppShell,
          {
            variant: layout,
            sidebarFrame: config.sidebarFrame !== false,
            navigation: navigation as unknown as UiNavigationItem[],
            user,
            pageTitle: undefined,
            currentPath: matchedPath,
            onNavigate: (path: string) => { routerAdapter.navigate(path) },
            onSignOut: authAdapter ? handleSignOut : () => console.log('sign out'),
            onSettings: () => { routerAdapter.navigate('/settings') },
            onBilling: routes.has('/billing') ? () => { routerAdapter.navigate('/billing') } : undefined,
            logo: logoNode,
            orgSwitcher: orgSwitcherElement,
            topbarStart: React.createElement(WidgetSlot, {
              zone: 'shell.topbar.start',
              className: 'flex items-center gap-2',
              contextOverrides: { matchedPath },
            }),
            topbarEnd: React.createElement(WidgetSlot, {
              zone: 'shell.topbar.end',
              className: 'flex items-center gap-2',
              contextOverrides: { matchedPath },
            }),
            sidebarTopContent: React.createElement(WidgetSlot, {
              zone: 'shell.sidebar.before-nav',
              className: 'space-y-2',
              contextOverrides: { matchedPath },
            }),
            sidebarFooterContent: React.createElement(WidgetSlot, {
              zone: 'shell.sidebar.footer',
              className: 'space-y-2',
              contextOverrides: { matchedPath },
            }),
            bottomNav: config.bottomNav,
          },
          pageElement,
        ),
        // Org initializer
        orgAdapter ? React.createElement(OrgInitializer, { verticalId: config.verticalId }) : null,
        // Location switch overlay
        React.createElement(LocationSwitchOverlay),
        // Chat
        config.chat?.enabled !== false && config.chat
          ? React.createElement(React.Fragment, null,
              React.createElement(ChatFab, { apiEndpoint: config.chat.apiEndpoint, systemPrompt: config.chat.systemPrompt }),
              React.createElement(ChatPanel, { title: config.chat.title, apiEndpoint: config.chat.apiEndpoint, systemPrompt: config.chat.systemPrompt }),
            )
          : null,
        React.createElement(WidgetSlot, {
          zone: 'shell.floating',
          contextOverrides: { matchedPath },
        }),
        // Command palette
        React.createElement(CommandPaletteWrapper, { navigation, routerAdapter }),
      ),
    )

    // Wrap in ProtectedRoute if auth is required
    if (requireAuth && authAdapter) {
      return React.createElement(
        ProtectedRoute,
        { onUnauthenticated: () => { routerAdapter.navigate('/login') } },
        content,
      )
    }

    return content
  }

  // The full App component
  const SaasApp: React.FC = () => {
    const initialize = useThemeStore((s) => s.initialize)
    const setOverrides = useThemeStore((s) => s.setOverrides)
    const setPlans = useBillingStore((s) => s.setPlans)
    const setFeatures = usePermissionsStore((s) => s.setFeatures)

    const setMode = useThemeStore((s) => s.setMode)

    React.useEffect(() => {
      if (config.theme) {
        const isSaasTheme = 'brand' in config.theme && ('radius' in config.theme || 'sidebar' in config.theme || 'font' in config.theme)
        const resolved = isSaasTheme ? resolveTheme(config.theme as SaasTheme) : config.theme as CreateThemeOptions
        setOverrides(resolved)
      }
      // Set default mode if no user preference saved
      if (config.defaultThemeMode && !localStorage.getItem('saas-core:theme-mode')) {
        setMode(config.defaultThemeMode)
      }
      initialize()
    }, [initialize, setOverrides, setMode])

    React.useEffect(() => {
      if (config.billing?.plans) {
        setPlans(config.billing.plans.map(normalizePlanConfig) as any)
      }
    }, [setPlans])

    // Initialize permissions config (consumer-declared only; plugin features merged in AppContent)
    React.useEffect(() => {
      if (config.permissions?.features) {
        setFeatures(config.permissions.features)
      }
    }, [setFeatures])

    // Initialize locale on the unified @fayz-ai/core i18n.
    React.useEffect(() => {
      setCurrentLocale(config.locale?.default ?? 'en')
      setDefaultCurrency(config.locale?.currency)
    }, [])

    let inner: React.ReactNode = React.createElement(
      RouterProvider,
      { value: routerAdapter },
      React.createElement(ToastProvider, null),
      React.createElement(AppContent),
    )

    // Wrap in OrgAdapterProvider if adapter is configured
    if (orgAdapter) {
      inner = React.createElement(
        OrgAdapterProvider,
        { value: orgAdapter, children: inner },
      )
    }

    // Wrap in AuthAdapterProvider if adapter is configured
    if (authAdapter) {
      inner = React.createElement(
        AuthAdapterProvider,
        { value: authAdapter, children: inner },
      )
    }

    // Merge built-in locale packs + plugin locales + consumer overrides
    const mergedTranslations: Record<string, Record<string, string>> = {}
    const supportedLocales = config.locale?.supported ?? ['en', 'pt-BR']
    for (const loc of supportedLocales) {
      // Layer 1: built-in core translations
      const layer: Record<string, string> = { ...(builtInLocales[loc] ?? {}) }
      // Layer 2: plugin translations (each plugin can ship its own locales)
      if (config.plugins) {
        for (const plugin of config.plugins) {
          if (plugin.locales?.[loc]) {
            Object.assign(layer, plugin.locales[loc])
          }
        }
      }
      // Layer 3: consumer app overrides (highest priority)
      Object.assign(layer, config.locale?.translations?.[loc] ?? {})
      mergedTranslations[loc] = layer
    }
    // Register into @fayz-ai/core so the shimmed useTranslation resolves these keys.
    registerTranslations(mergedTranslations)

    // Wrap in I18nProvider (outermost)
    inner = React.createElement(I18nProvider, {
      value: {
        defaultLocale: config.locale?.default ?? 'en',
        supported: supportedLocales,
        translations: mergedTranslations,
      }
    }, inner)

    return inner as React.JSX.Element
  }

  return SaasApp
}
