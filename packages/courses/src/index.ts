// @fayz-ai/courses — the education domain (the counterpart of @fayz-ai/shop).
export type {
  Course, CourseStatus, Module, Lesson, Enrollment, Progress, EnrolledCourse,
  CreateCourseInput, UpdateCourseInput,
  CreateModuleInput, UpdateModuleInput,
  CreateLessonInput, UpdateLessonInput,
  ListCoursesOptions,
  // Commerce layer
  Offer, OfferKind, RecurringInterval, CreateOfferInput, UpdateOfferInput,
  Order, PaymentMethod, FinancialStatus, ListOrdersOptions,
  Subscription, SubscriptionStatus, ListSubscriptionsOptions,
  Payout, PayoutStatus, CreatorAccount, FinancialSummary,
} from './types'

export type { CoursesProvider } from './provider'
export { setCoursesProvider, getCoursesProvider, getCoursesProviderOptional } from './provider'

export { MockCoursesProvider, createMockCoursesProvider } from './mock-provider'
export type { MockCoursesSeed } from './mock-provider'

// Supabase-backed provider + tenant scoping (the "fayz-course" central DB).
export { createSupabaseCoursesProvider } from './supabase-provider'
export { setCoursesTenantResolver, getCoursesTenantId } from './tenant'
export type { TenantResolver } from './tenant'
export { createSafeCoursesProvider } from './safe-provider'

export {
  buildCourseCatalog, DEFAULT_COURSE_CATALOG,
  buildDemoLedger, DEFAULT_DEMO_LEDGER, DEMO_PLATFORM_FEE_BPS,
} from './seed'
export type { CourseCatalog, CourseSeedInput, DemoLedger } from './seed'

export { useMyCourses, useCourse, useCourseProgress } from './hooks'
