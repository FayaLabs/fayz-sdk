export interface Plan {
  id: string
  name: string
  description?: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  highlighted?: boolean
  stripePriceId?: string
}

export interface BillingConfig {
  plans: Plan[]
  stripePublishableKey?: string
  portalUrl?: string
}
