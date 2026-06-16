import { createPluginContext } from '@fayz-ai/saas'
import type { ResolvedAgendaConfig } from './config'
import type { AgendaDataProvider } from './data/types'
import type { AgendaUIState } from './store'

const ctx = createPluginContext<ResolvedAgendaConfig, AgendaDataProvider, AgendaUIState>('AgendaPage')

export const AgendaContextProvider = ctx.ContextProvider
export const useAgendaConfig = ctx.useConfig
export const useAgendaProvider = ctx.useProvider
export const useAgendaStore = ctx.useStore
