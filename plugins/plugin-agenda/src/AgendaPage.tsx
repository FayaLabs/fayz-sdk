import React from 'react'
import { usePluginRuntimeOptional } from '@fayz-ai/core'
import type { StoreApi } from 'zustand/vanilla'
import { AgendaContextProvider } from './AgendaContext'
import type { ResolvedAgendaConfig } from './config'
import type { AgendaDataProvider } from './data/types'
import type { AgendaUIState } from './store'
import { CalendarView } from './views/CalendarView'
import { setAgendaTenantId } from './lib/tenant'

// ---------------------------------------------------------------------------
// Main page — clean single-page calendar, no module nav wrapper
// ---------------------------------------------------------------------------

export function AgendaPage({ config, provider, store }: {
  config: ResolvedAgendaConfig
  provider: AgendaDataProvider
  store: StoreApi<AgendaUIState>
}) {
  const runtime = usePluginRuntimeOptional()
  const tenantId = runtime?.context.tenant?.id

  React.useEffect(() => {
    setAgendaTenantId(tenantId)
    return () => setAgendaTenantId(undefined)
  }, [tenantId])

  return (
    <AgendaContextProvider config={config} provider={provider} store={store}>
      <CalendarView />
    </AgendaContextProvider>
  )
}
