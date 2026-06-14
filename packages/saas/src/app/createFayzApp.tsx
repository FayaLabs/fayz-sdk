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
import { PermissionsProvider } from '../permissions/context'
import { useBillingStore } from '../billing/store'
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
    if (config.billing?.plans) setPlans(config.billing.plans)
  }, [config.billing, setPlans])
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

  // Recompute the plugin runtime when the hash path changes (route-scoped
  // visibility). Tenant/user are filled in by the providers downstream.
  const path = useAdminPath()
  const runtime = React.useMemo(
    () =>
      resolvePluginRuntime({
        plugins: resolved.plugins,
        context: {
          tenant: null,
          user: null,
          currentPath: path,
          matchedPath: path,
          layout: config.layout ?? 'sidebar',
        },
      }),
    [resolved.plugins, path, config.layout],
  )

  return (
    <AuthProvider adapter={resolved.authAdapter}>
      <OrgProvider adapter={resolved.orgAdapter} autoCreate={config.org?.autoCreate ?? true}>
        <PluginRuntimeProvider value={runtime}>
          <PermissionsProvider config={config.permissions}>
            <I18nProvider value={resolved.i18n}>
              <BillingInitializer config={config} />
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
            layout={config.layout}
            pages={config.pages}
            requireAuth={config.auth?.requireAuth}
          />
        )}
      </AdminProviders>
    )
  }
  FayzApp.displayName = `FayzApp(${config.name})`
  return FayzApp
}
