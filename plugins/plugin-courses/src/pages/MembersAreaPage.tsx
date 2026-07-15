import * as React from 'react'
import { Badge } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { getCoursesProvider, type Order, type Course } from '@fayz-ai/courses'
import { PageContainer, SimpleTable, type SimpleColumn } from '../components/CommerceUI'

interface Row {
  courseId: string
  title: string
  status: Course['status']
  students: number
}

export function MembersAreaPage() {
  const t = useTranslation()
  const [rows, setRows] = React.useState<Row[] | null>(null)

  React.useEffect(() => {
    const p = getCoursesProvider()
    void Promise.all([p.listCourses(), p.listOrders({ financialStatus: 'paid' })]).then(([courses, orders]) => {
      setRows(buildMembersAreas(courses, orders))
    })
  }, [])

  const columns: SimpleColumn<Row>[] = [
    { key: 'title', header: t('courses.membersArea.name') || 'Members area', render: (r) => <span className="font-medium text-foreground">{r.title}</span> },
    { key: 'status', header: t('courses.membersArea.status') || 'Status', render: (r) => (
      <Badge variant={r.status === 'published' ? 'success' : r.status === 'archived' ? 'outline' : 'secondary'}>
        {t(`courses.status.${r.status}`) || r.status}
      </Badge>
    ) },
    { key: 'students', header: t('courses.membersArea.students') || 'Students', align: 'right', render: (r) => <span className="text-foreground">{r.students}</span> },
  ]

  return (
    <PageContainer title={t('courses.membersArea.title') || 'Members area'} subtitle={t('courses.membersArea.subtitle') || 'One area per course; students land here after purchase.'}>
      <SimpleTable
        columns={columns}
        rows={rows ?? []}
        empty={t('courses.membersArea.empty') || 'No members areas yet.'}
      />
    </PageContainer>
  )
}
MembersAreaPage.displayName = 'MembersAreaPage'

function buildMembersAreas(courses: Course[], orders: Order[]): Row[] {
  const students = new Map<string, Set<string>>()
  for (const o of orders) {
    const set = students.get(o.courseId) ?? new Set<string>()
    if (o.customerId) set.add(o.customerId)
    students.set(o.courseId, set)
  }
  return courses.map((c) => ({
    courseId: c.id,
    title: c.title,
    status: c.status,
    students: students.get(c.id)?.size ?? 0,
  }))
}
