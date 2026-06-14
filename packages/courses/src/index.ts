// @fayz-ai/courses — the education domain (the counterpart of @fayz-ai/shop).
export type {
  Course, CourseStatus, Module, Lesson, Enrollment, Progress, EnrolledCourse,
  CreateCourseInput, UpdateCourseInput,
  CreateModuleInput, UpdateModuleInput,
  CreateLessonInput, UpdateLessonInput,
  ListCoursesOptions,
} from './types'

export type { CoursesProvider } from './provider'
export { setCoursesProvider, getCoursesProvider, getCoursesProviderOptional } from './provider'

export { MockCoursesProvider, createMockCoursesProvider } from './mock-provider'
export type { MockCoursesSeed } from './mock-provider'

export { buildCourseCatalog, DEFAULT_COURSE_CATALOG } from './seed'
export type { CourseCatalog, CourseSeedInput } from './seed'

export { useMyCourses, useCourse, useCourseProgress } from './hooks'
