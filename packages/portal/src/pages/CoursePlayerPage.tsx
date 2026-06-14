import React from 'react'
import { useCourse, useCourseProgress, getCoursesProvider } from '@fayz-ai/courses'
import { useMemberSession } from '../session'
import { navigateTo } from '../router'

export function CoursePlayerPage({ slug, lessonId }: { slug: string; lessonId?: string }) {
  const session = useMemberSession()
  const { course, modules, lessons, loading } = useCourse(slug)
  const [enrollmentId, setEnrollmentId] = React.useState<string | null>(null)

  // Resolve this learner's enrollment for the course → drives progress.
  React.useEffect(() => {
    let active = true
    if (!course || !session.customerId) return
    ;(async () => {
      const provider = getCoursesProvider()
      const enrollments = await provider.listEnrollments(session.customerId!)
      let enrollment = enrollments.find((e) => e.courseId === course.id)
      if (!enrollment) enrollment = await provider.enroll(course.id, session.customerId!)
      if (active) setEnrollmentId(enrollment.id)
    })()
    return () => { active = false }
  }, [course, session.customerId])

  const { isCompleted, markLessonComplete } = useCourseProgress(enrollmentId)

  if (loading || !course) {
    return <main className="px-4 py-12 text-center text-muted-foreground">Carregando…</main>
  }

  // Flatten lessons in true curriculum order (module order, then lesson order).
  // The provider sorts lessons by their per-module sortOrder, so a plain flat
  // list interleaves modules — walk modules to get the real sequence.
  const orderedLessons = modules.flatMap((m) => lessons.filter((l) => l.moduleId === m.id))

  const activeLesson = (lessonId && orderedLessons.find((l) => l.id === lessonId)) || orderedLessons[0]
  if (!activeLesson) {
    return <main className="px-4 py-12 text-center text-muted-foreground">Curso sem aulas ainda.</main>
  }

  const idx = orderedLessons.findIndex((l) => l.id === activeLesson.id)
  const nextLesson = idx >= 0 && idx < orderedLessons.length - 1 ? orderedLessons[idx + 1] : null

  function open(lid: string) {
    navigateTo(`/course/${course!.slug}/lesson/${lid}`)
  }

  async function completeAndAdvance() {
    await markLessonComplete(activeLesson!.id, true)
    if (nextLesson) open(nextLesson.id)
  }

  return (
    <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_320px]">
      {/* Player + lesson body */}
      <div>
        <button onClick={() => navigateTo('/')} className="mb-3 text-sm text-muted-foreground hover:text-foreground">
          ← Meus cursos
        </button>
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
          <iframe
            key={activeLesson.id}
            data-testid="lesson-video"
            src={activeLesson.videoUrl}
            title={activeLesson.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{course.title}</p>
            <h1 data-testid="lesson-title" className="text-xl font-bold text-foreground">{activeLesson.title}</h1>
          </div>
          <button
            data-testid="mark-complete"
            onClick={completeAndAdvance}
            className={`shrink-0 rounded-md px-4 py-2 text-sm font-semibold ${
              isCompleted(activeLesson.id)
                ? 'border border-border bg-card text-muted-foreground'
                : 'bg-primary text-primary-foreground'
            }`}
          >
            {isCompleted(activeLesson.id) ? '✓ Concluída' : 'Marcar como concluída'}
          </button>
        </div>
        {activeLesson.description && (
          <p className="mt-3 text-sm text-muted-foreground">{activeLesson.description}</p>
        )}
      </div>

      {/* Curriculum sidebar */}
      <aside data-testid="lesson-sidebar" className="rounded-xl border border-border bg-card p-3">
        {modules.map((mod) => (
          <div key={mod.id} className="mb-3">
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{mod.title}</p>
            <ul className="space-y-0.5">
              {lessons.filter((l) => l.moduleId === mod.id).map((lesson) => {
                const done = isCompleted(lesson.id)
                const current = lesson.id === activeLesson.id
                return (
                  <li key={lesson.id}>
                    <button
                      data-testid="sidebar-lesson"
                      data-completed={done ? 'true' : 'false'}
                      onClick={() => open(lesson.id)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm ${
                        current ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/60'
                      }`}
                    >
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                        done ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                      }`}>{done ? '✓' : ''}</span>
                      <span className="line-clamp-2">{lesson.title}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </aside>
    </main>
  )
}
