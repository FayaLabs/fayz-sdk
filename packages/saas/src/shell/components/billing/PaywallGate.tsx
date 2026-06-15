import * as React from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@fayz-ai/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@fayz-ai/ui'
import { useBillingStore } from '../../stores/billing.store'
import { useTranslation } from '../../hooks/useTranslation'

interface PaywallGateProps {
  requiredPlan?: string
  requiredFeature?: string
  children: React.ReactNode
  fallback?: React.ReactNode
  onUpgrade?: () => void
}

export function PaywallGate({
  requiredPlan,
  requiredFeature,
  children,
  fallback,
  onUpgrade,
}: PaywallGateProps) {
  const { subscription, plans } = useBillingStore()

  const hasAccess = React.useMemo(() => {
    if (!requiredPlan && !requiredFeature) return true
    if (!subscription || subscription.status === 'canceled') return false

    if (requiredPlan) {
      const currentPlan = plans.find((p) => p.id === subscription.planId)
      const requiredPlanData = plans.find((p) => p.id === requiredPlan)
      if (!currentPlan || !requiredPlanData) return false

      const currentIndex = plans.indexOf(currentPlan)
      const requiredIndex = plans.indexOf(requiredPlanData)
      return currentIndex >= requiredIndex
    }

    if (requiredFeature) {
      const currentPlan = plans.find((p) => p.id === subscription.planId)
      if (!currentPlan) return false
      return currentPlan.features.some(
        (f) => f.toLowerCase().includes(requiredFeature.toLowerCase())
      )
    }

    return true
  }, [subscription, plans, requiredPlan, requiredFeature])

  if (hasAccess) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  const { t } = useTranslation()

  return (
    <Card className="border-dashed">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle className="text-lg">{t('billing.paywall.upgradeRequired')}</CardTitle>
        <CardDescription>
          {requiredPlan
            ? t('billing.paywall.requiresPlan', { plan: requiredPlan })
            : t('billing.paywall.notAvailable')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button onClick={onUpgrade}>
          {t('billing.paywall.viewPlans')}
        </Button>
      </CardContent>
    </Card>
  )
}
