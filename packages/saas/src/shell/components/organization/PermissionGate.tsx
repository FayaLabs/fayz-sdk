import * as React from 'react'
import { usePermission } from '../../hooks/usePermission'
import type { PermissionAction } from '../../types/permissions'

interface PermissionGateProps {
  feature: string
  action: PermissionAction
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionGate({ feature, action, children, fallback }: PermissionGateProps) {
  const { can } = usePermission()
  if (!can(feature, action)) return <>{fallback ?? null}</>
  return <>{children}</>
}
