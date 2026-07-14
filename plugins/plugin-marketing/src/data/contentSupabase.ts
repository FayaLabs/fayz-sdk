import { getSupabaseClientOptional, getActiveTenantId } from '@fayz-ai/core'
import type {
  ContentPlan,
  ContentPlannerProvider,
  ContentPost,
  SocialAccount,
} from './contentTypes'

// ---------------------------------------------------------------------------
// Supabase content-planner provider. Tables: mkt_social_accounts,
// mkt_content_plans, mkt_content_posts (see src/migrations/001_content_planner.sql).
// RLS scopes rows to the user's tenants; we still filter tenant_id explicitly
// on reads so multi-tenant sessions see only the active tenant.
// ---------------------------------------------------------------------------

function getClient() {
  const supabase = getSupabaseClientOptional() as any
  if (!supabase) throw new Error('Supabase not initialized')
  return supabase
}

function requireTenantId(): string {
  const tenantId = getActiveTenantId()
  if (!tenantId) throw new Error('No active tenant')
  return tenantId
}

function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value ?? undefined
  }
  return result
}

function toAccount(row: Record<string, unknown>): SocialAccount {
  const account = snakeToCamel(row) as unknown as SocialAccount
  if (!Array.isArray(account.platforms)) account.platforms = []
  return account
}

function toPlan(row: Record<string, unknown>): ContentPlan {
  const plan = snakeToCamel(row) as unknown as ContentPlan
  if (!Array.isArray(plan.pillars)) plan.pillars = []
  if (!Array.isArray(plan.formats)) plan.formats = []
  plan.briefMd = plan.briefMd ?? ''
  return plan
}

function toPost(row: Record<string, unknown>): ContentPost {
  const post = snakeToCamel(row) as unknown as ContentPost
  post.contentMd = post.contentMd ?? ''
  if (!Array.isArray(post.platforms)) post.platforms = []
  if (!Array.isArray(post.checklist)) post.checklist = []
  return post
}

