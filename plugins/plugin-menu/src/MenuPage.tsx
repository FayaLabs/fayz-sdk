import React from 'react'
import type { StoreApi } from 'zustand/vanilla'
import { MenuContextProvider, type ResolvedMenuConfig } from './MenuContext'
import type { MenuDataProvider } from './data/types'
import type { MenuUIState } from './store'
import type { PluginRegistryDef } from '@fayz-ai/core'

import { MenuManagerView } from './views/MenuManagerView'

export function MenuPage({ config, provider, store, registries }: {
  config: ResolvedMenuConfig
  provider: MenuDataProvider
  store: StoreApi<MenuUIState>
  registries?: PluginRegistryDef[]
}) {
  return (
    <MenuContextProvider config={config} provider={provider} store={store}>
      <MenuManagerView />
    </MenuContextProvider>
  )
}
