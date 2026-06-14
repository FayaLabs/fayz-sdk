import { useEffect } from 'react'
import { getSupabaseClientOptional } from '../lib/supabase'
import { useOrganizationStore } from '../stores/organization.store'
import { usePluginStore } from '../stores/plugin.store'

type TenantActivePluginRow = {
  plugin_id: string
  name?: string
  version?: string
  scope?: string
  manifest?: Record<string, unknown>
  config?: Record<string, unknown>
  enabled_at?: string
}

export function useTenantPlugins(options?: { enabled?: boolean }) {
  const enabled = options?.enabled === true
  const currentOrg = useOrganizationStore((state) => state.currentOrg)
  const tenantId = usePluginStore((state) => state.tenantId)
  const tenantPlugins = usePluginStore((state) => state.tenantPlugins)
  const activePlugins = usePluginStore((state) => state.activePlugins)
  const loading = usePluginStore((state) => state.loading)
  const error = usePluginStore((state) => state.error)
  const setTenantPlugins = usePluginStore((state) => state.setTenantPlugins)
  const setLoading = usePluginStore((state) => state.setLoading)
  const setError = usePluginStore((state) => state.setError)
  const reset = usePluginStore((state) => state.reset)

  useEffect(() => {
    if (!enabled) {
      reset()
      return
    }

    if (!currentOrg?.id) {
      reset()
      return
    }
    const orgId = currentOrg.id

    const supabase = getSupabaseClientOptional()
    if (!supabase) {
      reset()
      return
    }
    const supabaseClient = supabase

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const { data, error } = await supabaseClient.rpc('get_tenant_active_plugins', {
          p_tenant_id: orgId,
        })

        if (error) {
          // Plugin system not available in this project — skip silently
          if (!cancelled) { setLoading(false) }
          return
        }
        if (cancelled) return

        setTenantPlugins(
          orgId,
          (data ?? []).map((plugin: TenantActivePluginRow) => ({
            pluginId: plugin.plugin_id,
            name: plugin.name,
            version: plugin.version,
            scope: plugin.scope,
            manifest: plugin.manifest,
            config: plugin.config ?? {},
            enabledAt: plugin.enabled_at,
          })),
        )
      } catch (error: any) {
        if (!cancelled) {
          setError(error?.message ?? 'Failed to load tenant plugins')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [currentOrg?.id, enabled, reset, setError, setLoading, setTenantPlugins])

  return {
    tenantId,
    tenantPlugins,
    activePlugins,
    loading,
    error,
  }
}
