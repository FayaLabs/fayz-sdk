import * as React from 'react'
import { Crown, Check, Sparkles, ArrowRight } from 'lucide-react'
import { Button, Card } from '@fayz-ai/ui'
import type { Plan } from '@fayz-ai/core'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../hooks/useTranslation'
import { useBillingStore } from '../../stores/billing.store'
import { usePermissionsStore } from '../../../permissions'
import { useOrganizationStore } from '../../../org/store'
import { navigateTo } from '../../../app/routing'
import { getPlanEntitlements, featureDisplayName } from './access-contract'

// ---------------------------------------------------------------------------
// UpgradePrompt — the "this is a higher-plan feature" surface. Two variants:
//   • full (default): a benefit-led hero (compact icon + "Unlock {Feature}"),
//     a "your plan" context chip, and priced plan cards — the cheapest one that
//     unlocks the feature flagged "Recommended" and slightly elevated — each with
//     its own "Upgrade" CTA into /settings/subscription, plus a discreet
//     "Compare all plans" link.
//   • inline: a single-line banner for use as a gate fallback next to content.
// Rendered by the AdminShell route guard (reason: 'plan'), the EntitlementGate
// fallback, and anywhere a premium feature needs a discovery nudge.
// ---------------------------------------------------------------------------

export interface UpgradePromptProps {
  /** Feature id (same id space as RBAC/nav) this prompt is about. */
  feature?: string
  /** Compact banner instead of the full hero block. */
  inline?: boolean
  className?: string
}

function planUnlocks(plan: Plan, feature: string | undefined): boolean {
  if (!feature) return plan.price > 0
  const ent = getPlanEntitlements(plan)
  // Entitled when the feature isn't explicitly disabled for the plan.
  return ent?.features?.[feature] !== false
}

/** Localized "R$ 79" style price, respecting the plan's currency + active locale. */
function formatPrice(plan: Plan, locale: string | undefined): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: plan.currency || 'USD',
      minimumFractionDigits: Number.isInteger(plan.price) ? 0 : 2,
    }).format(plan.price)
  } catch {
    return `${plan.currency || ''} ${plan.price}`.trim()
  }
}

