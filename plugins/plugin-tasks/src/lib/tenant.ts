// Current tenant id holder. The app/runtime sets this (runtime DI), decoupling
// the plugin from any specific org store — previously this read saas-core's
// organization.store. Defaults to undefined, in which case Supabase RLS scopes
// queries by the authenticated session.
let currentTenantId: string | undefined

export function setTasksTenantId(id: string | undefined): void {
  currentTenantId = id
}

export function getTasksTenantId(): string | undefined {
  return currentTenantId
}
