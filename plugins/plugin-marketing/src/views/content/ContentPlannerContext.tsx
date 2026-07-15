import { createPluginContext } from '@fayz-ai/saas'
import type { ResolvedMarketingConfig } from '../../MarketingContext'
import type { ContentPlannerProvider } from '../../data/contentTypes'
import type { ContentPlannerUIState } from './contentStore'

// Separate context trio for the content planner — MarketingContext's generics
// are fixed to the analytics provider/store, so the planner mounts its own.
const ctx = createPluginContext<ResolvedMarketingConfig, ContentPlannerProvider, ContentPlannerUIState>('ContentPlanner')

export const ContentPlannerContextProvider = ctx.ContextProvider
export const useContentPlannerConfig = ctx.useConfig
export const useContentPlannerProvider = ctx.useProvider
export const useContentPlannerStore = ctx.useStore
