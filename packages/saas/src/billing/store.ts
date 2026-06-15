import { create } from 'zustand'
import type { Plan } from '@fayz-ai/core'

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
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export interface BillingStore extends BillingState {
  setSubscription: (subscription: Subscription | null) => void
  setInvoices: (invoices: Invoice[]) => void
  setPlans: (plans: Plan[]) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

const initialState: BillingState = {
  subscription: null,
  invoices: [],
  plans: [],
  loading: false,
}

export const useBillingStore = create<BillingStore>((set) => ({
  ...initialState,
  setSubscription: (subscription) => set({ subscription }),
  setInvoices: (invoices) => set({ invoices }),
  setPlans: (plans) => set({ plans }),
  setLoading: (loading) => set({ loading }),
  reset: () => set(initialState),
}))
