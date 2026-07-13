import { createContext, useContext, type ReactNode } from 'react'
import type { PaymentProvider } from '@fayz-ai/core'

export interface PaymentContextValue {
  provider: PaymentProvider
}

const PaymentContext = createContext<PaymentContextValue | null>(null)

export function PaymentProviderContext({ value, children }: { value: PaymentContextValue; children: ReactNode }) {
  return <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>
}

export function usePaymentContext(): PaymentContextValue {
  const ctx = useContext(PaymentContext)
  if (!ctx) {
    throw new Error('[plugin-payments] usePaymentContext must be used within the payments Provider.')
  }
  return ctx
}
