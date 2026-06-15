import React from 'react'
import { useStore, type StoreApi } from 'zustand'
import type { MenuDataProvider } from './data/types'
import type { MenuUIState } from './store'

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export interface MenuPluginLabels {
  pageTitle: string
  menuManager: string
  categories: string
  newItem: string
}

// ---------------------------------------------------------------------------
// Resolved config — fully merged, no optionals
// ---------------------------------------------------------------------------

export interface MenuModules {
  modifiers: boolean
  deliveryPricing: boolean
}

export interface MenuCurrency {
  code: string
  locale: string
  symbol: string
}

export interface ResolvedMenuConfig {
  modules: MenuModules
  labels: MenuPluginLabels
  currency: MenuCurrency
}

// ---------------------------------------------------------------------------
// Contexts
// ---------------------------------------------------------------------------

const MenuConfigContext = React.createContext<ResolvedMenuConfig | null>(null)
const MenuProviderContext = React.createContext<MenuDataProvider | null>(null)
const MenuStoreContext = React.createContext<StoreApi<MenuUIState> | null>(null)

// ---------------------------------------------------------------------------
// Combined provider component
// ---------------------------------------------------------------------------

export function MenuContextProvider({ config, provider, store, children }: {
  config: ResolvedMenuConfig
  provider: MenuDataProvider
  store: StoreApi<MenuUIState>
  children: React.ReactNode
}) {
  return (
    <MenuConfigContext.Provider value={config}>
      <MenuProviderContext.Provider value={provider}>
        <MenuStoreContext.Provider value={store}>
          {children}
        </MenuStoreContext.Provider>
      </MenuProviderContext.Provider>
    </MenuConfigContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useMenuConfig(): ResolvedMenuConfig {
  const ctx = React.useContext(MenuConfigContext)
  if (!ctx) throw new Error('useMenuConfig must be used within MenuPage')
  return ctx
}

export function useMenuProvider(): MenuDataProvider {
  const ctx = React.useContext(MenuProviderContext)
  if (!ctx) throw new Error('useMenuProvider must be used within MenuPage')
  return ctx
}

export function useMenuStore<T>(selector: (state: MenuUIState) => T): T {
  const store = React.useContext(MenuStoreContext)
  if (!store) throw new Error('useMenuStore must be used within MenuPage')
  return useStore(store, selector)
}

// ---------------------------------------------------------------------------
// Currency formatter
// ---------------------------------------------------------------------------

export function formatCurrency(value: number, currency: MenuCurrency): string {
  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: 2,
  }).format(value)
}
