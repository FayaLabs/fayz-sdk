import * as React from 'react'
import { cn } from '../../lib/cn'
import { UpgradePrompt } from './UpgradePrompt'

// ---------------------------------------------------------------------------
// UpgradeOverlay — the plan-gate paywall that keeps the real page visible.
// The gated page renders behind (blurred, inert) as a teaser of what the
// upgrade unlocks; the UpgradePrompt floats above it.
// Used by the AdminShell route guard for reason: 'plan' denials.
// ---------------------------------------------------------------------------

export interface UpgradeOverlayProps {
  /** Feature id (same id space as RBAC/nav) the paywall is about. */
  feature?: string
  /** The gated page — rendered behind the paywall as a blurred teaser. */
  children: React.ReactNode
  className?: string
  /** Paywall layer classes — override the default full-viewport centering
   *  (e.g. `min-h-full` inside a narrow drawer). */
  overlayClassName?: string
  /** Forwarded to the UpgradePrompt (spacing overrides for tight surfaces). */
  promptClassName?: string
}

export function UpgradeOverlay({ feature, children, className, overlayClassName, promptClassName }: UpgradeOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {/* Teaser layer: the live page, blurred + faded in place and made inert —
          visual only, never interactive or read by AT. The blur lives on the
          content itself (not a backdrop) so it covers exactly the page, with
          no frosted rectangle or margins. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none overflow-hidden blur-[5px] opacity-40"
      >
        {children}
      </div>
      {/* Paywall layer: transparent, centered over the teaser. */}
      <div className={cn('relative flex min-h-[70vh] items-center justify-center', overlayClassName)}>
        <UpgradePrompt feature={feature} className={cn('py-8 sm:py-10', promptClassName)} />
      </div>
    </div>
  )
}
