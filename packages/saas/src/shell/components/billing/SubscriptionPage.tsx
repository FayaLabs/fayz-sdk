import * as React from 'react'
import { Crown, Check, Minus, Sparkles } from 'lucide-react'
import { PlanFeatureItem, parsePlanFeature } from './plan-feature'
import { Button, Badge, Card, CardContent, CardHeader, ConfirmDialog, toast } from '@fayz-ai/ui'
import type { Plan } from '@fayz-ai/core'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../hooks/useTranslation'
import { useBillingStore } from '../../stores/billing.store'
import { resolvePlanBadge } from '../../../billing/plan-badge'
import { useTenantOptional, useOrgAdapterOptional } from '../../../org/context'
import { useOrganizationStore } from '../../../org/store'
import { usePermissionsStore } from '../../../permissions'
import { getPlanEntitlements } from './access-contract'

// ---------------------------------------------------------------------------
// SubscriptionPage — the shell's self-serve subscription surface. Present as the
// /settings/subscription tab whenever `config.billing` is configured. Reads the
// plans seeded into the billing store from config, resolves the current plan
// from `currentOrg.plan`, and changes plan via the checkout seam (Stripe/Pix) or,
// when no seam is configured, an optimistic `adapter.updateOrg(orgId, { plan })`.
// ---------------------------------------------------------------------------

function formatPrice(plan: Plan, tr: (k: string, f: string) => string): string {
  if (plan.price <= 0) return tr('billing.free', 'Free')
  try {
    const isInteger = Number.isInteger(plan.price)
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: plan.currency || 'USD',
      minimumFractionDigits: isInteger ? 0 : 2,
    }).format(plan.price)
  } catch {
    return `${plan.currency || ''} ${plan.price}`.trim()
  }
}

function intervalSuffix(plan: Plan, tr: (k: string, f: string) => string): string {
  if (plan.price <= 0) return ''
  return plan.interval === 'year'
    ? tr('billing.perYear', '/yr')
    : tr('billing.perMonth', '/mo')
}

