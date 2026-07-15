import type { CoursesProvider } from './provider'
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
import {
  DEFAULT_COURSE_CATALOG, DEFAULT_DEMO_LEDGER, DEMO_PLATFORM_FEE_BPS,
  type CourseCatalog, type DemoLedger,
} from './seed'

function uid() {
  return Math.random().toString(36).slice(2)
}
function now() {
  return new Date().toISOString()
}
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const K = {
  courses: 'fayz.courses.mock.courses.v1',
  modules: 'fayz.courses.mock.modules.v1',
  lessons: 'fayz.courses.mock.lessons.v1',
  enrollments: 'fayz.courses.mock.enrollments.v1',
  progress: 'fayz.courses.mock.progress.v1',
  offers: 'fayz.courses.mock.offers.v1',
  orders: 'fayz.courses.mock.orders.v1',
  subscriptions: 'fayz.courses.mock.subscriptions.v1',
  payouts: 'fayz.courses.mock.payouts.v1',
}

function load<T>(key: string): T[] | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : null
  } catch {
    return null
  }
}
function save<T>(key: string, value: T[]): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* non-fatal in mock mode */
  }
}

export interface MockCoursesSeed {
  catalog?: CourseCatalog
  /** Demo sales/subscriptions/payouts for the admin commerce surfaces. */
  ledger?: DemoLedger
  /** Customer ids auto-enrolled in all courses (so the member area has data on first run). */
  enrollAll?: string[]
}

/**
 * Mock courses provider. Courses/modules/lessons are seeded from the catalog on
 * first run, then PERSISTED (so admin edits survive). Enrollments/progress are
 * persisted too. Both example apps share the default catalog, so admin↔member
 * stay consistent.
 */
export class MockCoursesProvider implements CoursesProvider {
  constructor(seed?: MockCoursesSeed) {
    const catalog = seed?.catalog ?? DEFAULT_COURSE_CATALOG
    const ledger = seed?.ledger ?? DEFAULT_DEMO_LEDGER
    if (load<Course>(K.courses) == null) {
      save(K.courses, catalog.courses)
      save(K.modules, catalog.modules)
      save(K.lessons, catalog.lessons)
      save(K.offers, catalog.offers)
      save(K.orders, ledger.orders)
      save(K.subscriptions, ledger.subscriptions)
      save(K.payouts, ledger.payouts)
    }
    // Auto-enroll demo customers in every course (idempotent).
    if (seed?.enrollAll?.length) {
      const courses = load<Course>(K.courses) ?? []
      const enrollments = load<Enrollment>(K.enrollments) ?? []
      let changed = false
      for (const customerId of seed.enrollAll) {
        for (const c of courses) {
          if (!enrollments.some((e) => e.customerId === customerId && e.courseId === c.id)) {
            enrollments.push({ id: uid(), courseId: c.id, customerId, status: 'active', enrolledAt: now() })
            changed = true
          }
        }
      }
      if (changed) save(K.enrollments, enrollments)
    }
  }

  private courses() { return load<Course>(K.courses) ?? [] }
  private modules() { return load<Module>(K.modules) ?? [] }
  private lessons() { return load<Lesson>(K.lessons) ?? [] }
  private enrollments() { return load<Enrollment>(K.enrollments) ?? [] }
  private progress() { return load<Progress>(K.progress) ?? [] }
  private offers() { return load<Offer>(K.offers) ?? [] }
  private orders() { return load<Order>(K.orders) ?? [] }
  private subscriptions() { return load<Subscription>(K.subscriptions) ?? [] }
  private payouts() { return load<Payout>(K.payouts) ?? [] }

