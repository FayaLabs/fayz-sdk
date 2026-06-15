import React from 'react'
import type { StoreApi } from 'zustand/vanilla'
import { OrdersContextProvider, type ResolvedOrdersConfig } from './OrdersContext'
import { OrderKanbanView } from './views/OrderKanbanView'
import type { OrdersDataProvider } from './data/types'
import type { OrdersUIState } from './store'
import type { PluginRegistryDef } from '@fayz-ai/core'

export function OrdersPage({ config, provider, store, registries }: {
  config: ResolvedOrdersConfig
  provider: OrdersDataProvider
  store: StoreApi<OrdersUIState>
  registries?: PluginRegistryDef[]
}) {
  return (
    <OrdersContextProvider config={config} provider={provider} store={store}>
      <OrderKanbanView />
    </OrdersContextProvider>
  )
}
