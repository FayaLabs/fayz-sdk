// Active tenant context — a global accessor the data layer reads for tenant
// scoping and cache keying. The host (saas shell / app) sets it from its org
// store via setActiveTenantId; the data providers stay decoupled from any
// specific org-store implementation (runtime DI).
import { clearGlobalCache } from '../lib/cache'

let _activeTenantId: string | undefined

export function setActiveTenantId(id: string | undefined): void {
  if (id !== _activeTenantId) {
    _activeTenantId = id
    clearGlobalCache()
  }
}

export function getActiveTenantId(): string | undefined {
  return _activeTenantId
}
