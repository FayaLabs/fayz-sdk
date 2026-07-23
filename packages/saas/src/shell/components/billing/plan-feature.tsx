import * as React from 'react'
import { Check, Sparkles } from 'lucide-react'
import { cn } from '../../lib/cn'

// A plan feature string prefixed with `*` renders highlighted (Sparkles +
// primary, medium weight) — the config-side seam for "hero" features like the
// AI assistant. Shared by UpgradePrompt, PlanSelector and SubscriptionPage.

export function parsePlanFeature(feature: string): { label: string; highlighted: boolean } {
  return feature.startsWith('*')
    ? { label: feature.slice(1).trim(), highlighted: true }
    : { label: feature, highlighted: false }
}

export function PlanFeatureItem({ feature, className, iconClassName }: {
  feature: string
  className?: string
  iconClassName?: string
}) {
  const { label, highlighted } = parsePlanFeature(feature)
  return (
    <li className={cn('flex items-start gap-2', className, highlighted && 'font-medium text-primary')}>
      {highlighted ? (
        <Sparkles className={cn('mt-0.5 shrink-0 text-primary', iconClassName)} aria-hidden="true" />
      ) : (
        <Check className={cn('mt-0.5 shrink-0 text-primary', iconClassName)} aria-hidden="true" />
      )}
      <span>{label}</span>
    </li>
  )
}
