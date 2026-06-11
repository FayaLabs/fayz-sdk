// Current tenant id holder (runtime DI), decoupling the plugin from saas-core's
// organization.store. Defaults to undefined → Supabase RLS scopes by session.
let currentTenantId: string | undefined
export function setFormsTenantId(id: string | undefined): void { currentTenantId = id }
export function getFormsTenantId(): string | undefined { return currentTenantId }
