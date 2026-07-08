import type {
  Course, Module, Lesson, Enrollment, Progress,
  CreateCourseInput, UpdateCourseInput,
  CreateModuleInput, UpdateModuleInput,
  CreateLessonInput, UpdateLessonInput,
  ListCoursesOptions,
  Offer, CreateOfferInput, UpdateOfferInput,
  Order, ListOrdersOptions,
  Subscription, ListSubscriptionsOptions,
  Payout, CreatorAccount, FinancialSummary,
} from './types'

export interface CoursesProvider {
  // Courses
  listCourses(options?: ListCoursesOptions): Promise<Course[]>
  getCourse(idOrSlug: string): Promise<Course | null>
  createCourse(input: CreateCourseInput): Promise<Course>
  updateCourse(id: string, input: UpdateCourseInput): Promise<Course>
  deleteCourse(id: string): Promise<void>

  // Modules
  listModules(courseId: string): Promise<Module[]>
  createModule(input: CreateModuleInput): Promise<Module>
  updateModule(id: string, input: UpdateModuleInput): Promise<Module>
  deleteModule(id: string): Promise<void>

  // Lessons
  listLessons(courseId: string): Promise<Lesson[]>
  getLesson(id: string): Promise<Lesson | null>
  createLesson(input: CreateLessonInput): Promise<Lesson>
  updateLesson(id: string, input: UpdateLessonInput): Promise<Lesson>
  deleteLesson(id: string): Promise<void>

  // Enrollments + progress (member side)
  listEnrollments(customerId: string): Promise<Enrollment[]>
  enroll(courseId: string, customerId: string): Promise<Enrollment>
  listProgress(enrollmentId: string): Promise<Progress[]>
  setLessonProgress(
    enrollmentId: string,
    lessonId: string,
    patch: { completed?: boolean; lastPositionSec?: number },
  ): Promise<Progress>

  // Offers (pricing / order-bumps)
  listOffers(courseId: string): Promise<Offer[]>
  createOffer(input: CreateOfferInput): Promise<Offer>
  updateOffer(id: string, input: UpdateOfferInput): Promise<Offer>
  deleteOffer(id: string): Promise<void>

  // Sales ledger
  listOrders(options?: ListOrdersOptions): Promise<Order[]>

  // Recurring subscriptions
  listSubscriptions(options?: ListSubscriptionsOptions): Promise<Subscription[]>

  // Financial / payouts / Stripe Connect
  getFinancialSummary(): Promise<FinancialSummary>
  listPayouts(): Promise<Payout[]>
  getCreatorAccount(): Promise<CreatorAccount>
}

// Global provider holder (mirrors @fayz-ai/shop's setShopProvider/getShopProvider).
let _provider: CoursesProvider | null = null

export function setCoursesProvider(provider: CoursesProvider): void {
  _provider = provider
}

export function getCoursesProvider(): CoursesProvider {
  if (!_provider) {
    throw new Error('Courses provider not set. Call setCoursesProvider() (e.g. createMockCoursesProvider).')
  }
  return _provider
}

export function getCoursesProviderOptional(): CoursesProvider | null {
  return _provider
}
