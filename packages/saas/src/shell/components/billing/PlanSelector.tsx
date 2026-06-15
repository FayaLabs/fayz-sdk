import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from '@fayz-ai/ui'
import { Badge } from '@fayz-ai/ui'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@fayz-ai/ui'
import { useTranslation } from '../../hooks/useTranslation'
import type { Plan, PlanInterval } from '../../types'

interface PlanSelectorProps {
  plans: Plan[]
  currentPlanId?: string
  interval: PlanInterval
  onIntervalChange: (interval: PlanInterval) => void
  onSelectPlan: (planId: string) => void
  loading?: boolean
}

export function PlanSelector({
  plans,
  currentPlanId,
  interval,
  onIntervalChange,
  onSelectPlan,
  loading,
}: PlanSelectorProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-colors',
            interval === 'monthly'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onIntervalChange('monthly')}
        >
          {t('billing.monthly')}
        </button>
        <button
          type="button"
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-colors',
            interval === 'yearly'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onIntervalChange('yearly')}
        >
          {t('billing.yearly')}
          <span className="ml-1.5 text-xs opacity-80">{t('billing.yearlySave')}</span>
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId
          const price = interval === 'monthly' ? (plan.prices?.monthly ?? plan.priceMonthly) : (plan.prices?.yearly ?? plan.priceYearly)

          return (
            <Card
              key={plan.id}
              className={cn(
                'relative flex flex-col',
                plan.popular && 'border-primary shadow-md'
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge>{t('billing.mostPopular')}</Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    ${price}
                  </span>
                  <span className="text-muted-foreground">
                    /{interval === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    {t('billing.currentPlan')}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    disabled={loading}
                    onClick={() => onSelectPlan(plan.id)}
                  >
                    {loading ? t('billing.processing') : t('billing.getStarted')}
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
