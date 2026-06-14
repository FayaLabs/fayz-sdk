import * as React from 'react'
import { AppShell, type NavigationItem } from '@fayz-ai/ui'
import { useAuth } from '@fayz-ai/auth'
import { usePluginRuntime, resolvePluginComponent, useTranslation } from '@fayz-ai/core'
import type { PluginNavigationEntry, PluginRouteDefinition } from '@fayz-ai/core'
import { useAdminPath, navigateTo, matchRoute, routeScore } from './routing'
import { LoginPage } from './LoginPage'
import type { CustomPage } from './config'
import type { AuthProvider } from '@fayz-ai/core'

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
  showOAuth?: boolean
  oauthProviders?: Exclude<AuthProvider, 'email'>[]
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

interface RouteEntry {
  path: string
  Component: React.ComponentType<Record<string, unknown>>
}

function AdminShellInner({ appName, layout = 'sidebar', logo, pages = [] }: AdminShellProps) {
  const runtime = usePluginRuntime()
  const t = useTranslation()
  const tr = (key: string, fallback: string) => {
    const v = t(key)
    return !v || v === key ? fallback : v
  }
  const path = useAdminPath()
  const { user, signOut } = useAuth()

  // Navigation: plugin entries + custom pages (deduped, plugin order preserved).
  const navigation = React.useMemo<NavigationItem[]>(() => {
    const items = runtime.navigation.map(navEntryToItem)
    for (const page of pages) {
      if (!page.label) continue
      items.push({
        id: `page:${page.path}`,
        label: page.label,
        icon: page.icon ?? 'FileText',
        route: page.path,
        section: page.section ?? 'main',
      })
    }
    return items
  }, [runtime.navigation, pages])

  // Route table: plugin routes + custom pages, most-specific-first.
  const routes = React.useMemo<RouteEntry[]>(() => {
    const list: RouteEntry[] = []
    for (const r of runtime.routes as PluginRouteDefinition[]) {
      const Component = resolvePluginComponent(r) as React.ComponentType<Record<string, unknown>> | undefined
      if (Component) list.push({ path: r.path, Component })
    }
    for (const page of pages) {
      list.push({ path: page.path, Component: page.component as React.ComponentType<Record<string, unknown>> })
    }
    return list.sort((a, b) => routeScore(b.path) - routeScore(a.path))
  }, [runtime.routes, pages])

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

  const shellUser = user
    ? { fullName: user.fullName ?? user.email, email: user.email, avatarUrl: user.avatarUrl }
    : undefined

  return (
    <AppShell
      variant={layout}
      navigation={navigation}
      logo={logo ?? <span className="text-lg font-bold">{appName}</span>}
      user={shellUser}
      currentPath={path}
      onNavigate={(route) => navigateTo(route)}
      onSignOut={() => { void signOut() }}
    >
      {ActiveComponent ? (
        <ActiveComponent {...activeParams} />
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
