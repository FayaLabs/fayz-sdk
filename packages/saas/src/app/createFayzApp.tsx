import * as React from 'react'
import type { AuthAdapter, OrgAdapter, PluginManifest } from '@fayz/core'
import {
  PluginRuntimeProvider,
  resolvePluginRuntime,
  I18nProvider,
  coreTranslations,
  mergeTranslations,
  setCurrentLocale,
} from '@fayz/core'
import { AuthProvider, createSupabaseAuthAdapter, createMockAuthAdapter } from '@fayz/auth'
import { createFayzSupabaseClient } from '../supabase/client'
import { OrgProvider } from '../org/context'
import { createSupabaseOrgAdapter } from '../org/adapters/supabase'
import { createMockOrgAdapter } from '../org/adapters/mock'
import { PermissionsProvider } from '../permissions/context'
import { useBillingStore } from '../billing/store'
import type { FayzAppConfig } from './config'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveAuthAdapter(config: FayzAppConfig): AuthAdapter {
  const auth = config.auth

  // Explicit adapter instance
  if (auth?.adapter && typeof auth.adapter === 'object') {
    return auth.adapter as AuthAdapter
  }

  const strategy = auth?.adapter ?? (config.supabaseUrl ? 'supabase' : 'mock')

  if (strategy === 'supabase') {
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      throw new Error(
        "[@fayz/saas] auth.adapter='supabase' requires supabaseUrl and supabaseAnonKey in FayzAppConfig.",
      )
    }
    return createSupabaseAuthAdapter({
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
    })
  }

  return createMockAuthAdapter()
}

function resolveOrgAdapter(config: FayzAppConfig): OrgAdapter {
  const org = config.org

  // Explicit adapter instance
  if (org?.adapter && typeof org.adapter === 'object') {
    return org.adapter as OrgAdapter
  }

  const strategy = org?.adapter ?? (config.supabaseUrl ? 'supabase' : 'mock')

  if (strategy === 'supabase') {
    return createSupabaseOrgAdapter()
  }

  return createMockOrgAdapter(config.permissions?.defaultProfiles)
}

function buildI18nConfig(config: FayzAppConfig): {
  defaultLocale: string
  supported: string[]
  translations: Record<string, Record<string, string>>
} {
  const defaultLocale = config.locale?.default ?? 'en'
  const supported = config.locale?.supported ?? [defaultLocale, 'pt-BR']

  // Collect plugin translations
  const pluginTranslations: Array<Record<string, Record<string, string>>> = []
  for (const plugin of config.plugins ?? []) {
    if (plugin.locales) {
      pluginTranslations.push(plugin.locales)
    }
  }

  const translations = mergeTranslations(
    coreTranslations,
    ...pluginTranslations,
    config.locale?.translations,
  )

  return { defaultLocale, supported, translations }
}

// ---------------------------------------------------------------------------
// Minimal inline shell (placeholder until @fayz/ui ships AppShell)
// ---------------------------------------------------------------------------

interface AppShellProps {
  layout?: 'sidebar' | 'topbar' | 'minimal'
  plugins: PluginManifest[]
  pages?: FayzAppConfig['pages']
  children?: React.ReactNode
}

function AppShell({ layout: _layout, plugins: _plugins, pages: _pages, children }: AppShellProps) {
  // TODO: Replace with @fayz/ui AppShell once it is implemented.
  // For now render children directly so createFayzApp is immediately usable.
  return <>{children}</>
}

// ---------------------------------------------------------------------------
// BillingInitializer — seeds billing store from config on mount
// ---------------------------------------------------------------------------

function BillingInitializer({ config }: { config: FayzAppConfig }) {
  const setPlans = useBillingStore((s) => s.setPlans)

  React.useEffect(() => {
    if (config.billing?.plans) {
      setPlans(config.billing.plans)
    }
  }, [config.billing, setPlans])

  return null
}

// ---------------------------------------------------------------------------
// Root app component factory
// ---------------------------------------------------------------------------

/**
 * createFayzApp — the central entry point for the Fayz SDK.
 *
 * Returns a React component that wraps your entire application with:
 *   AuthProvider → OrgProvider → PluginRuntimeProvider
 *     → PermissionsProvider → I18nProvider → AppShell
 *
 * @example
 * ```tsx
 * const App = createFayzApp({
 *   name: 'Glow Studio',
 *   supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
 *   supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
 *   plugins: [agendaPlugin, financialPlugin],
 *   locale: { default: 'pt-BR', supported: ['pt-BR', 'en'] },
 * })
 *
 * export default App
 * ```
 */
export function createFayzApp(config: FayzAppConfig): React.ComponentType {
  // Eagerly initialise the Supabase client so the global is set before any
  // data provider tries to resolve it.
  if (config.supabaseUrl && config.supabaseAnonKey) {
    createFayzSupabaseClient(config.supabaseUrl, config.supabaseAnonKey)
  }

  // Resolve adapters once (they are singletons / stable references)
  const authAdapter = resolveAuthAdapter(config)
  const orgAdapter = resolveOrgAdapter(config)

  // Build resolved plugin runtime context stub (no tenant/user yet at factory
  // time — the runtime will be recalculated reactively in the provider below)
  const plugins = config.plugins ?? []

  // Build i18n config
  const i18nConfig = buildI18nConfig(config)

  // Set initial locale
  setCurrentLocale(i18nConfig.defaultLocale)

  // -------------------------------------------------------------------------
  // The root component
  // -------------------------------------------------------------------------

  function FayzApp({ children }: { children?: React.ReactNode }) {
    // Compute the plugin runtime (resolved once, client-side)
    const runtime = React.useMemo(
      () =>
        resolvePluginRuntime({
          plugins,
          context: {
            tenant: null,
            user: null,
            currentPath:
              typeof window !== 'undefined' ? window.location.pathname : '/',
            matchedPath: '/',
            layout: config.layout ?? 'sidebar',
          },
        }),
      // plugins array reference is stable (created outside the component)
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    )

    return (
      <AuthProvider adapter={authAdapter}>
        <OrgProvider
          adapter={orgAdapter}
          autoCreate={config.org?.autoCreate ?? true}
        >
          <PluginRuntimeProvider value={runtime}>
            <PermissionsProvider config={config.permissions}>
              <I18nProvider value={i18nConfig}>
                <BillingInitializer config={config} />
                <AppShell
                  layout={config.layout}
                  plugins={plugins}
                  pages={config.pages}
                >
                  {children}
                </AppShell>
              </I18nProvider>
            </PermissionsProvider>
          </PluginRuntimeProvider>
        </OrgProvider>
      </AuthProvider>
    )
  }

  FayzApp.displayName = `FayzApp(${config.name})`

  return FayzApp
}

// createSaasApp is exported from @fayz/saas index.ts as a bridge to @fayz/saas-core
// for backward compatibility with existing apps using the full shell implementation.
