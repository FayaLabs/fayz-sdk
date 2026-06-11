let t: string | undefined
export function setAgendaTenantId(id: string | undefined){ t = id }
export function getAgendaTenantId(): string | undefined { return t }
