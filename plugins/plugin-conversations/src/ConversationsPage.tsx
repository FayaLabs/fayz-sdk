import React from 'react'
import type { StoreApi } from 'zustand/vanilla'
import { ConversationsContextProvider, type ResolvedConversationsConfig } from './ConversationsContext'
import type { ConversationsUIState } from './store'
import { InboxView } from './views/InboxView'

export function ConversationsPage({ store, config }: {
  store: StoreApi<ConversationsUIState>
  config?: ResolvedConversationsConfig
}) {
  React.useEffect(() => {
    void store.getState().load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ConversationsContextProvider store={store} config={config}>
      <InboxView />
    </ConversationsContextProvider>
  )
}
