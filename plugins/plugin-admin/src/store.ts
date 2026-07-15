import { createStore, type StoreApi } from 'zustand/vanilla'
import { dedup } from '@fayz-ai/saas'
import type { AdminDataProvider, AdminSettingsSnapshot } from './data/types'

export interface AdminUIState {
  settings: AdminSettingsSnapshot | null
  settingsLoading: boolean

  fetchSettings(): Promise<void>
}

export function createAdminStore(provider: AdminDataProvider): StoreApi<AdminUIState> {
  return createStore<AdminUIState>((set) => ({
    settings: null,
    settingsLoading: false,

    async fetchSettings() {
      return dedup('admin:settings', async () => {
        set({ settingsLoading: true })
        try {
          const settings = await provider.getSettings()
          set({ settings, settingsLoading: false })
        } catch {
          set({ settingsLoading: false })
        }
      })
    },
  }))
}
