import { getSupabaseClientOptional } from '@fayz-ai/core'
import type { CoursesProvider } from './provider'
import { getCoursesTenantId } from './tenant'
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

// Supabase-backed CoursesProvider for the central "fayz-course" DB. Every query
// is tenant-scoped (creator) via getCoursesTenantId(); RLS enforces isolation
// server-side regardless. Mirrors @fayz-ai/shop's supabase-provider.

function getDb(): any {
  const supabase = getSupabaseClientOptional()
  if (!supabase) throw new Error('@fayz-ai/courses: Supabase client not initialized. Call setGlobalSupabaseClient() first.')
  return supabase
}

const getTenantId = getCoursesTenantId

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Row → domain mappers ------------------------------------------------------
function rowToCourse(r: any): Course {
  return {
    id: r.id, slug: r.slug, title: r.title, subtitle: r.subtitle ?? null,
    description: r.description ?? null, thumbnailUrl: r.thumbnail_url ?? null,
    price: r.price ?? 0, currency: r.currency ?? 'BRL', status: r.status ?? 'draft',
    sortOrder: r.sort_order ?? 0, createdAt: r.created_at, updatedAt: r.updated_at,
  }
}
function rowToModule(r: any): Module {
  return { id: r.id, courseId: r.course_id, title: r.title, sortOrder: r.sort_order ?? 0 }
}
function rowToLesson(r: any): Lesson {
  return {
    id: r.id, courseId: r.course_id, moduleId: r.module_id, title: r.title,
    description: r.description ?? null, videoUrl: r.video_url ?? '',
    durationSec: r.duration_sec ?? 600, sortOrder: r.sort_order ?? 0,
  }
}
function rowToOffer(r: any): Offer {
  return {
    id: r.id, courseId: r.course_id, name: r.name, price: r.price ?? 0,
    currency: r.currency ?? 'BRL', kind: r.kind ?? 'one_time',
    recurringInterval: r.recurring_interval ?? null,
    isDefault: r.is_default ?? false, isOrderBump: r.is_order_bump ?? false,
    sortOrder: r.sort_order ?? 0,
  }
}
function rowToEnrollment(r: any): Enrollment {
  return { id: r.id, courseId: r.course_id, customerId: r.customer_id, status: r.status ?? 'active', enrolledAt: r.enrolled_at }
}
function rowToProgress(r: any): Progress {
  return {
    id: r.id, enrollmentId: r.enrollment_id, lessonId: r.lesson_id,
    completed: r.completed ?? false, lastPositionSec: r.last_position_sec ?? 0,
    completedAt: r.completed_at ?? null,
  }
}
function rowToOrder(r: any): Order {
  return {
    id: r.id, courseId: r.course_id, offerId: r.offer_id ?? null,
    customerId: r.customer_id ?? null, customerName: r.customer_name ?? null,
    customerEmail: r.customer_email ?? null, currency: r.currency ?? 'BRL',
    total: r.total ?? 0, platformFee: r.platform_fee ?? 0, netValue: r.net_value ?? 0,
    paymentMethod: r.payment_method ?? null, financialStatus: r.financial_status ?? 'pending',
    stripePaymentIntentId: r.stripe_payment_intent_id ?? null, createdAt: r.created_at,
  }
}
function rowToSubscription(r: any): Subscription {
  return {
    id: r.id, courseId: r.course_id, offerId: r.offer_id ?? null,
    customerId: r.customer_id ?? null, customerName: r.customer_name ?? null,
    customerEmail: r.customer_email ?? null, currency: r.currency ?? 'BRL',
    netValue: r.net_value ?? 0, interval: r.interval ?? 'month',
    status: r.status ?? 'active', stripeSubscriptionId: r.stripe_subscription_id ?? null,
    startedAt: r.started_at, canceledAt: r.canceled_at ?? null,
  }
}
function rowToPayout(r: any): Payout {
  return { id: r.id, amount: r.amount ?? 0, currency: r.currency ?? 'BRL', status: r.status ?? 'pending', createdAt: r.created_at }
}

