// Runtime-DI tenant accessor.
let t: string | undefined
export function setCrmTenantId(id: string | undefined){ t = id }
export function getCrmTenantId(): string | undefined { return t }
