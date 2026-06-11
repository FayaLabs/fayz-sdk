import React from 'react'
import { CalendarDays, Tag, Clock } from 'lucide-react'
import { Card, CardContent } from '@fayz/ui'
import { Badge } from '@fayz/ui'
import { useTranslation } from '@fayz/core'

function ComingSoon({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  const t = useTranslation()
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>
        <Badge variant="secondary" className="mt-3 text-[10px]">{t('crud.archetype.comingSoon')}</Badge>
      </CardContent>
    </Card>
  )
}

export function AvailabilityTab() {
  const t = useTranslation()
  return (
    <ComingSoon
      icon={CalendarDays}
      title={t('crud.archetype.availability.title')}
      description={t('crud.archetype.availability.description')}
    />
  )
}

export function ServicePricingTab() {
  const t = useTranslation()
  return (
    <ComingSoon
      icon={Tag}
      title={t('crud.archetype.servicePricing.title')}
      description={t('crud.archetype.servicePricing.description')}
    />
  )
}

export function ServiceActivityTab() {
  const t = useTranslation()
  return (
    <ComingSoon
      icon={Clock}
      title={t('crud.archetype.serviceActivity.title')}
      description={t('crud.archetype.serviceActivity.description')}
    />
  )
}

export const SERVICE_DETAIL_TABS = [
  { id: 'availability', label: 'Availability', component: AvailabilityTab },
  { id: 'pricing', label: 'Pricing', component: ServicePricingTab },
  { id: 'activity', label: 'Activity', component: ServiceActivityTab },
]