export function createSupabaseCoursesProvider(): CoursesProvider {
  const scoped = (q: any) => {
    const tenantId = getTenantId()
    return tenantId ? q.eq('tenant_id', tenantId) : q
  }

  return {
    // Courses ---------------------------------------------------------------
    async listCourses(opts?: ListCoursesOptions): Promise<Course[]> {
      let q = scoped(getDb().from('course_courses').select('*'))
      if (opts?.status) q = q.eq('status', opts.status)
      if (opts?.slug) q = q.eq('slug', opts.slug)
      if (opts?.search) q = q.ilike('title', `%${opts.search}%`)
      const { data, error } = await q.order('sort_order', { ascending: true })
      if (error) throw error
      return (data ?? []).map(rowToCourse)
    },
    async getCourse(idOrSlug: string): Promise<Course | null> {
      const col = /^[0-9a-f-]{36}$/i.test(idOrSlug) ? 'id' : 'slug'
      const { data, error } = await scoped(getDb().from('course_courses').select('*').eq(col, idOrSlug)).maybeSingle()
      if (error) throw error
      return data ? rowToCourse(data) : null
    },
    async createCourse(input: CreateCourseInput): Promise<Course> {
      const { data, error } = await getDb().from('course_courses').insert({
        tenant_id: getTenantId(),
        slug: input.slug ?? slugify(input.title),
        title: input.title, subtitle: input.subtitle ?? null, description: input.description ?? null,
        thumbnail_url: input.thumbnailUrl ?? null, price: input.price ?? 0,
        currency: input.currency ?? 'BRL', status: input.status ?? 'draft', sort_order: input.sortOrder ?? 0,
      }).select('*').single()
      if (error) throw error
      return rowToCourse(data)
    },
    async updateCourse(id: string, input: UpdateCourseInput): Promise<Course> {
      const patch: any = {}
      if (input.title !== undefined) patch.title = input.title
      if (input.slug !== undefined) patch.slug = input.slug
      if (input.subtitle !== undefined) patch.subtitle = input.subtitle
      if (input.description !== undefined) patch.description = input.description
      if (input.thumbnailUrl !== undefined) patch.thumbnail_url = input.thumbnailUrl
      if (input.price !== undefined) patch.price = input.price
      if (input.currency !== undefined) patch.currency = input.currency
      if (input.status !== undefined) patch.status = input.status
      if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder
      const { data, error } = await scoped(getDb().from('course_courses').update(patch).eq('id', id)).select('*').single()
      if (error) throw error
      return rowToCourse(data)
    },
    async deleteCourse(id: string): Promise<void> {
      const { error } = await scoped(getDb().from('course_courses').delete().eq('id', id))
      if (error) throw error
    },

    // Modules ---------------------------------------------------------------
    async listModules(courseId: string): Promise<Module[]> {
      const { data, error } = await scoped(getDb().from('course_modules').select('*').eq('course_id', courseId)).order('sort_order', { ascending: true })
      if (error) throw error
      return (data ?? []).map(rowToModule)
    },
    async createModule(input: CreateModuleInput): Promise<Module> {
      const { data, error } = await getDb().from('course_modules').insert({
        tenant_id: getTenantId(), course_id: input.courseId, title: input.title, sort_order: input.sortOrder ?? 0,
      }).select('*').single()
      if (error) throw error
      return rowToModule(data)
    },
    async updateModule(id: string, input: UpdateModuleInput): Promise<Module> {
      const patch: any = {}
      if (input.title !== undefined) patch.title = input.title
      if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder
      const { data, error } = await scoped(getDb().from('course_modules').update(patch).eq('id', id)).select('*').single()
      if (error) throw error
      return rowToModule(data)
    },
    async deleteModule(id: string): Promise<void> {
      const { error } = await scoped(getDb().from('course_modules').delete().eq('id', id))
      if (error) throw error
    },

    // Lessons ---------------------------------------------------------------
    async listLessons(courseId: string): Promise<Lesson[]> {
      const { data, error } = await scoped(getDb().from('course_lessons').select('*').eq('course_id', courseId)).order('sort_order', { ascending: true })
      if (error) throw error
      return (data ?? []).map(rowToLesson)
    },
    async getLesson(id: string): Promise<Lesson | null> {
      const { data, error } = await scoped(getDb().from('course_lessons').select('*').eq('id', id)).maybeSingle()
      if (error) throw error
      return data ? rowToLesson(data) : null
    },
    async createLesson(input: CreateLessonInput): Promise<Lesson> {
      const { data, error } = await getDb().from('course_lessons').insert({
        tenant_id: getTenantId(), course_id: input.courseId, module_id: input.moduleId,
        title: input.title, description: input.description ?? null, video_url: input.videoUrl,
        duration_sec: input.durationSec ?? 600, sort_order: input.sortOrder ?? 0,
      }).select('*').single()
      if (error) throw error
      return rowToLesson(data)
    },
    async updateLesson(id: string, input: UpdateLessonInput): Promise<Lesson> {
      const patch: any = {}
      if (input.title !== undefined) patch.title = input.title
      if (input.description !== undefined) patch.description = input.description
      if (input.videoUrl !== undefined) patch.video_url = input.videoUrl
      if (input.durationSec !== undefined) patch.duration_sec = input.durationSec
      if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder
      const { data, error } = await scoped(getDb().from('course_lessons').update(patch).eq('id', id)).select('*').single()
      if (error) throw error
      return rowToLesson(data)
    },
    async deleteLesson(id: string): Promise<void> {
      const { error } = await scoped(getDb().from('course_lessons').delete().eq('id', id))
      if (error) throw error
    },

    // Enrollments + progress ------------------------------------------------
    async listEnrollments(customerId: string): Promise<Enrollment[]> {
      const { data, error } = await getDb().from('course_enrollments').select('*').eq('customer_id', customerId)
      if (error) throw error
      return (data ?? []).map(rowToEnrollment)
    },
    async enroll(courseId: string, customerId: string): Promise<Enrollment> {
      const { data, error } = await getDb().from('course_enrollments')
        .upsert({ tenant_id: getTenantId(), course_id: courseId, customer_id: customerId, status: 'active' },
          { onConflict: 'course_id,customer_id' })
        .select('*').single()
      if (error) throw error
      return rowToEnrollment(data)
    },
    async listProgress(enrollmentId: string): Promise<Progress[]> {
      const { data, error } = await getDb().from('course_progress').select('*').eq('enrollment_id', enrollmentId)
      if (error) throw error
      return (data ?? []).map(rowToProgress)
    },
    async setLessonProgress(enrollmentId: string, lessonId: string, patch: { completed?: boolean; lastPositionSec?: number }): Promise<Progress> {
      const row: any = { tenant_id: getTenantId(), enrollment_id: enrollmentId, lesson_id: lessonId }
      if (patch.completed !== undefined) { row.completed = patch.completed; row.completed_at = patch.completed ? new Date().toISOString() : null }
      if (patch.lastPositionSec !== undefined) row.last_position_sec = patch.lastPositionSec
      const { data, error } = await getDb().from('course_progress')
        .upsert(row, { onConflict: 'enrollment_id,lesson_id' }).select('*').single()
      if (error) throw error
      return rowToProgress(data)
    },

    // Offers ----------------------------------------------------------------
    async listOffers(courseId: string): Promise<Offer[]> {
      const { data, error } = await scoped(getDb().from('course_offers').select('*').eq('course_id', courseId)).order('sort_order', { ascending: true })
      if (error) throw error
      return (data ?? []).map(rowToOffer)
    },
    async createOffer(input: CreateOfferInput): Promise<Offer> {
      const { data, error } = await getDb().from('course_offers').insert({
        tenant_id: getTenantId(), course_id: input.courseId, name: input.name, price: input.price,
        currency: input.currency ?? 'BRL', kind: input.kind ?? 'one_time',
        recurring_interval: input.recurringInterval ?? (input.kind === 'subscription' ? 'month' : null),
        is_default: input.isDefault ?? false, is_order_bump: input.isOrderBump ?? false, sort_order: input.sortOrder ?? 0,
      }).select('*').single()
      if (error) throw error
      return rowToOffer(data)
    },
    async updateOffer(id: string, input: UpdateOfferInput): Promise<Offer> {
      const patch: any = {}
      if (input.name !== undefined) patch.name = input.name
      if (input.price !== undefined) patch.price = input.price
      if (input.currency !== undefined) patch.currency = input.currency
      if (input.kind !== undefined) patch.kind = input.kind
      if (input.recurringInterval !== undefined) patch.recurring_interval = input.recurringInterval
      if (input.isDefault !== undefined) patch.is_default = input.isDefault
      if (input.isOrderBump !== undefined) patch.is_order_bump = input.isOrderBump
      if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder
      const { data, error } = await scoped(getDb().from('course_offers').update(patch).eq('id', id)).select('*').single()
      if (error) throw error
      return rowToOffer(data)
    },
    async deleteOffer(id: string): Promise<void> {
      const { error } = await scoped(getDb().from('course_offers').delete().eq('id', id))
      if (error) throw error
    },

    // Sales -----------------------------------------------------------------
    async listOrders(opts?: ListOrdersOptions): Promise<Order[]> {
      let q = scoped(getDb().from('course_orders').select('*'))
      if (opts?.courseId) q = q.eq('course_id', opts.courseId)
      if (opts?.financialStatus) q = q.eq('financial_status', opts.financialStatus)
      if (opts?.search) q = q.or(`customer_name.ilike.%${opts.search}%,customer_email.ilike.%${opts.search}%`)
      const { data, error } = await q.order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map(rowToOrder)
    },

    // Subscriptions ---------------------------------------------------------
    async listSubscriptions(opts?: ListSubscriptionsOptions): Promise<Subscription[]> {
      let q = scoped(getDb().from('course_subscriptions').select('*'))
      if (opts?.courseId) q = q.eq('course_id', opts.courseId)
      if (opts?.status) q = q.eq('status', opts.status)
      const { data, error } = await q.order('started_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map(rowToSubscription)
    },

    // Financial -------------------------------------------------------------
    async getFinancialSummary(): Promise<FinancialSummary> {
      const [orders, subs, payouts] = await Promise.all([
        scoped(getDb().from('course_orders').select('total,platform_fee,net_value,financial_status')),
        scoped(getDb().from('course_subscriptions').select('net_value,interval,status')),
        scoped(getDb().from('course_payouts').select('amount,status')),
      ])
      const orderRows: any[] = orders.data ?? []
      const paid = orderRows.filter((o) => o.financial_status === 'paid')
      const refunded = orderRows.filter((o) => o.financial_status === 'refunded')
      const activeSubs = (subs.data ?? []).filter((s: any) => s.status === 'active')
      const netTotal = round2(paid.reduce((s, o) => s + Number(o.net_value ?? 0), 0))
      const paidOut = round2((payouts.data ?? []).filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0))
      const mrr = round2(activeSubs.reduce((s: number, sub: any) => s + (sub.interval === 'year' ? Number(sub.net_value) / 12 : Number(sub.net_value)), 0))
      const totalCount = paid.length + refunded.length
      return {
        currency: 'BRL',
        availableBalance: round2(Math.max(netTotal - paidOut, 0)),
        pendingBalance: round2(orderRows.filter((o) => o.financial_status === 'pending').reduce((s, o) => s + Number(o.net_value ?? 0), 0)),
        totalRevenue: round2(paid.reduce((s, o) => s + Number(o.total ?? 0), 0)),
        platformFeeTotal: round2(paid.reduce((s, o) => s + Number(o.platform_fee ?? 0), 0)),
        salesCount: paid.length,
        activeSubscriptions: activeSubs.length,
        mrr,
        refundRate: totalCount > 0 ? refunded.length / totalCount : 0,
        conversionRate: 0,
      }
    },
    async listPayouts(): Promise<Payout[]> {
      const { data, error } = await scoped(getDb().from('course_payouts').select('*')).order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map(rowToPayout)
    },
    async getCreatorAccount(): Promise<CreatorAccount> {
      const tenantId = getTenantId()
      const { data } = await scoped(getDb().from('course_creator_accounts').select('*')).maybeSingle()
      return {
        tenantId: tenantId ?? '',
        stripeAccountId: data?.stripe_account_id ?? null,
        chargesEnabled: data?.charges_enabled ?? false,
        payoutsEnabled: data?.payouts_enabled ?? false,
        defaultCurrency: data?.default_currency ?? 'BRL',
        platformFeeBps: data?.platform_fee_bps ?? 500,
      }
    },
  }
}
