export interface AuditLog {
  id: string
  tenantId: string
  actorId?: string
  action: string
  resourceType?: string
  resourceId?: string
  locationId?: string
  metadata: Record<string, unknown>
  ipAddress?: string
  createdAt: string
}

export interface ApiKey {
  id: string
  tenantId: string
  name: string
  keyPrefix: string
  scopes: string[]
  createdBy: string
  lastUsedAt?: string
  expiresAt?: string
  revokedAt?: string
  createdAt: string
}
