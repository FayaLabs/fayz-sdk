import * as React from 'react'
import type { PermissionAction } from '@fayz-ai/core'
import { usePermissionOptional } from './context'

interface PermissionGateProps {
  feature: string
  action: PermissionAction
  children: React.ReactNode
  fallback?: React.ReactNode
}

/** Renders children only when the current user has the given feature+action. */
export function PermissionGate({ feature, action, children, fallback }: PermissionGateProps) {
  const can = usePermissionOptional()
  if (!can(feature, action)) return <>{fallback ?? null}</>
  return <>{children}</>
}