  // Courses -----------------------------------------------------------------
  async listCourses(opts?: ListCoursesOptions): Promise<Course[]> {
    let list = this.courses()
    if (opts?.status) list = list.filter((c) => c.status === opts.status)
    if (opts?.slug) list = list.filter((c) => c.slug === opts.slug)
    if (opts?.search) {
      const q = opts.search.toLowerCase()
      list = list.filter((c) => c.title.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q))
    }
    return list.slice().sort((a, b) => a.sortOrder - b.sortOrder)
  }
  async getCourse(idOrSlug: string): Promise<Course | null> {
    return this.courses().find((c) => c.id === idOrSlug || c.slug === idOrSlug) ?? null
  }
  async createCourse(input: CreateCourseInput): Promise<Course> {
    const list = this.courses()
    const course: Course = {
      id: uid(),
      slug: input.slug ?? slugify(input.title),
      title: input.title,
      subtitle: input.subtitle ?? null,
      description: input.description ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      price: input.price ?? 0,
      currency: input.currency ?? 'BRL',
      status: input.status ?? 'draft',
      sortOrder: input.sortOrder ?? list.length,
      createdAt: now(),
      updatedAt: now(),
    }
    save(K.courses, [...list, course])
    return course
  }
  async updateCourse(id: string, input: UpdateCourseInput): Promise<Course> {
    const list = this.courses()
    const idx = list.findIndex((c) => c.id === id)
    if (idx < 0) throw new Error('Course not found')
    const updated = { ...list[idx], ...input, updatedAt: now() } as Course
    list[idx] = updated
    save(K.courses, list)
    return updated
  }
  async deleteCourse(id: string): Promise<void> {
    save(K.courses, this.courses().filter((c) => c.id !== id))
  }

  // Modules -----------------------------------------------------------------
  async listModules(courseId: string): Promise<Module[]> {
    return this.modules().filter((m) => m.courseId === courseId).sort((a, b) => a.sortOrder - b.sortOrder)
  }
  async createModule(input: CreateModuleInput): Promise<Module> {
    const list = this.modules()
    const mod: Module = { id: uid(), courseId: input.courseId, title: input.title, sortOrder: input.sortOrder ?? list.filter((m) => m.courseId === input.courseId).length }
    save(K.modules, [...list, mod])
    return mod
  }
  async updateModule(id: string, input: UpdateModuleInput): Promise<Module> {
    const list = this.modules()
    const idx = list.findIndex((m) => m.id === id)
    if (idx < 0) throw new Error('Module not found')
    list[idx] = { ...list[idx], ...input } as Module
    save(K.modules, list)
    return list[idx]
  }
  async deleteModule(id: string): Promise<void> {
    save(K.modules, this.modules().filter((m) => m.id !== id))
  }

  // Lessons -----------------------------------------------------------------
  async listLessons(courseId: string): Promise<Lesson[]> {
    return this.lessons().filter((l) => l.courseId === courseId).sort((a, b) => a.sortOrder - b.sortOrder)
  }
  async getLesson(id: string): Promise<Lesson | null> {
    return this.lessons().find((l) => l.id === id) ?? null
  }
  async createLesson(input: CreateLessonInput): Promise<Lesson> {
    const list = this.lessons()
    const lesson: Lesson = {
      id: uid(),
      courseId: input.courseId,
      moduleId: input.moduleId,
      title: input.title,
      description: input.description ?? null,
      videoUrl: input.videoUrl,
      durationSec: input.durationSec ?? 600,
      sortOrder: input.sortOrder ?? list.filter((l) => l.moduleId === input.moduleId).length,
    }
    save(K.lessons, [...list, lesson])
    return lesson
  }
  async updateLesson(id: string, input: UpdateLessonInput): Promise<Lesson> {
    const list = this.lessons()
    const idx = list.findIndex((l) => l.id === id)
    if (idx < 0) throw new Error('Lesson not found')
    list[idx] = { ...list[idx], ...input } as Lesson
    save(K.lessons, list)
    return list[idx]
  }
  async deleteLesson(id: string): Promise<void> {
    save(K.lessons, this.lessons().filter((l) => l.id !== id))
  }

  // Enrollments + progress --------------------------------------------------
  async listEnrollments(customerId: string): Promise<Enrollment[]> {
    return this.enrollments().filter((e) => e.customerId === customerId)
  }
  async enroll(courseId: string, customerId: string): Promise<Enrollment> {
    const list = this.enrollments()
    const existing = list.find((e) => e.courseId === courseId && e.customerId === customerId)
    if (existing) return existing
    const enrollment: Enrollment = { id: uid(), courseId, customerId, status: 'active', enrolledAt: now() }
    save(K.enrollments, [...list, enrollment])
    return enrollment
  }
  async listProgress(enrollmentId: string): Promise<Progress[]> {
    return this.progress().filter((p) => p.enrollmentId === enrollmentId)
  }
  async setLessonProgress(enrollmentId: string, lessonId: string, patch: { completed?: boolean; lastPositionSec?: number }): Promise<Progress> {
    const list = this.progress()
    const idx = list.findIndex((p) => p.enrollmentId === enrollmentId && p.lessonId === lessonId)
    if (idx >= 0) {
      const updated: Progress = {
        ...list[idx],
        completed: patch.completed ?? list[idx].completed,
        lastPositionSec: patch.lastPositionSec ?? list[idx].lastPositionSec,
        completedAt: (patch.completed ?? list[idx].completed) ? (list[idx].completedAt ?? now()) : null,
      }
      list[idx] = updated
      save(K.progress, list)
      return updated
    }
    const created: Progress = {
      id: uid(),
      enrollmentId,
      lessonId,
      completed: patch.completed ?? false,
      lastPositionSec: patch.lastPositionSec ?? 0,
      completedAt: patch.completed ? now() : null,
    }
    save(K.progress, [...list, created])
    return created
  }

  // Offers ------------------------------------------------------------------
  async listOffers(courseId: string): Promise<Offer[]> {
    return this.offers().filter((o) => o.courseId === courseId).sort((a, b) => a.sortOrder - b.sortOrder)
  }
  async createOffer(input: CreateOfferInput): Promise<Offer> {
    const list = this.offers()
    const offer: Offer = {
      id: uid(),
      courseId: input.courseId,
      name: input.name,
      price: input.price,
      currency: input.currency ?? 'BRL',
      kind: input.kind ?? 'one_time',
      recurringInterval: input.recurringInterval ?? (input.kind === 'subscription' ? 'month' : null),
      isDefault: input.isDefault ?? false,
      isOrderBump: input.isOrderBump ?? false,
      sortOrder: input.sortOrder ?? list.filter((o) => o.courseId === input.courseId).length,
    }
    save(K.offers, [...list, offer])
    return offer
  }
  async updateOffer(id: string, input: UpdateOfferInput): Promise<Offer> {
    const list = this.offers()
    const idx = list.findIndex((o) => o.id === id)
    if (idx < 0) throw new Error('Offer not found')
    list[idx] = { ...list[idx], ...input } as Offer
    save(K.offers, list)
    return list[idx]
  }
  async deleteOffer(id: string): Promise<void> {
    save(K.offers, this.offers().filter((o) => o.id !== id))
  }

  // Sales ledger ------------------------------------------------------------
  async listOrders(opts?: ListOrdersOptions): Promise<Order[]> {
    let list = this.orders()
    if (opts?.courseId) list = list.filter((o) => o.courseId === opts.courseId)
    if (opts?.financialStatus) list = list.filter((o) => o.financialStatus === opts.financialStatus)
    if (opts?.search) {
      const q = opts.search.toLowerCase()
      list = list.filter((o) =>
        (o.customerName ?? '').toLowerCase().includes(q) ||
        (o.customerEmail ?? '').toLowerCase().includes(q),
      )
    }
    return list.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }

  // Subscriptions -----------------------------------------------------------
  async listSubscriptions(opts?: ListSubscriptionsOptions): Promise<Subscription[]> {
    let list = this.subscriptions()
    if (opts?.courseId) list = list.filter((s) => s.courseId === opts.courseId)
    if (opts?.status) list = list.filter((s) => s.status === opts.status)
    return list.slice().sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
  }

  // Financial / payouts / connect -------------------------------------------
  async getFinancialSummary(): Promise<FinancialSummary> {
    const paid = this.orders().filter((o) => o.financialStatus === 'paid')
    const refunded = this.orders().filter((o) => o.financialStatus === 'refunded')
    const activeSubs = this.subscriptions().filter((s) => s.status === 'active')
    const totalRevenue = round2(paid.reduce((s, o) => s + o.total, 0))
    const platformFeeTotal = round2(paid.reduce((s, o) => s + o.platformFee, 0))
    const netTotal = round2(paid.reduce((s, o) => s + o.netValue, 0))
    const paidOut = round2(this.payouts().filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0))
    const mrr = round2(activeSubs.reduce((s, sub) => s + (sub.interval === 'year' ? sub.netValue / 12 : sub.netValue), 0))
    const totalCount = paid.length + refunded.length
    return {
      currency: 'BRL',
      availableBalance: round2(Math.max(netTotal - paidOut, 0)),
      pendingBalance: round2(this.orders().filter((o) => o.financialStatus === 'pending').reduce((s, o) => s + o.netValue, 0)),
      totalRevenue,
      platformFeeTotal,
      salesCount: paid.length,
      activeSubscriptions: activeSubs.length,
      mrr,
      refundRate: totalCount > 0 ? refunded.length / totalCount : 0,
      conversionRate: 0,
    }
  }
  async listPayouts(): Promise<Payout[]> {
    return this.payouts().slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }
  async getCreatorAccount(): Promise<CreatorAccount> {
    // Mock account is not connected — the admin sees the "Connect Stripe" CTA.
    return {
      tenantId: 'mock-tenant',
      stripeAccountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      defaultCurrency: 'BRL',
      platformFeeBps: DEMO_PLATFORM_FEE_BPS,
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function createMockCoursesProvider(seed?: MockCoursesSeed): MockCoursesProvider {
  return new MockCoursesProvider(seed)
}
