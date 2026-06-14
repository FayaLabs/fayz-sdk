import * as React from 'react'
import { Calendar, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from '@fayz-ai/ui'
import { Badge } from '@fayz-ai/ui'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@fayz-ai/ui'
import { useTranslation } from '../../hooks/useTranslation'
import type { Subscription, Plan } from '../../types'

interface SubscriptionCardProps {
  subscription: Subscription
  plan?: Plan
  onCancel?: () => void
  onResume?: () => void
  loading?: boolean
}

const STATUS_KEYS: Record<string, { key: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { key: 'billing.status.active', variant: 'default' },
  trialing: { key: 'billing.status.trialing', variant: 'secondary' },
  past_due: { key: 'billing.status.pastDue', variant: 'destructive' },
  canceled: { key: 'billing.status.canceled', variant: 'outline' },
  paused: { key: 'billing.status.paused', variant: 'outline' },
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function SubscriptionCard({
  subscription,
  plan,
  onCancel,
  onResume,
  loading,
}: SubscriptionCardProps) {
  const { t } = useTranslation()
  const statusInfo = STATUS_KEYS[subscription.status] ?? STATUS_KEYS.active

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {plan?.name ?? t('billing.currentPlan')}
          </CardTitle>
          <Badge variant={statusInfo.variant}>{t(statusInfo.key)}</Badge>
        </div>
        {plan && <CardDescription>{plan.description}</CardDescription>}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {subscription.cancelAtPeriodEnd
              ? t('billing.cancelsOn', { date: formatDate(subscription.currentPeriodEnd) })
              : t('billing.nextBilling', { date: formatDate(subscription.currentPeriodEnd) })}
          </span>
        </div>

        {subscription.trialEnd && new Date(subscription.trialEnd) > new Date() && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>{t('billing.trialEnds', { date: formatDate(subscription.trialEnd) })}</span>
          </div>
        )}

        {plan && (
          <div className="text-sm">
            <span className="text-2xl font-bold">
              ${subscription.interval === 'monthly' ? (plan.prices?.monthly ?? plan.priceMonthly) : (plan.prices?.yearly ?? plan.priceYearly)}
            </span>
            <span className="text-muted-foreground">
              /{subscription.interval === 'monthly' ? 'mo' : 'yr'}
            </span>
          </div>
        )}

        {subscription.status === 'past_due' && (
          <div className={cn(
            'rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive'
          )}>
            {t('billing.pastDueWarning')}
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        {subscription.cancelAtPeriodEnd && onResume ? (
          <Button variant="default" onClick={onResume} disabled={loading}>
            {loading ? t('billing.resuming') : t('billing.resumeSubscription')}
          </Button>
        ) : (
          onCancel && subscription.status === 'active' && (
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              {loading ? t('billing.canceling') : t('billing.cancelSubscription')}
            </Button>
          )
        )}
      </CardFooter>
    </Card>
  )
}
