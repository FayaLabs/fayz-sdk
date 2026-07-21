import * as React from 'react'
import { Crown, Check, Sparkles } from 'lucide-react'
import { Button, Card, CardContent } from '@fayz-ai/ui'
import type { Plan } from '@fayz-ai/core'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../hooks/useTranslation'
import { useBillingStore } from '../../stores/billing.store'
import { usePermissionsStore } from '../../../permissions'
import { useOrganizationStore } from '../../../org/store'
import { navigateTo } from '../../../app/routing'
import { getPlanEntitlements } from './access-contract'

// ---------------------------------------------------------------------------
// UpgradePrompt — the "this is a higher-plan feature" surface. Two variants:
//   • full (default): a page/block with a Crown hero, the feature's label, and
//     mini-cards of the plans that unlock it → CTA to /settings/subscription.
//   • inline: a compact banner for use as a gate fallback next to content.
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

export function UpgradePrompt({ feature, inline, className }: UpgradePromptProps) {
  const { t } = useTranslation()
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

  const featureLabel = React.useMemo(() => {
    if (!feature) return null
    return features.find((f) => f.id === feature)?.label ?? feature
  }, [features, feature])

  // Plans that unlock the feature AND are an upgrade over the current plan.
  const unlockingPlans = React.useMemo(
    () => plans.filter((p) => p.id !== currentPlanId && p.price > currentPrice && planUnlocks(p, feature)),
    [plans, currentPlanId, currentPrice, feature],
  )

  const goToPlans = () => navigateTo('/settings/subscription')

  const description = featureLabel
    ? tr('upgrade.descriptionFeature', 'The {feature} feature is available on a higher plan. Upgrade to unlock it.', { feature: featureLabel })
    : tr('upgrade.description', 'This feature is available on a higher plan. Upgrade to unlock it.')

  if (inline) {
    return (
      <div
        className={cn(
          'flex flex-wrap items-center gap-3 rounded-lg border border-amber-400/40 bg-amber-50/60 px-4 py-3 dark:bg-amber-950/20',
          className,
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/20 text-amber-600 dark:text-amber-400">
          <Crown className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{tr('upgrade.title', 'Premium feature')}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Button size="sm" onClick={goToPlans}>
          <Crown className="mr-1.5 h-3.5 w-3.5" />
          {tr('upgrade.cta', 'View plans')}
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('mx-auto flex max-w-3xl flex-col items-center px-4 py-12 text-center', className)}>
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-500">
        <Crown className="h-7 w-7" />
      </span>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        {tr('upgrade.title', 'Premium feature')}
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>

      {unlockingPlans.length > 0 && (
        <div className="mt-8 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {unlockingPlans.map((plan) => {
            const ent = getPlanEntitlements(plan)
            const highlights = plan.features.slice(0, 3)
            return (
              <Card
                key={plan.id}
                className={cn('flex flex-col text-left', plan.highlighted && 'border-primary shadow-md')}
              >
                <CardContent className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-center gap-2">
                    {plan.price > 0 ? (
                      <Crown className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-base font-semibold">{plan.name}</span>
                  </div>
                  {ent?.features?.[feature ?? ''] !== false && featureLabel && (
                    <p className="text-xs font-medium text-primary">
                      {tr('upgrade.includes', 'Includes {feature}', { feature: featureLabel })}
                    </p>
                  )}
                  <ul className="flex-1 space-y-1.5">
                    {highlights.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Button className="mt-8" size="lg" onClick={goToPlans}>
        <Crown className="mr-2 h-4 w-4" />
        {tr('upgrade.cta', 'View plans')}
      </Button>
    </div>
  )
}
