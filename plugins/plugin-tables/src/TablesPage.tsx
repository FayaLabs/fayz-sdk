import React from 'react'
import type { StoreApi } from 'zustand/vanilla'
import { TablesContextProvider, type ResolvedTablesConfig } from './TablesContext'
import { FloorPlanView } from './views/FloorPlanView'
import type { TablesDataProvider } from './data/types'
import type { TablesUIState } from './store'
import type { PluginRegistryDef } from '@fayz-ai/core'

export function TablesPage({ config, provider, store, registries }: {
  config: ResolvedTablesConfig
  provider: TablesDataProvider
  store: StoreApi<TablesUIState>
  registries?: PluginRegistryDef[]
}) {
  return (
    <TablesContextProvider config={config} provider={provider} store={store}>
      <FloorPlanView />
    </TablesContextProvider>
  )
}
