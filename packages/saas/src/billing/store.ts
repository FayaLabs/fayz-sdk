import { create } from 'zustand'
import type { Plan, BillingCheckoutFn } from '@fayz-ai/core'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Subscription {
  id: string
  orgId: string
  planId: string
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd?: boolean
  stripeSubscriptionId?: string
}

export interface Invoice {
  id: string
  orgId: string
  amount: number
  currency: string
  status: 'paid' | 'open' | 'void' | 'uncollectible'
  pdfUrl?: string
  createdAt: string
}

export interface BillingState {
  subscription: Subscription | null
  invoices: Invoice[]
  plans: Plan[]
  loading: boolean
  /** Payment-gateway seam seeded from `config.billing.onCheckout` (see core
   *  BillingConfig). When set, the Subscription page routes plan changes through
   *  it instead of writing `plan` straight onto the org. */
  checkout: BillingCheckoutFn | null
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export interface BillingStore extends BillingState {
  setSubscription: (subscription: Subscription | null) => void
  setInvoices: (invoices: Invoice[]) => void
  setPlans: (plans: Plan[]) => void
  setLoading: (loading: boolean) => void
  setCheckout: (checkout: BillingCheckoutFn | null) => void
  reset: () => void
}

const initialState: BillingState = {
  subscription: null,
  invoices: [],
  plans: [],
  loading: false,
  checkout: null,
}

export const useBillingStore = create<BillingStore>((set) => ({
  ...initialState,
  setSubscription: (subscription) => set({ subscription }),
  setInvoices: (invoices) => set({ invoices }),
  setPlans: (plans) => set({ plans }),
  setLoading: (loading) => set({ loading }),
  setCheckout: (checkout) => set({ checkout }),
  reset: () => set(initialState),
}))
