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

// ---------------------------------------------------------------------------
// Commerce layer — the "mini-Kiwify" money model. A Course is the product; an
// Offer is a sellable price point (one-time or recurring). An Order is a
// concluded sale; a Subscription is a recurring plan. CreatorAccount holds the
// Stripe Connect link + the platform markup. All of these are tenant-scoped in
// the real backend (the creator that owns the course).
// ---------------------------------------------------------------------------

export type OfferKind = 'one_time' | 'subscription'
export type RecurringInterval = 'month' | 'year'

export interface Offer {
  id: string
  courseId: string
  name: string
  price: number
  currency: string
  kind: OfferKind
  /** Set when kind === 'subscription'; null for one-time offers. */
  recurringInterval: RecurringInterval | null
  /** The offer pre-selected on the checkout (Kiwify's "default offer"). */
  isDefault: boolean
  /** Shown as an order-bump on another offer's checkout. */
  isOrderBump: boolean
  sortOrder: number
}
export interface CreateOfferInput {
  courseId: string
  name: string
  price: number
  currency?: string
  kind?: OfferKind
  recurringInterval?: RecurringInterval | null
  isDefault?: boolean
  isOrderBump?: boolean
  sortOrder?: number
}
export type UpdateOfferInput = Partial<Omit<CreateOfferInput, 'courseId'>>

export type PaymentMethod = 'card' | 'pix' | 'boleto'
export type FinancialStatus = 'pending' | 'paid' | 'refunded' | 'chargeback'

/** A concluded (or pending) sale — the Sales ledger row. */
export interface Order {
  id: string
  courseId: string
  offerId: string | null
  customerId: string | null
  customerName: string | null
  customerEmail: string | null
  currency: string
  /** Gross amount charged to the student. */
  total: number
  /** The platform's markup on this sale (Stripe application_fee). */
  platformFee: number
  /** total - platformFee — what the creator receives. */
  netValue: number
  paymentMethod: PaymentMethod | null
  financialStatus: FinancialStatus
  stripePaymentIntentId: string | null
  createdAt: string
}

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due'

export interface Subscription {
  id: string
  courseId: string
  offerId: string | null
  customerId: string | null
  customerName: string | null
  customerEmail: string | null
  currency: string
  /** Per-period net value to the creator. */
  netValue: number
  interval: RecurringInterval
  status: SubscriptionStatus
  stripeSubscriptionId: string | null
  startedAt: string
  canceledAt: string | null
}

export type PayoutStatus = 'pending' | 'paid' | 'failed'

export interface Payout {
  id: string
  amount: number
  currency: string
  status: PayoutStatus
  createdAt: string
}

/** The creator's Stripe Connect account + platform markup config (1:1 tenant). */
export interface CreatorAccount {
  tenantId: string
  stripeAccountId: string | null
  chargesEnabled: boolean
  payoutsEnabled: boolean
  defaultCurrency: string
  /** Platform markup in basis points (e.g. 500 = 5%). Drives Order.platformFee. */
  platformFeeBps: number
}

/** Aggregates for the Financial page + dashboard KPIs. */
export interface FinancialSummary {
  currency: string
  availableBalance: number
  pendingBalance: number
  /** Sum of paid orders' total. */
  totalRevenue: number
  platformFeeTotal: number
  salesCount: number
  activeSubscriptions: number
  /** Monthly recurring revenue (net). */
  mrr: number
  /** 0..1 */
  refundRate: number
  /** 0..1 (placeholder in the mock layer). */
  conversionRate: number
}

export interface ListOrdersOptions {
  courseId?: string
  financialStatus?: FinancialStatus
  search?: string
}
export interface ListSubscriptionsOptions {
  courseId?: string
  status?: SubscriptionStatus
}
