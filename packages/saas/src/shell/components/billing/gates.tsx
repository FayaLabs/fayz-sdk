import * as React from 'react'
import { UpgradePrompt } from './UpgradePrompt'
import { useAccessOptional, useLimit, useUpgradeModalStore } from './access-contract'

// ---------------------------------------------------------------------------
// EntitlementGate — plan-level gate. Renders children only when the current
// plan entitles `feature`; otherwise the fallback (default: an inline
// UpgradePrompt). Role gating stays with the native PermissionGate — this is
// strictly the plan axis.
// ---------------------------------------------------------------------------

export interface EntitlementGateProps {
  feature: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function EntitlementGate({ feature, children, fallback }: EntitlementGateProps) {
  const access = useAccessOptional()
  if (access.entitled(feature)) return <>{children}</>
  return <>{fallback ?? <UpgradePrompt inline feature={feature} />}</>
}

// ---------------------------------------------------------------------------
// LimitGate — quantity cap gate for "+ Add" style actions. When the limit is
// reached, the children are dimmed and any click is intercepted (capture phase)
// to open the global UpgradeModal instead of firing the underlying handler.
// Below the cap it's a transparent pass-through.
// ---------------------------------------------------------------------------

export interface LimitGateProps {
  limitKey: string
  children: React.ReactNode
  className?: string
}

export function LimitGate({ limitKey, children, className }: LimitGateProps) {
  const limit = useLimit(limitKey)
  const openModal = useUpgradeModalStore((s) => s.open)

  if (!limit.atLimit) return <>{children}</>

  const intercept = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    openModal({ limitKey })
  }

  return (
    <span
      className={className}
      onClickCapture={intercept}
      style={{ cursor: 'not-allowed' }}
      // Dim to signal the cap while keeping the trigger discoverable.
      data-limit-reached=""
    >
      <span className="pointer-events-none opacity-60" aria-disabled>
        {children}
      </span>
    </span>
  )
}
