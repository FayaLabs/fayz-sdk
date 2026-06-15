import * as React from 'react'
import { Button, Badge } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { getCoursesProvider, type Course } from '@fayz-ai/courses'
import { navigateTo } from '../nav'

function statusVariant(status: Course['status']): 'success' | 'secondary' | 'outline' {
  if (status === 'published') return 'success'
  if (status === 'archived') return 'outline'
  return 'secondary'
}

export function CoursesListPage() {
  const t = useTranslation()
  const [courses, setCourses] = React.useState<Course[] | null>(null)
  const [creating, setCreating] = React.useState(false)

  const load = React.useCallback(async () => {
    setCourses(await getCoursesProvider().listCourses())
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  async function onCreate() {
    setCreating(true)
    try {
      const course = await getCoursesProvider().createCourse({
        title: t('courses.editor.untitledCourse') || 'Untitled course',
        status: 'draft',
      })
      navigateTo(`/courses/${course.id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('courses.title') || 'Courses'}</h1>
          {courses && (
            <p className="mt-1 text-sm text-muted-foreground">
              {(t('courses.count') || '{count} courses').replace('{count}', String(courses.length))}
            </p>
          )}
        </div>
        <Button onClick={onCreate} disabled={creating}>
          {t('courses.new') || 'New course'}
        </Button>
      </div>

      {courses && courses.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          {t('courses.empty') || 'No courses yet. Create your first one.'}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses?.map((course) => (
          <button
            key={course.id}
            onClick={() => navigateTo(`/courses/${course.id}`)}
            className="group overflow-hidden rounded-xl border border-border bg-card text-left transition hover:border-primary hover:shadow-md"
          >
            <div className="aspect-video w-full overflow-hidden bg-muted">
              {course.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground line-clamp-2">{course.title}</h3>
                <Badge variant={statusVariant(course.status)}>
                  {t(`courses.status.${course.status}`) || course.status}
                </Badge>
              </div>
              {course.subtitle && (
                <p className="text-sm text-muted-foreground line-clamp-2">{course.subtitle}</p>
              )}
              <p className="text-sm font-medium text-foreground">
                {course.price > 0 ? `${course.currency} ${course.price.toFixed(2)}` : '—'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
CoursesListPage.displayName = 'CoursesListPage'
