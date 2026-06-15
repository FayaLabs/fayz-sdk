import { create } from 'zustand'
import type { TenantPluginBinding } from '../types/plugins'

export interface ActiveTenantPluginRecord {
  pluginId: string
  name?: string
  version?: string
  scope?: string
  manifest?: Record<string, unknown>
  config: Record<string, unknown>
  enabledAt?: string
}

interface PluginStore {
  tenantId: string | null
  tenantPlugins: TenantPluginBinding[]
  activePlugins: ActiveTenantPluginRecord[]
  loading: boolean
  error: string | null
  setTenantPlugins: (tenantId: string, activePlugins: ActiveTenantPluginRecord[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  tenantId: null,
  tenantPlugins: [],
  activePlugins: [],
  loading: false,
  error: null,
}

export const usePluginStore = create<PluginStore>((set) => ({
  ...initialState,
  setTenantPlugins: (tenantId, activePlugins) => set({
    tenantId,
    activePlugins,
    tenantPlugins: activePlugins.map((plugin) => ({
      pluginId: plugin.pluginId,
      status: 'active',
      tenantId,
      config: plugin.config,
    })),
    error: null,
  }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}))
