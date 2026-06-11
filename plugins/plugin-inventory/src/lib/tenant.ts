// Runtime-DI tenant accessor (decoupled from saas-core org store).
let t: string | undefined
export function setInventoryTenantId(id: string | undefined){ t = id }
export function getInventoryTenantId(): string | undefined { return t }