export function SubscriptionPage({ className }: { className?: string }) {
  const { t } = useTranslation()
  const tr = (key: string, fallback: string) => {
    const v = t(key)
    return !v || v === key ? fallback : v
  }

  const plans = useBillingStore((s) => s.plans)
  const checkout = useBillingStore((s) => s.checkout)
  const tenant = useTenantOptional()
  const adapter = useOrgAdapterOptional()
  const setCurrentOrg = useOrganizationStore((s) => s.setCurrentOrg)
  const currentOrg = useOrganizationStore((s) => s.currentOrg)

  const currentPlanId = currentOrg?.plan || 'free'
  const currentBadge = resolvePlanBadge(currentPlanId, plans)
  const currentPlan = plans.find((p) => p.id === currentPlanId)

  const [pending, setPending] = React.useState<Plan | null>(null)
  const [busy, setBusy] = React.useState(false)

  // Feature matrix — union of every plan's features, order-preserved.
  const allFeatures = React.useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const plan of plans) {
      for (const f of plan.features) {
        if (!seen.has(f)) {
          seen.add(f)
          out.push(f)
        }
      }
    }
    return out
  }, [plans])

  // Real entitlements matrix — derived from plan.entitlements when any plan
  // declares them. Feature rows show ✓/— per plan; limit rows show "Up to N" /
  // "Unlimited". Falls back to the marketing-bullet matrix (allFeatures) below
  // when no plan carries entitlements.
  const featureCatalog = usePermissionsStore((s) => s.features)
  const entitlementsMatrix = React.useMemo(() => {
    const hasAny = plans.some((p) => getPlanEntitlements(p))
    if (!hasAny) return null

    const featureIds: string[] = []
    const featureSeen = new Set<string>()
    const limitKeys: string[] = []
    const limitSeen = new Set<string>()
    for (const plan of plans) {
      const ent = getPlanEntitlements(plan)
      for (const id of Object.keys(ent?.features ?? {})) {
        if (!featureSeen.has(id)) { featureSeen.add(id); featureIds.push(id) }
      }
      for (const key of Object.keys(ent?.limits ?? {})) {
        if (!limitSeen.has(key)) { limitSeen.add(key); limitKeys.push(key) }
      }
    }
    if (featureIds.length === 0 && limitKeys.length === 0) return null

    const labelForFeature = (id: string) => featureCatalog.find((f) => f.id === id)?.label ?? id
    const labelForLimit = (key: string) => {
      const v = t(`limit.label.${key}`)
      return !v || v === `limit.label.${key}` ? key : v
    }
    return { featureIds, limitKeys, labelForFeature, labelForLimit }
  }, [plans, featureCatalog, t])

  async function applyChange(plan: Plan) {
    setBusy(true)
    try {
      // Seam: a configured gateway (Stripe/Pix) owns the transition; the webhook
      // is the source of truth for the persisted plan, so we don't mutate here.
      if (checkout) {
        await checkout(plan.id)
        setPending(null)
        return
      }
      // No gateway: optimistic org update. Persist + swap the store so the plan
      // badge and CTAs re-render immediately.
      if (adapter && currentOrg) {
        const updated = await adapter.updateOrg(currentOrg.id, { plan: plan.id })
        setCurrentOrg(updated)
      } else if (currentOrg) {
        setCurrentOrg({ ...currentOrg, plan: plan.id })
      }
      toast.success(
        tr('billing.planChanged', 'Plan updated').replace('{{plan}}', plan.name),
      )
      setPending(null)
    } catch {
      toast.error(tr('billing.planChangeFailed', "Couldn't change your plan. Please try again."))
    } finally {
      setBusy(false)
    }
  }

  if (plans.length === 0) {
    return (
      <div className={className ?? 'mx-auto max-w-5xl'}>
        <p className="text-sm text-muted-foreground">
          {tr('billing.noPlans', 'No plans are configured.')}
        </p>
      </div>
    )
  }

  return (
    <div className={className ?? 'mx-auto max-w-5xl space-y-8'}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {tr('billing.subscription.title', 'Subscription')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {tr('billing.subscription.subtitle', 'Manage your plan and unlock more features.')}
        </p>
      </div>

      {/* Current plan highlight */}
      <Card
        className={cn(
          'relative overflow-hidden',
          currentBadge.paid && 'border-amber-400/60 bg-gradient-to-br from-amber-50/60 to-transparent dark:from-amber-950/20',
        )}
      >
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                currentBadge.paid ? 'bg-amber-400/20 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground',
              )}
            >
              {currentBadge.paid ? <Crown className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {tr('billing.currentPlan', 'Current Plan')}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{currentBadge.label}</span>
                {currentBadge.paid && (
                  // Paid marker only — a literal "Pro" here was misleading next
                  // to non-Pro paid tiers ("Starter / Pro", QA finding).
                  <Badge
                    aria-label={tr('billing.paidPlan', 'Paid plan')}
                    className="border-amber-400/40 bg-amber-400/15 text-amber-700 dark:text-amber-300"
                  >
                    <Crown className="h-3 w-3" />
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {currentPlan && (
            <div className="text-right">
              <span className="text-2xl font-bold">{formatPrice(currentPlan, tr)}</span>
              <span className="text-sm text-muted-foreground">{intervalSuffix(currentPlan, tr)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId
          const paid = plan.price > 0
          return (
            <Card
              key={plan.id}
              className={cn(
                'relative flex flex-col',
                plan.highlighted && 'border-primary shadow-md',
                isCurrent && 'ring-2 ring-primary/40',
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge>
                    <Crown className="mr-1 h-3 w-3" />
                    {tr('billing.mostPopular', 'Most Popular')}
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  {paid && <Crown className="h-4 w-4 text-amber-500" />}
                </div>
                {plan.description && (
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                )}
              </CardHeader>
              <CardContent className="flex flex-1 flex-col pt-4">
                <div className="mb-6">
                  <span className="text-4xl font-bold">{formatPrice(plan, tr)}</span>
                  <span className="text-muted-foreground">{intervalSuffix(plan, tr)}</span>
                </div>
                <ul className="mb-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <PlanFeatureItem key={feature} feature={feature} className="text-sm" iconClassName="h-4 w-4" />
                  ))}
                </ul>
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    {tr('billing.currentPlan', 'Current Plan')}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? 'default' : 'outline'}
                    onClick={() => setPending(plan)}
                  >
                    {tr('billing.changeToPlan', 'Switch to this plan')}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Feature matrix */}
      {(entitlementsMatrix || allFeatures.length > 0) && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">
            {tr('billing.featureMatrix', 'Feature comparison')}
          </h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium">
                    {tr('billing.features', 'Features')}
                  </th>
                  {plans.map((plan) => (
                    <th key={plan.id} className="px-4 py-3 text-center font-medium">
                      <span className="inline-flex items-center gap-1">
                        {plan.price > 0 && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                        {plan.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entitlementsMatrix ? (
                  <>
                    {entitlementsMatrix.featureIds.map((id, i) => (
                      <tr key={`f:${id}`} className={cn(i % 2 === 1 && 'bg-muted/20')}>
                        <td className="px-4 py-2.5 text-left">{entitlementsMatrix.labelForFeature(id)}</td>
                        {plans.map((plan) => {
                          const entitled = getPlanEntitlements(plan)?.features?.[id] !== false
                          return (
                            <td key={plan.id} className="px-4 py-2.5 text-center">
                              {entitled ? (
                                <Check className="mx-auto h-4 w-4 text-primary" />
                              ) : (
                                <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    {entitlementsMatrix.limitKeys.map((key, i) => (
                      <tr key={`l:${key}`} className={cn((entitlementsMatrix.featureIds.length + i) % 2 === 1 && 'bg-muted/20')}>
                        <td className="px-4 py-2.5 text-left">{entitlementsMatrix.labelForLimit(key)}</td>
                        {plans.map((plan) => {
                          const cap = getPlanEntitlements(plan)?.limits?.[key]
                          const cell =
                            cap === undefined
                              ? '—'
                              : cap < 0
                                ? tr('billing.unlimited', 'Unlimited')
                                : tr('billing.upTo', 'Up to {count}').replace('{count}', String(cap)).replace('{{count}}', String(cap))
                          return (
                            <td key={plan.id} className="px-4 py-2.5 text-center text-muted-foreground">
                              {cell}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </>
                ) : (
                  allFeatures.map((feature, i) => (
                    <tr key={feature} className={cn(i % 2 === 1 && 'bg-muted/20')}>
                      <td className="px-4 py-2.5 text-left">{parsePlanFeature(feature).label}</td>
                      {plans.map((plan) => (
                        <td key={plan.id} className="px-4 py-2.5 text-center">
                          {plan.features.includes(feature) ? (
                            <Check className="mx-auto h-4 w-4 text-primary" />
                          ) : (
                            <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Change-plan confirm */}
      <ConfirmDialog
        open={pending !== null}
        onConfirm={() => pending && void applyChange(pending)}
        onCancel={() => setPending(null)}
        title={tr('billing.changePlanConfirmTitle', 'Change plan?')}
        description={
          pending
            ? tr('billing.changePlanConfirmBody', "You're switching to the {{plan}} plan.").replace('{{plan}}', pending.name)
            : undefined
        }
        confirmLabel={tr('billing.changePlanConfirm', 'Switch plan')}
        cancelLabel={tr('common.cancel', 'Cancel')}
        loading={busy}
      />
    </div>
  )
}
