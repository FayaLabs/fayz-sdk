import { useEffect, useState, useCallback } from 'react'
import { getCoursesProvider } from './provider'
import type { Course, Module, Lesson, Enrollment, Progress, EnrolledCourse } from './types'

/** Courses a customer owns, with progress % — the "my courses" data. */
export function useMyCourses(customerId: string | null): { courses: EnrolledCourse[]; loading: boolean; refresh: () => void } {
  const [courses, setCourses] = useState<EnrolledCourse[]>([])
  const [loading, setLoading] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!customerId) {
      setCourses([])
      return
    }
    let active = true
    setLoading(true)
    ;(async () => {
      const provider = getCoursesProvider()
      const enrollments = await provider.listEnrollments(customerId)
      const result: EnrolledCourse[] = []
      for (const enrollment of enrollments) {
        const course = await provider.getCourse(enrollment.courseId)
        if (!course) continue
        const lessons = await provider.listLessons(course.id)
        const progress = await provider.listProgress(enrollment.id)
        const completedLessons = progress.filter((p) => p.completed).length
        result.push({
          course,
          enrollment,
          totalLessons: lessons.length,
          completedLessons,
          progressPercent: lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0,
        })
      }
      if (active) {
        setCourses(result.sort((a, b) => a.course.sortOrder - b.course.sortOrder))
        setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [customerId, tick])

  return { courses, loading, refresh: () => setTick((t) => t + 1) }
}

/** A course's full content tree (modules + lessons) for the player. */
export function useCourse(idOrSlug: string | null): {
  course: Course | null
  modules: Module[]
  lessons: Lesson[]
  loading: boolean
} {
  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!idOrSlug) return
    let active = true
    setLoading(true)
    ;(async () => {
      const provider = getCoursesProvider()
      const c = await provider.getCourse(idOrSlug)
      if (!c) {
        if (active) { setCourse(null); setLoading(false) }
        return
      }
      const [m, l] = await Promise.all([provider.listModules(c.id), provider.listLessons(c.id)])
      if (active) {
        setCourse(c)
        setModules(m)
        setLessons(l)
        setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [idOrSlug])

  return { course, modules, lessons, loading }
}

/** Per-enrollment progress + a completion toggle. */
export function useCourseProgress(enrollmentId: string | null): {
  progressByLesson: Record<string, Progress>
  isCompleted: (lessonId: string) => boolean
  markLessonComplete: (lessonId: string, completed?: boolean) => Promise<void>
  refresh: () => void
} {
  const [map, setMap] = useState<Record<string, Progress>>({})
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!enrollmentId) return
    let active = true
    ;(async () => {
      const list = await getCoursesProvider().listProgress(enrollmentId)
      if (active) setMap(Object.fromEntries(list.map((p) => [p.lessonId, p])))
    })()
    return () => {
      active = false
    }
  }, [enrollmentId, tick])

  const markLessonComplete = useCallback(
    async (lessonId: string, completed = true) => {
      if (!enrollmentId) return
      const updated = await getCoursesProvider().setLessonProgress(enrollmentId, lessonId, { completed })
      setMap((m) => ({ ...m, [lessonId]: updated }))
    },
    [enrollmentId],
  )

  return {
    progressByLesson: map,
    isCompleted: (lessonId) => !!map[lessonId]?.completed,
    markLessonComplete,
    refresh: () => setTick((t) => t + 1),
  }
}
