// ---------------------------------------------------------------------------
// Courses domain — the education counterpart of @fayz-ai/shop. A Course is the
// sellable unit; Modules group Lessons; a Lesson carries a video (embed URL in
// this mock layer). Enrollment = a customer owns a course; Progress tracks
// per-lesson completion.
// ---------------------------------------------------------------------------

export type CourseStatus = 'draft' | 'published' | 'archived'

export interface Course {
  id: string
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  thumbnailUrl: string | null
  price: number
  currency: string
  status: CourseStatus
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Module {
  id: string
  courseId: string
  title: string
  sortOrder: number
}

export interface Lesson {
  id: string
  courseId: string
  moduleId: string
  title: string
  description: string | null
  /** Embed URL (YouTube/Vimeo) in the mock layer; a storage URL with a real backend. */
  videoUrl: string
  durationSec: number
  sortOrder: number
}

export interface Enrollment {
  id: string
  courseId: string
  customerId: string
  status: 'active' | 'refunded'
  enrolledAt: string
}

export interface Progress {
  id: string
  enrollmentId: string
  lessonId: string
  completed: boolean
  lastPositionSec: number
  completedAt: string | null
}

// Inputs -------------------------------------------------------------------

export interface CreateCourseInput {
  title: string
  slug?: string
  subtitle?: string
  description?: string
  thumbnailUrl?: string
  price?: number
  currency?: string
  status?: CourseStatus
  sortOrder?: number
}
export type UpdateCourseInput = Partial<CreateCourseInput>

export interface CreateModuleInput {
  courseId: string
  title: string
  sortOrder?: number
}
export type UpdateModuleInput = Partial<Omit<CreateModuleInput, 'courseId'>>

export interface CreateLessonInput {
  courseId: string
  moduleId: string
  title: string
  description?: string
  videoUrl: string
  durationSec?: number
  sortOrder?: number
}
export type UpdateLessonInput = Partial<Omit<CreateLessonInput, 'courseId' | 'moduleId'>>

export interface ListCoursesOptions {
  status?: CourseStatus
  slug?: string
  search?: string
}

/** A course plus the customer's enrollment + progress %, for "my courses". */
export interface EnrolledCourse {
  course: Course
  enrollment: Enrollment
  totalLessons: number
  completedLessons: number
  /** 0..100 */
  progressPercent: number
}
