import { createPluginContext } from '@fayz-ai/saas'
import type { AdminDataProvider, AdminSettingsSnapshot } from './data/types'
import type { AdminUIState } from './store'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface AdminPluginLabels {
  pageTitle: string
  pageSubtitle: string
}

/** Resolved shell config + labels, handed to AdminPage. Mirrors AdminSettingsSnapshot. */
export interface ResolvedAdminConfig extends AdminSettingsSnapshot {
  labels: AdminPluginLabels
}

const ctx = createPluginContext<ResolvedAdminConfig, AdminDataProvider, AdminUIState>('AdminPage')

export const AdminContextProvider = ctx.ContextProvider
export const useAdminConfig = ctx.useConfig
export const useAdminProvider = ctx.useProvider
export const useAdminStore = ctx.useStore
