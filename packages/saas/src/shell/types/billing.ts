export type PlanInterval = 'monthly' | 'yearly'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused'

export interface Plan {
  id: string
  verticalId?: string
  name: string
  description?: string
  tier: number
  priceMonthly: number
  priceYearly: number
  currency: string
  features: string[]
  limits: Record<string, number>
  isActive: boolean
  createdAt: string
  /** @deprecated Use priceMonthly/priceYearly */
  prices?: { monthly: number; yearly: number }
  popular?: boolean
}

/**
 * Config-friendly plan shape for createSaasApp({ billing: { plans } }).
 * Infrastructure fields (tier, currency, isActive, createdAt, limits) are
 * optional and filled in by normalizePlanConfig.
 */
export interface PlanConfig {
  id: string
  name: string
  description?: string
  features: string[]
  prices?: { monthly: number; yearly: number }
  priceMonthly?: number
  priceYearly?: number
  tier?: number
  currency?: string
  limits?: Record<string, number>
  popular?: boolean
  verticalId?: string
}

export function normalizePlanConfig(plan: PlanConfig, index?: number): Plan {
  return {
    id: plan.id,
    verticalId: plan.verticalId,
    name: plan.name,
    description: plan.description,
    tier: plan.tier ?? (index !== undefined ? index + 1 : 1),
    priceMonthly: plan.priceMonthly ?? plan.prices?.monthly ?? 0,
    priceYearly: plan.priceYearly ?? plan.prices?.yearly ?? 0,
    currency: plan.currency ?? 'USD',
    features: plan.features,
    limits: plan.limits ?? {},
    isActive: true,
    createdAt: new Date().toISOString(),
    prices: plan.prices,
    popular: plan.popular,
  }
}

export interface Subscription {
  id: string
  tenantId: string
  planId: string
  status: SubscriptionStatus
  interval: PlanInterval
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  trialEnd?: string
  stripeSubscriptionId?: string
}

export interface Invoice {
  id: string
  tenantId: string
  amount: number
  currency: string
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  pdfUrl?: string
  createdAt: string
  paidAt?: string
}

export interface BillingState {
  subscription: Subscription | null
  invoices: Invoice[]
  plans: Plan[]
  loading: boolean
}
