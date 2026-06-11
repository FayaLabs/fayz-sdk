let t: string | undefined
export function setFinancialTenantId(id: string | undefined){ t = id }
export function getFinancialTenantId(): string | undefined { return t }
