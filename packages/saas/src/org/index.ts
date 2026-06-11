// Adapters
export { createSupabaseOrgAdapter } from './adapters/supabase'
export type { SupabaseOrgAdapterConfig } from './adapters/supabase'

export { createMockOrgAdapter } from './adapters/mock'

// Store
export { useOrganizationStore, getPersistedOrgId } from './store'
export type { OrgStore } from './store'

// Context & hooks
export {
  OrgProvider,
  useTenant,
  useTenantOptional,
  useOrgAdapter,
  useOrgAdapterOptional,
} from './context'
export type { OrgProviderProps, TenantContext } from './context'
