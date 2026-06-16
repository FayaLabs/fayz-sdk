import React from 'react'
import type { StoreApi } from 'zustand/vanilla'
import { ConversationsContextProvider } from './ConversationsContext'
import type { ConversationsUIState } from './store'
import { InboxView } from './views/InboxView'

export function ConversationsPage({ store }: { store: StoreApi<ConversationsUIState> }) {
  React.useEffect(() => {
    void store.getState().load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ConversationsContextProvider store={store}>
      <InboxView />
    </ConversationsContextProvider>
  )
}
