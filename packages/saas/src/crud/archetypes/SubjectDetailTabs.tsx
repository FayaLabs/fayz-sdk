import React, { useEffect, useState } from 'react'
import { User, Clock, FileText } from 'lucide-react'
import { Card, CardContent } from '@fayz-ai/ui'
import { Badge } from '@fayz-ai/ui'
import { PersonLink } from './EntityLink'
import { getSupabaseClientOptional } from '@fayz-ai/core'
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

export function OwnerTab({ item }: { item: any }) {
  const t = useTranslation()
  const [person, setPerson] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const tutorId = item?.tutorId
    if (!tutorId) { setLoading(false); return }

    const supabase = getSupabaseClientOptional() as any
    if (!supabase) { setLoading(false); return }

    supabase.schema('saas_core')
      .from('persons')
      .select('*')
      .eq('id', tutorId)
      .single()
      .then(({ data }: any) => {
        setPerson(data)
        setLoading(false)
      }, () => setLoading(false))
  }, [item?.tutorId])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </CardContent>
      </Card>
    )
  }

  if (!person) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">{t('crud.archetype.owner.noOwner')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('crud.archetype.owner.assignHint')}</p>
        </CardContent>
      </Card>
    )
  }

  const fields = [
    { label: t('crud.archetype.owner.name'), value: person.name },
    { label: t('crud.archetype.owner.phone'), value: person.phone, href: person.phone ? `tel:${person.phone}` : undefined },
    { label: t('crud.archetype.owner.email'), value: person.email, href: person.email ? `mailto:${person.email}` : undefined },
    { label: t('crud.archetype.owner.document'), value: person.document_number },
    { label: t('crud.archetype.owner.address'), value: [person.address, person.city, person.state].filter(Boolean).join(', ') },
  ].filter((f) => f.value)

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <PersonLink personId={person.id} kind={person.kind} className="text-base font-semibold">
              {person.name}
            </PersonLink>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] capitalize">{person.kind}</Badge>
              <Badge variant={person.is_active ? 'default' : 'secondary'} className="text-[10px]">
                {person.is_active ? t('crud.archetype.owner.active') : t('crud.archetype.owner.inactive')}
              </Badge>
            </div>
          </div>
        </div>
        <dl className="divide-y">
          {fields.map((f) => (
            <div key={f.label} className="grid grid-cols-3 gap-4 py-2.5">
              <dt className="text-sm text-muted-foreground">{f.label}</dt>
              <dd className="col-span-2 text-sm">
                {f.href ? (
                  <a href={f.href} className="text-primary hover:underline">{f.value}</a>
                ) : f.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

export function SubjectHistoryTab() {
  const t = useTranslation()
  return (
    <ComingSoon
      icon={Clock}
      title={t('crud.archetype.history.title')}
      description={t('crud.archetype.history.description')}
    />
  )
}

export function SubjectDocumentsTab() {
  const t = useTranslation()
  return (
    <ComingSoon
      icon={FileText}
      title={t('crud.archetype.subjectDocuments.title')}
      description={t('crud.archetype.subjectDocuments.description')}
    />
  )
}

export const SUBJECT_DETAIL_TABS = [
  { id: 'owner', label: 'Owner', component: OwnerTab },
  { id: 'history', label: 'History', component: SubjectHistoryTab },
  { id: 'documents', label: 'Documents', component: SubjectDocumentsTab },
]
