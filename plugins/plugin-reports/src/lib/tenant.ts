let t: string | undefined
export function setReportsTenantId(id: string | undefined){ t = id }
export function getReportsTenantId(): string | undefined { return t }