export function UpgradePrompt({ feature, inline, className }: UpgradePromptProps) {
  const { t, locale } = useTranslation()
  const tr = (key: string, fallback: string, params?: Record<string, string>) => {
    let v = t(key)
    if (!v || v === key) v = fallback
    if (params) for (const [k, val] of Object.entries(params)) v = v.replace(`{${k}}`, val).replace(`{{${k}}}`, val)
    return v
  }

  const plans = useBillingStore((s) => s.plans)
  const features = usePermissionsStore((s) => s.features)
  const currentOrg = useOrganizationStore((s) => s.currentOrg)
  const currentPlanId = currentOrg?.plan || 'free'
  const currentPlan = plans.find((p) => p.id === currentPlanId)
  const currentPrice = currentPlan?.price ?? 0
  const currentPlanName = currentPlan?.name ?? tr('billing.free', 'Free')

  // Clean display name (strips "(acesso)"/"(access)" suffixes from the raw label).
  const featureName = React.useMemo(() => {
    if (!feature) return null
    const label = features.find((f) => f.id === feature)?.label ?? feature
    return featureDisplayName(label)
  }, [features, feature])

  // Plans that unlock the feature AND are an upgrade over the current plan,
  // cheapest first — so the first is the natural "recommended" entry point.
  const unlockingPlans = React.useMemo(
    () =>
      plans
        .filter((p) => p.id !== currentPlanId && p.price > currentPrice && planUnlocks(p, feature))
        .sort((a, b) => a.price - b.price),
    [plans, currentPlanId, currentPrice, feature],
  )
  const recommendedId = unlockingPlans[0]?.id

  const goToPlans = () => navigateTo('/settings/subscription')

  const heading = featureName
    ? tr('upgrade.unlock', 'Unlock {feature}', { feature: featureName })
    : tr('upgrade.title', 'Premium feature')

  // Benefit subcopy: per-feature key (upgrade.value.<feature>) with a dignified
  // generic fallback so every feature reads intentionally.
  const valueKey = feature ? `upgrade.value.${feature}` : ''
  const valueCopy = feature ? t(valueKey) : ''
  const subcopy =
    valueCopy && valueCopy !== valueKey
      ? valueCopy
      : tr('upgrade.valueGeneric', 'Get everything you need to grow — included in the plans below.')

  if (inline) {
    return (
      <div
        className={cn(
          'flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-50/60 px-4 py-3 dark:border-amber-400/25 dark:bg-amber-950/20',
          className,
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/20 text-amber-600 dark:text-amber-400">
          <Crown className="h-4 w-4" />
        </span>
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-semibold text-foreground">{heading}</span>
          <span className="ml-1.5 text-muted-foreground">{subcopy}</span>
        </p>
        <Button size="sm" onClick={goToPlans} className="shrink-0">
          {tr('upgrade.ctaUpgrade', 'Upgrade')}
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('mx-auto w-full max-w-4xl px-4 py-10 sm:py-14', className)}>
      {/* Hero — compact, benefit-led. Icon integrated with the title, not floating. */}
      <div className="flex flex-col items-center text-center">
        {currentPlan && (
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" aria-hidden="true" />
            {tr('upgrade.currentPlan', 'Your plan: {plan}', { plan: currentPlanName })}
          </span>
        )}
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/15 text-amber-500 sm:h-10 sm:w-10">
            <Crown className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
          </span>
          {heading}
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">{subcopy}</p>
      </div>

      {unlockingPlans.length > 0 && (
        <div
          className={cn(
            'mt-9 grid gap-4 sm:gap-5',
            unlockingPlans.length === 1 ? 'max-w-sm mx-auto' : 'sm:grid-cols-2',
            unlockingPlans.length >= 3 && 'lg:grid-cols-3',
          )}
        >
          {unlockingPlans.map((plan) => {
            const recommended = plan.id === recommendedId
            const paid = plan.price > 0
            const highlights = plan.features.slice(0, 3)
            return (
              <Card
                key={plan.id}
                className={cn(
                  'relative flex flex-col p-5 transition-shadow',
                  recommended
                    ? 'border-primary shadow-lg ring-1 ring-primary/20 sm:-translate-y-1'
                    : 'hover:shadow-md',
                )}
              >
                {recommended && (
                  <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground shadow-sm">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    {tr('upgrade.recommended', 'Recommended')}
                  </span>
                )}

                <div className="flex items-center gap-1.5">
                  {paid && <Crown className="h-4 w-4 text-amber-500" aria-hidden="true" />}
                  <h2 className="text-sm font-semibold text-foreground">{plan.name}</h2>
                </div>

                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                    {formatPrice(plan, locale)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {plan.interval === 'year' ? tr('billing.perYear', '/yr') : tr('billing.perMonth', '/mo')}
                  </span>
                </div>

                {plan.description && (
                  <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
                )}

                <ul className="mt-4 flex-1 space-y-2">
                  {highlights.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-foreground/80">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="mt-5 w-full"
                  variant={recommended ? 'default' : 'outline'}
                  onClick={goToPlans}
                  aria-label={tr('upgrade.ctaUpgradeTo', 'Upgrade to {plan}', { plan: plan.name })}
                >
                  {paid && <Crown className="mr-1.5 h-4 w-4" aria-hidden="true" />}
                  {tr('upgrade.ctaUpgrade', 'Upgrade')}
                </Button>
              </Card>
            )
          })}
        </div>
      )}

      <div className="mt-7 text-center">
        <button
          type="button"
          onClick={goToPlans}
          className="inline-flex items-center gap-1 rounded text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {tr('upgrade.compareAll', 'Compare all plans')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
