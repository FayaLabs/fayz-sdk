export type IntegrationCategory = 'calendar' | 'email' | 'messaging' | 'payment' | 'storage'
export type IntegrationAuthType = 'oauth2' | 'api_key' | 'webhook' | 'none'

export interface IntegrationProvider {
  id: string
  name: string
  description?: string
  category: IntegrationCategory
  authType: IntegrationAuthType
  configSchema: Record<string, unknown>
  icon?: string
  isActive: boolean
  createdAt: string
}

export interface TenantIntegration {
  id: string
  tenantId: string
  providerId: string
  locationId?: string
  name?: string
  config: Record<string, unknown>
  isActive: boolean
  connectedBy?: string
  connectedAt?: string
  createdAt: string
  updatedAt: string
}

export interface WebhookConfig {
  id: string
  tenantId: string
  url: string
  events: string[]
  secret: string
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface WebhookDelivery {
  id: string
  webhookId: string
  event: string
  payload: Record<string, unknown>
  responseStatus?: number
  success: boolean
  attempts: number
  createdAt: string
}
