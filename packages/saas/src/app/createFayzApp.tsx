import * as React from 'react'
import type { AuthAdapter, OrgAdapter } from '@fayz-ai/core'
import {
  PluginRuntimeProvider,
  resolvePluginRuntime,
  I18nProvider,
  coreTranslations,
  mergeTranslations,
  setCurrentLocale,
} from '@fayz-ai/core'
import { AuthProvider, createSupabaseAuthAdapter, createMockAuthAdapter } from '@fayz-ai/auth'
import { createFayzSupabaseClient, getFayzSupabaseClientOptional } from '../supabase/client'
import { OrgProvider } from '../org/context'
import { createSupabaseOrgAdapter } from '../org/adapters/supabase'
import { createMockOrgAdapter } from '../org/adapters/mock'
import { useOrganizationStore } from '../org/store'
import { PermissionsProvider } from '../permissions/context'
import { ToastProvider } from '../shell/components/notifications/ToastProvider'
import { useBillingStore } from '../billing/store'
import type { Plan } from '@fayz-ai/core'
import type { PlanConfig } from '../shell/types/billing'
import { useThemeStore } from '../shell/stores/theme.store'
import { resolveTheme, type CreateThemeOptions } from '../shell/config/theme/utils'
import type { SaasTheme } from '../shell/config/theme/tokens'
import { AdminShell } from './AdminShell'
import { useAdminPath } from './routing'
import type { FayzAppConfig } from './config'

// ---------------------------------------------------------------------------
// Adapter resolution
// ---------------------------------------------------------------------------

function resolveAuthAdapter(config: FayzAppConfig): AuthAdapter {
  const auth = config.auth
  if (auth?.adapter && typeof auth.adapter === 'object') return auth.adapter as AuthAdapter

  const strategy = auth?.adapter ?? (config.supabaseUrl ? 'supabase' : 'mock')
  if (strategy === 'supabase') {
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      throw new Error(
        "[@fayz-ai/saas] auth.adapter='supabase' requires supabaseUrl and supabaseAnonKey in FayzAppConfig.",
      )
    }
    return createSupabaseAuthAdapter({
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
      supabaseClient: getFayzSupabaseClientOptional() ?? undefined,
    })
  }
  return createMockAuthAdapter()
}

function resolveOrgAdapter(config: FayzAppConfig): OrgAdapter {
  const org = config.org
  if (org?.adapter && typeof org.adapter === 'object') return org.adapter as OrgAdapter

  const strategy = org?.adapter ?? (config.supabaseUrl ? 'supabase' : 'mock')
  if (strategy === 'supabase') return createSupabaseOrgAdapter()
  return createMockOrgAdapter(config.permissions?.defaultProfiles)
}

function buildI18nConfig(config: FayzAppConfig): {
  defaultLocale: string
  supported: string[]
  translations: Record<string, Record<string, string>>
} {
  const defaultLocale = config.locale?.default ?? 'en'
  const supported = config.locale?.supported ?? [defaultLocale, 'pt-BR']

  const pluginTranslations: Array<Record<string, Record<string, string>>> = []
  for (const plugin of config.plugins ?? []) {
    if (plugin.locales) pluginTranslations.push(plugin.locales)
  }

  const translations = mergeTranslations(
    coreTranslations,
    ...pluginTranslations,
    config.locale?.translations,
  )

  return { defaultLocale, supported, translations }
}

// ---------------------------------------------------------------------------
// BillingInitializer — seeds the billing store from config on mount
// ---------------------------------------------------------------------------

function BillingInitializer({ config }: { config: FayzAppConfig }) {
  const setPlans = useBillingStore((s) => s.setPlans)
  React.useEffect(() => {
    if (config.billing?.plans) setPlans(config.billing.plans.map(normalizeBillingPlan))
  }, [config.billing, setPlans])
  return null
}

function normalizeBillingPlan(plan: PlanConfig): Plan {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: plan.priceMonthly ?? plan.prices?.monthly ?? 0,
    currency: plan.currency ?? 'USD',
    interval: 'month',
    features: plan.features,
    highlighted: plan.popular,
    stripePriceId: undefined,
  }
}

