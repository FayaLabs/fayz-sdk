import React from 'react'
import { useStore, type StoreApi } from 'zustand'
import type { ConversationsUIState } from './store'

const StoreContext = React.createContext<StoreApi<ConversationsUIState> | null>(null)

export function ConversationsContextProvider({
  store,
  children,
}: {
  store: StoreApi<ConversationsUIState>
  children?: React.ReactNode
}) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useConversationsStore<T>(selector: (state: ConversationsUIState) => T): T {
  const store = React.useContext(StoreContext)
  if (!store) throw new Error('useConversationsStore must be used within ConversationsPage')
  return useStore(store, selector)
}
