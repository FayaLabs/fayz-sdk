import React from 'react'
import { Clock, FileText, CalendarDays } from 'lucide-react'
import { Card, CardContent } from '@fayz-ai/ui'
import { Badge } from '@fayz-ai/ui'
import { ScheduleEditor } from './ScheduleEditor'
import { useTranslation } from '@fayz-ai/core'
import { usePluginRuntimeOptional as usePluginsOptional } from '@fayz-ai/core'
import { getWidgetsForZone } from '@fayz-ai/core'

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

// AccessTab is imported from ./AccessTab

export function ActivityTab() {
  const t = useTranslation()
  return (
    <ComingSoon
      icon={Clock}
      title={t('crud.archetype.activity.title')}
      description={t('crud.archetype.activity.description')}
    />
  )
}

export function DocumentsTab({ item }: { item?: any }) {
  const t = useTranslation()
  const runtime = usePluginsOptional()

  // Check if a plugin provides a documents widget (e.g., custom_forms)
  const widgets = runtime ? getWidgetsForZone(runtime, 'person.detail.documents') : []

  if (widgets.length > 0 && item) {
    const w = widgets[0]
    const Widget = w.component as React.ComponentType<any>
    return (
      <Widget
        item={item}
        config={w.config}
        runtime={runtime?.context}
        plugin={w.plugin}
        widget={w}
      />
    )
  }

  return (
    <ComingSoon
      icon={FileText}
      title={t('crud.archetype.documents.title')}
      description={t('crud.archetype.documents.description')}
    />
  )
}

export function FinancialTab({ item }: { item?: any }) {
  const runtime = usePluginsOptional()
  const widgets = runtime ? getWidgetsForZone(runtime, 'person.detail.financial') : []
  if (widgets.length > 0 && item) {
    const w = widgets[0]
    const Widget = w.component as React.ComponentType<any>
    return (
      <Widget
        item={item}
        config={w.config}
        runtime={runtime?.context}
        plugin={w.plugin}
        widget={w}
      />
    )
  }
  return null
}

export function ScheduleTab({ item }: { item: any }) {
  const t = useTranslation()
  if (!item?.id) {
    return (
      <ComingSoon
        icon={CalendarDays}
        title={t('crud.archetype.schedule.title')}
        description={t('crud.archetype.schedule.description')}
      />
    )
  }
  return <ScheduleEditor assigneeId={item.id} />
}

export const PERSON_DETAIL_TABS = [
  { id: 'schedule', label: 'Schedule', icon: 'CalendarDays', component: ScheduleTab, visibleFor: ['staff'] },
  { id: 'documents', label: 'Documents', icon: 'FileText', component: DocumentsTab },
  // Per-person financial statement — only shown when the financial plugin contributes
  // its widget (see requiresWidgetZone). Clients = paid invoices; staff = commissions.
  { id: 'financial', label: 'Statement', icon: 'DollarSign', component: FinancialTab, requiresWidgetZone: 'person.detail.financial' },
  { id: 'activity', label: 'Activity', icon: 'Clock', component: ActivityTab },
]
