import React from 'react'
import { BarChart3, Truck, Tag, Clock } from 'lucide-react'
import { Card, CardContent } from '@fayz-ai/ui'
import { Badge } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'

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

export function InventoryTab() {
  const t = useTranslation()
  return (
    <ComingSoon
      icon={BarChart3}
      title={t('crud.archetype.inventory.title')}
      description={t('crud.archetype.inventory.description')}
    />
  )
}

export function SuppliersTab() {
  const t = useTranslation()
  return (
    <ComingSoon
      icon={Truck}
      title={t('crud.archetype.suppliers.title')}
      description={t('crud.archetype.suppliers.description')}
    />
  )
}

export function PricingTab() {
  const t = useTranslation()
  return (
    <ComingSoon
      icon={Tag}
      title={t('crud.archetype.pricing.title')}
      description={t('crud.archetype.pricing.description')}
    />
  )
}

export function ProductActivityTab() {
  const t = useTranslation()
  return (
    <ComingSoon
      icon={Clock}
      title={t('crud.archetype.productActivity.title')}
      description={t('crud.archetype.productActivity.description')}
    />
  )
}

export const PRODUCT_DETAIL_TABS = [
  { id: 'inventory', label: 'Inventory', component: InventoryTab },
  { id: 'suppliers', label: 'Suppliers', component: SuppliersTab },
  { id: 'pricing', label: 'Pricing', component: PricingTab },
  { id: 'activity', label: 'Activity', component: ProductActivityTab },
]
