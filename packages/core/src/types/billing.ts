import type { PlanEntitlements } from './entitlements'

export interface Plan {
  id: string
  name: string
  description?: string
  price: number
  currency: string
  interval: 'month' | 'year'
  /** Marketing bullets shown on the pricing page (display only). */
  features: string[]
  highlighted?: boolean
  stripePriceId?: string
  /**
   * Structured access grants for this plan (feature gates + quantity caps). This
   * is the enforcement source of truth — distinct from `features` (display
   * bullets). See {@link PlanEntitlements}.
   */
  entitlements?: PlanEntitlements
}

/**
 * Signature of the checkout seam. When `BillingConfig.onCheckout` is defined the
 * shell's Subscription page calls it (passing the target plan id) INSTEAD of
 * writing `plan` straight onto the org via `adapter.updateOrg`. This is where a
 * real payment gateway (Stripe Checkout, Pix, Mercado Pago, …) plugs in: return
 * once the user is redirected / the intent is created, and let the webhook be the
 * source of truth for the persisted plan. Left undefined, the shell mutates the
 * plan optimistically (dev / self-serve / free-tier flows).
 */
export type BillingCheckoutFn = (planId: string) => Promise<void> | void

export interface BillingConfig {
  plans: Plan[]
  stripePublishableKey?: string
  portalUrl?: string
  /** Payment-gateway seam — see {@link BillingCheckoutFn}. */
  onCheckout?: BillingCheckoutFn
}
