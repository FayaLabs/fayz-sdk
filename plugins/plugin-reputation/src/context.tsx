import { createContext, useContext, type ReactNode } from 'react'
import type { ReputationDataProvider } from './data/types'

export interface ReputationContextValue {
  provider: ReputationDataProvider
}

const ReputationContext = createContext<ReputationContextValue | null>(null)

export function ReputationProvider({ value, children }: { value: ReputationContextValue; children: ReactNode }) {
  return <ReputationContext.Provider value={value}>{children}</ReputationContext.Provider>
}

export function useReputationContext(): ReputationContextValue {
  const ctx = useContext(ReputationContext)
  if (!ctx) {
    throw new Error('[plugin-reputation] useReputationContext must be used within <ReputationProvider>.')
  }
  return ctx
}