function ThemeInitializer({ config }: { config: FayzAppConfig }) {
  const initialize = useThemeStore((s) => s.initialize)
  const setOverrides = useThemeStore((s) => s.setOverrides)
  const setMode = useThemeStore((s) => s.setMode)

  React.useEffect(() => {
    if (config.theme) {
      const isSaasTheme = 'brand' in config.theme && (
        'radius' in config.theme || 'sidebar' in config.theme || 'font' in config.theme
      )
      const resolved = isSaasTheme
        ? resolveTheme(config.theme as SaasTheme)
        : config.theme as CreateThemeOptions
      setOverrides(resolved)
    }
    if (config.defaultThemeMode && typeof window !== 'undefined' && !localStorage.getItem('saas-core:theme-mode')) {
      setMode(config.defaultThemeMode)
    }
    initialize()
  }, [config.defaultThemeMode, config.theme, initialize, setMode, setOverrides])

  return null
}

// ---------------------------------------------------------------------------
// AdminProviders — the provider stack shared by the createFayzApp/createSaasApp
// sugar path AND the manifest-driven AdminScaffold. Resolves adapters + i18n
// once (stable refs) and recomputes the plugin runtime reactively as the path
// changes, so route-scoped widget visibility stays correct.
//
//   AuthProvider → OrgProvider → PluginRuntimeProvider
//     → PermissionsProvider → I18nProvider → (BillingInitializer + children)
// ---------------------------------------------------------------------------

export function AdminProviders({ config, children }: { config: FayzAppConfig; children: React.ReactNode }) {
  const currentOrg = useOrganizationStore((s) => s.currentOrg)

  // Resolve adapters / i18n once per config identity.
  const resolved = React.useMemo(() => {
    if (config.supabaseUrl && config.supabaseAnonKey) {
      createFayzSupabaseClient(config.supabaseUrl, config.supabaseAnonKey)
    }
    const i18n = buildI18nConfig(config)
    setCurrentLocale(i18n.defaultLocale)
    return {
      authAdapter: resolveAuthAdapter(config),
      orgAdapter: resolveOrgAdapter(config),
      i18n,
      plugins: config.plugins ?? [],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  // Recompute the plugin runtime when the hash path or tenant changes
  // (route-scoped visibility + tenant-scoped plugin data providers).
  const path = useAdminPath()
  const runtime = React.useMemo(
    () =>
      resolvePluginRuntime({
        plugins: resolved.plugins,
        context: {
          tenant: currentOrg
            ? {
                id: currentOrg.id,
                slug: currentOrg.slug,
                verticalId: currentOrg.verticalId,
                plan: currentOrg.plan,
              }
            : null,
          user: null,
          currentPath: path,
          matchedPath: path,
          layout: config.layout ?? 'sidebar',
        },
      }),
    [resolved.plugins, path, config.layout, currentOrg],
  )

  return (
    <AuthProvider adapter={resolved.authAdapter}>
      <OrgProvider adapter={resolved.orgAdapter} autoCreate={config.org?.autoCreate ?? true}>
        <PluginRuntimeProvider value={runtime}>
          <PermissionsProvider config={config.permissions}>
            <I18nProvider value={resolved.i18n}>
              <ThemeInitializer config={config} />
              <BillingInitializer config={config} />
              <ToastProvider />
              {children}
            </I18nProvider>
          </PermissionsProvider>
        </PluginRuntimeProvider>
      </OrgProvider>
    </AuthProvider>
  )
}
AdminProviders.displayName = 'AdminProviders'

// ---------------------------------------------------------------------------
// createFayzApp — declarative admin app factory (sugar over the manifest path;
// equivalent to renderApp(defineSaas(config)), sharing AdminProviders +
// AdminShell with the scaffold).
//
//   const App = createFayzApp({ name: 'Glow Studio', plugins: [...] })
//   export default App
// ---------------------------------------------------------------------------

export function createFayzApp(config: FayzAppConfig): React.ComponentType {
  function FayzApp({ children }: { children?: React.ReactNode }) {
    return (
      <AdminProviders config={config}>
        {children ?? (
          <AdminShell
            appName={config.name}
            logo={config.logo}
            layout={config.layout}
            pages={config.pages}
            requireAuth={config.auth?.requireAuth}
            loginTagline={config.auth?.loginTagline}
            loginDescription={config.auth?.loginDescription}
            showOAuth={config.auth?.showOAuth}
            oauthProviders={config.auth?.oauthProviders}
          />
        )}
      </AdminProviders>
    )
  }
  FayzApp.displayName = `FayzApp(${config.name})`
  return FayzApp
}
