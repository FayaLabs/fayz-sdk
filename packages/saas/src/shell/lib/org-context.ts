import { createContext, useContext } from 'react'
import type { OrgAdapter } from '../types/org-adapter'

const OrgAdapterContext = createContext<OrgAdapter | null>(null)

export const OrgAdapterProvider = OrgAdapterContext.Provider

export function useOrgAdapter(): OrgAdapter {
  const adapter = useContext(OrgAdapterContext)
  if (!adapter) {
    throw new Error('useOrgAdapter must be used within an OrgAdapterProvider')
  }
  return adapter
}

export function useOrgAdapterOptional(): OrgAdapter | null {
  return useContext(OrgAdapterContext)
}
