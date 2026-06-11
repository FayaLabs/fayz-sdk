import React, { createContext, useContext } from 'react'
import type { CustomFormsConfig } from './config'
import type { CustomFormsDataProvider } from './data/types'
import type { CustomFormsStore } from './store'

export interface CustomFormsContextValue {
  config: CustomFormsConfig
  provider: CustomFormsDataProvider
  store: CustomFormsStore
}

const Ctx = createContext<CustomFormsContextValue | null>(null)

export function CustomFormsProvider({
  value,
  children,
}: {
  value: CustomFormsContextValue
  children: React.ReactNode
}) {
  return React.createElement(Ctx.Provider, { value }, children)
}

export function useCustomFormsContext(): CustomFormsContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCustomFormsContext must be used within CustomFormsProvider')
  return ctx
}
