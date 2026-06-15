import * as React from 'react'
import { Button, Input, toast } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import {
  getCoursesProvider,
  type Course, type Module, type Lesson, type CourseStatus,
} from '@fayz-ai/courses'
import { navigateTo } from '../nav'

const STATUSES: CourseStatus[] = ['draft', 'published', 'archived']

export function CourseEditorPage({ id }: { id?: string }) {
  const t = useTranslation()
  const [tab, setTab] = React.useState<'details' | 'curriculum'>('details')
  const [course, setCourse] = React.useState<Course | null>(null)
  const [modules, setModules] = React.useState<Module[]>([])
  const [lessons, setLessons] = React.useState<Lesson[]>([])

  const reload = React.useCallback(async () => {
    if (!id) return
    const provider = getCoursesProvider()
    const c = await provider.getCourse(id)
    setCourse(c)
    if (c) {
      const [m, l] = await Promise.all([provider.listModules(c.id), provider.listLessons(c.id)])
      setModules(m)
      setLessons(l)
    }
  }, [id])

  React.useEffect(() => { void reload() }, [reload])

  if (!course) {
    return <div className="p-8 text-muted-foreground">…</div>
  }

  async function saveDetails() {
    const provider = getCoursesProvider()
    await provider.updateCourse(course!.id, {
      title: course!.title,
      subtitle: course!.subtitle ?? undefined,
      description: course!.description ?? undefined,
      price: course!.price,
      status: course!.status,
    })
    toast.success(t('courses.editor.saved') || 'Course saved')
  }

  function patchCourse(patch: Partial<Course>) {
    setCourse((c) => (c ? { ...c, ...patch } : c))
  }

  // --- module / lesson mutations (persist immediately, then reload) ---------
  async function addModule() {
    await getCoursesProvider().createModule({
      courseId: course!.id,
      title: t('courses.editor.untitledModule') || 'New module',
    })
    await reload()
  }
  async function renameModule(moduleId: string, title: string) {
    await getCoursesProvider().updateModule(moduleId, { title })
  }
  async function deleteModule(moduleId: string) {
    await getCoursesProvider().deleteModule(moduleId)
    await reload()
  }
  async function addLesson(moduleId: string) {
    await getCoursesProvider().createLesson({
      courseId: course!.id,
      moduleId,
      title: t('courses.editor.untitledLesson') || 'New lesson',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    })
    await reload()
  }
  async function patchLesson(lessonId: string, patch: Partial<Lesson>) {
    await getCoursesProvider().updateLesson(lessonId, {
      title: patch.title,
      videoUrl: patch.videoUrl,
      durationSec: patch.durationSec,
      description: patch.description ?? undefined,
    })
  }
  async function deleteLesson(lessonId: string) {
    await getCoursesProvider().deleteLesson(lessonId)
    await reload()
  }

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <button onClick={() => navigateTo('/courses')} className="mb-4 text-sm text-muted-foreground hover:text-foreground">
        ← {t('courses.editor.back') || 'Back to courses'}
      </button>

      <h1 className="mb-1 text-2xl font-bold text-foreground">{course.title}</h1>

      <div className="mb-6 mt-4 flex gap-2 border-b border-border">
        {(['details', 'curriculum'] as const).map((tk) => (
          <button
            key={tk}
            onClick={() => setTab(tk)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === tk ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'
            }`}
          >
            {tk === 'details' ? (t('courses.editor.details') || 'Details') : (t('courses.editor.curriculum') || 'Curriculum')}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <div className="max-w-xl space-y-4">
          <Field label={t('courses.editor.fieldTitle') || 'Title'}>
            <Input value={course.title} onChange={(e) => patchCourse({ title: e.target.value })} />
          </Field>
          <Field label={t('courses.editor.fieldSubtitle') || 'Subtitle'}>
            <Input value={course.subtitle ?? ''} onChange={(e) => patchCourse({ subtitle: e.target.value })} />
          </Field>
          <Field label={t('courses.editor.fieldDescription') || 'Description'}>
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={course.description ?? ''}
              onChange={(e) => patchCourse({ description: e.target.value })}
            />
          </Field>
          <div className="flex gap-4">
            <Field label={t('courses.editor.fieldPrice') || 'Price'}>
              <Input
                type="number"
                value={String(course.price)}
                onChange={(e) => patchCourse({ price: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label={t('courses.editor.fieldStatus') || 'Status'}>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={course.status}
                onChange={(e) => patchCourse({ status: e.target.value as CourseStatus })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{t(`courses.status.${s}`) || s}</option>
                ))}
              </select>
            </Field>
          </div>
          <Button onClick={saveDetails}>{t('courses.editor.save') || 'Save'}</Button>
        </div>
      )}

      {tab === 'curriculum' && (
        <div className="space-y-6">
          {modules.map((mod) => (
            <div key={mod.id} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Input
                  className="font-medium"
                  defaultValue={mod.title}
                  onBlur={(e) => renameModule(mod.id, e.target.value)}
                  aria-label={t('courses.editor.moduleTitle') || 'Module title'}
                />
                <Button variant="ghost" size="sm" onClick={() => deleteModule(mod.id)}>
                  {t('courses.editor.deleteModule') || 'Delete module'}
                </Button>
              </div>
              <div className="space-y-2">
                {lessons.filter((l) => l.moduleId === mod.id).map((lesson) => (
                  <div key={lesson.id} className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 md:grid-cols-[1fr_1fr_90px_auto]">
                    <Input
                      defaultValue={lesson.title}
                      placeholder={t('courses.editor.lessonTitle') || 'Lesson title'}
                      onBlur={(e) => patchLesson(lesson.id, { title: e.target.value })}
                    />
                    <Input
                      defaultValue={lesson.videoUrl}
                      placeholder={t('courses.editor.lessonVideo') || 'Video URL (embed)'}
                      onBlur={(e) => patchLesson(lesson.id, { videoUrl: e.target.value })}
                    />
                    <Input
                      type="number"
                      defaultValue={String(Math.round(lesson.durationSec / 60))}
                      onBlur={(e) => patchLesson(lesson.id, { durationSec: (Number(e.target.value) || 0) * 60 })}
                      aria-label={t('courses.editor.lessonDuration') || 'Duration (min)'}
                    />
                    <Button variant="ghost" size="sm" onClick={() => deleteLesson(lesson.id)}>
                      {t('courses.editor.deleteLesson') || 'Remove'}
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addLesson(mod.id)}>
                  + {t('courses.editor.addLesson') || 'Add lesson'}
                </Button>
              </div>
            </div>
          ))}
          <Button onClick={addModule}>{t('courses.editor.addModule') || 'Add module'}</Button>
        </div>
      )}
    </div>
  )
}
CourseEditorPage.displayName = 'CourseEditorPage'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}
