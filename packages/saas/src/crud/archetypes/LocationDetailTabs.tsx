import React from 'react'
import { Users, CalendarDays, BarChart3, Clock } from 'lucide-react'
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

export function MembersTab() {
  const t = useTranslation()
  return (
    <ComingSoon
      icon={Users}
      title={t('crud.archetype.members.title')}
      description={t('crud.archetype.members.description')}
    />
  )
}

export function LocationScheduleTab() {
  const t = useTranslation()
  return (
    <ComingSoon
      icon={CalendarDays}
      title={t('crud.archetype.locationSchedule.title')}
      description={t('crud.archetype.locationSchedule.description')}
    />
  )
}

export function LocationStatsTab() {
  const t = useTranslation()
  return (
    <ComingSoon
      icon={BarChart3}
      title={t('crud.archetype.locationStats.title')}
      description={t('crud.archetype.locationStats.description')}
    />
  )
}

export function LocationActivityTab() {
  const t = useTranslation()
  return (
    <ComingSoon
      icon={Clock}
      title={t('crud.archetype.locationActivity.title')}
      description={t('crud.archetype.locationActivity.description')}
    />
  )
}

export const LOCATION_DETAIL_TABS = [
  { id: 'members', label: 'Team', component: MembersTab },
  { id: 'schedule', label: 'Hours', component: LocationScheduleTab },
  { id: 'stats', label: 'Statistics', component: LocationStatsTab },
  { id: 'activity', label: 'Activity', component: LocationActivityTab },
]
