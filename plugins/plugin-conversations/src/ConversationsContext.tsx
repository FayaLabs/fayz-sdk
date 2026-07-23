import React from 'react'
import { useStore, type StoreApi } from 'zustand'
import type { EntityLookup } from '@fayz-ai/saas'
import type { ConversationsUIState } from './store'

/**
 * App-tunable knobs the inbox UI reads. Kept tiny on purpose: everything here
 * describes the APP's data shape (which people are "contacts" in this vertical),
 * never product policy.
 */
export interface ResolvedConversationsConfig {
  /** `people.kind` used when the compose modal creates a contact. */
  contactKind: string
  /** Per-vertical extension table linked by `person_id` (skipped when absent). */
  contactExtensionTable?: string
  /** Search source for the contact picker. Defaults to the person archetype. */
  contactLookup?: EntityLookup
}

export const DEFAULT_CONVERSATIONS_CONFIG: ResolvedConversationsConfig = {
  contactKind: 'contact',
}

const StoreContext = React.createContext<StoreApi<ConversationsUIState> | null>(null)
const ConfigContext = React.createContext<ResolvedConversationsConfig>(DEFAULT_CONVERSATIONS_CONFIG)

export function ConversationsContextProvider({
  store,
  config = DEFAULT_CONVERSATIONS_CONFIG,
  children,
}: {
  store: StoreApi<ConversationsUIState>
  config?: ResolvedConversationsConfig
  children?: React.ReactNode
}) {
  return (
    <StoreContext.Provider value={store}>
      <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
    </StoreContext.Provider>
  )
}

export function useConversationsStore<T>(selector: (state: ConversationsUIState) => T): T {
  const store = React.useContext(StoreContext)
  if (!store) throw new Error('useConversationsStore must be used within ConversationsPage')
  return useStore(store, selector)
}

export function useConversationsConfig(): ResolvedConversationsConfig {
  return React.useContext(ConfigContext)
}
