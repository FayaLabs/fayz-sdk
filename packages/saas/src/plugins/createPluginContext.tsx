import React from 'react'
import { useStore as useZustandStore, type StoreApi } from 'zustand'

/**
 * createPluginContext — the standard config/provider/store React context trio that
 * every plugin re-implemented by hand (~100 lines each). One call returns the
 * provider component plus the three typed hooks:
 *
 *   const ctx = createPluginContext<ResolvedCrmConfig, CrmDataProvider, CrmUIState>('CrmPage')
 *   export const CrmContextProvider = ctx.ContextProvider
 *   export const useCrmConfig = ctx.useConfig
 *   export const useCrmProvider = ctx.useProvider
 *   export const useCrmStore = ctx.useStore
 *
 * `displayName` is only used in the "must be used within …" error messages.
 */
export interface PluginContextApi<TConfig, TProvider, TUIState> {
  ContextProvider: React.FC<{
    config: TConfig
    provider: TProvider
    store: StoreApi<TUIState>
    children?: React.ReactNode
  }>
  useConfig: () => TConfig
  useProvider: () => TProvider
  useStore: <T>(selector: (state: TUIState) => T) => T
}

export function createPluginContext<TConfig, TProvider, TUIState>(
  displayName: string,
): PluginContextApi<TConfig, TProvider, TUIState> {
  const ConfigContext = React.createContext<TConfig | null>(null)
  const ProviderContext = React.createContext<TProvider | null>(null)
  const StoreContext = React.createContext<StoreApi<TUIState> | null>(null)

  const ContextProvider: PluginContextApi<TConfig, TProvider, TUIState>['ContextProvider'] = ({
    config, provider, store, children,
  }) => (
    <ConfigContext.Provider value={config}>
      <ProviderContext.Provider value={provider}>
        <StoreContext.Provider value={store}>
          {children}
        </StoreContext.Provider>
      </ProviderContext.Provider>
    </ConfigContext.Provider>
  )
  ContextProvider.displayName = `${displayName}ContextProvider`

  function useConfig(): TConfig {
    const ctx = React.useContext(ConfigContext)
    if (!ctx) throw new Error(`useConfig must be used within ${displayName}`)
    return ctx
  }

  function useProvider(): TProvider {
    const ctx = React.useContext(ProviderContext)
    if (!ctx) throw new Error(`useProvider must be used within ${displayName}`)
    return ctx
  }

  function useStore<T>(selector: (state: TUIState) => T): T {
    const store = React.useContext(StoreContext)
    if (!store) throw new Error(`useStore must be used within ${displayName}`)
    return useZustandStore(store, selector)
  }

  return { ContextProvider, useConfig, useProvider, useStore }
}