export function createSupabaseContentPlannerProvider(): ContentPlannerProvider {
  return {
    async listAccounts() {
      const tenantId = getActiveTenantId()
      if (!tenantId) return []
      const { data } = await getClient()
        .from('mkt_social_accounts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      return (data ?? []).map(toAccount)
    },

    async saveAccount(input) {
      if (input.id) {
        const payload: Record<string, unknown> = {}
        if (input.name !== undefined) payload.name = input.name
        if (input.handle !== undefined) payload.handle = input.handle
        if (input.platforms !== undefined) payload.platforms = input.platforms
        if (input.isActive !== undefined) payload.is_active = input.isActive
        const { data, error } = await getClient()
          .from('mkt_social_accounts')
          .update(payload)
          .eq('id', input.id)
          .select('*')
          .single()
        if (error) throw error
        return toAccount(data)
      }
      const { data, error } = await getClient()
        .from('mkt_social_accounts')
        .insert({
          tenant_id: requireTenantId(),
          name: input.name,
          handle: input.handle ?? null,
          platforms: input.platforms ?? ['instagram'],
          is_active: input.isActive ?? true,
        })
        .select('*')
        .single()
      if (error) throw error
      return toAccount(data)
    },

    async deleteAccount(id) {
      const { error } = await getClient().from('mkt_social_accounts').delete().eq('id', id)
      if (error) throw error
    },

    async listPlans(accountId) {
      const tenantId = getActiveTenantId()
      if (!tenantId) return []
      const { data } = await getClient()
        .from('mkt_content_plans')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
      return (data ?? []).map(toPlan)
    },

    async getPlan(id) {
      const { data } = await getClient()
        .from('mkt_content_plans')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      return data ? toPlan(data) : null
    },

    async savePlan(input) {
      if (input.id) {
        const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (input.name !== undefined) payload.name = input.name
        if (input.status !== undefined) payload.status = input.status
        if (input.weeksCount !== undefined) payload.weeks_count = input.weeksCount
        if (input.startDate !== undefined) payload.start_date = input.startDate
        if (input.objective !== undefined) payload.objective = input.objective
        if (input.tone !== undefined) payload.tone = input.tone
        if (input.pillars !== undefined) payload.pillars = input.pillars
        if (input.formats !== undefined) payload.formats = input.formats
        if (input.weeklyFrequency !== undefined) payload.weekly_frequency = input.weeklyFrequency
        if (input.briefMd !== undefined) payload.brief_md = input.briefMd
        const { data, error } = await getClient()
          .from('mkt_content_plans')
          .update(payload)
          .eq('id', input.id)
          .select('*')
          .single()
        if (error) throw error
        return toPlan(data)
      }
      if (!input.accountId) throw new Error('accountId is required')
      const { data, error } = await getClient()
        .from('mkt_content_plans')
        .insert({
          tenant_id: requireTenantId(),
          account_id: input.accountId,
          name: input.name ?? 'Novo plano',
          status: input.status ?? 'draft',
          weeks_count: input.weeksCount ?? 4,
          start_date: input.startDate ?? null,
          objective: input.objective ?? null,
          tone: input.tone ?? null,
          pillars: input.pillars ?? [],
          formats: input.formats ?? ['reel', 'static'],
          weekly_frequency: input.weeklyFrequency ?? 3,
          brief_md: input.briefMd ?? '',
        })
        .select('*')
        .single()
      if (error) throw error
      return toPlan(data)
    },

    async deletePlan(id) {
      await getClient().from('mkt_content_plans').delete().eq('id', id)
    },

    async listPosts(planId) {
      const { data } = await getClient()
        .from('mkt_content_posts')
        .select('*')
        .eq('plan_id', planId)
        .order('week_number', { ascending: true })
        .order('position', { ascending: true })
      return (data ?? []).map(toPost)
    },

    async getPost(id) {
      const { data } = await getClient()
        .from('mkt_content_posts')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      return data ? toPost(data) : null
    },

    async savePost(input) {
      if (input.id) {
        const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (input.weekNumber !== undefined) payload.week_number = input.weekNumber
        if (input.position !== undefined) payload.position = input.position
        if (input.title !== undefined) payload.title = input.title
        if (input.format !== undefined) payload.format = input.format
        if (input.status !== undefined) payload.status = input.status
        if (input.scheduledDate !== undefined) payload.scheduled_date = input.scheduledDate
        if (input.platforms !== undefined) payload.platforms = input.platforms
        if (input.checklist !== undefined) payload.checklist = input.checklist
        if (input.mediaUrl !== undefined) payload.media_url = input.mediaUrl
        if (input.hook !== undefined) payload.hook = input.hook
        if (input.cta !== undefined) payload.cta = input.cta
        if (input.contentMd !== undefined) payload.content_md = input.contentMd
        const { data, error } = await getClient()
          .from('mkt_content_posts')
          .update(payload)
          .eq('id', input.id)
          .select('*')
          .single()
        if (error) throw error
        return toPost(data)
      }
      if (!input.planId) throw new Error('planId is required')
      const week = input.weekNumber ?? 1

      // Next position within the (plan, week) group.
      const { data: maxData } = await getClient()
        .from('mkt_content_posts')
        .select('position')
        .eq('plan_id', input.planId)
        .eq('week_number', week)
        .order('position', { ascending: false })
        .limit(1)
      const maxPos = maxData?.[0]?.position ?? -1

      const { data, error } = await getClient()
        .from('mkt_content_posts')
        .insert({
          tenant_id: requireTenantId(),
          plan_id: input.planId,
          week_number: week,
          position: input.position ?? maxPos + 1,
          title: input.title ?? '',
          format: input.format ?? 'reel',
          status: input.status ?? 'idea',
          scheduled_date: input.scheduledDate ?? null,
          platforms: input.platforms ?? [],
          checklist: input.checklist ?? [],
          media_url: input.mediaUrl ?? null,
          hook: input.hook ?? null,
          cta: input.cta ?? null,
          content_md: input.contentMd ?? '',
        })
        .select('*')
        .single()
      if (error) throw error
      return toPost(data)
    },

    async deletePost(id) {
      await getClient().from('mkt_content_posts').delete().eq('id', id)
    },
  }
}
