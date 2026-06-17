import type { CrmDataProvider } from './types'
import type {
  Pipeline, PipelineStage, Lead, Deal, Activity, Quote, QuoteItem,
  CreateLeadInput, CreateDealInput, CreateActivityInput, CreateQuoteInput,
  LeadQuery, DealQuery, ActivityQuery, QuoteQuery,
  PaginatedResult, CrmSummary, FunnelStage,
} from '../types'
import { getSupabaseClientOptional, getActiveTenantId } from '@fayz-ai/core'
import { getCrmTenantId } from '../lib/tenant'
import { deriveLeadStatus, deriveQuoteStatus } from '../cascade'

function getTenantId(): string | undefined {
  // Plugin-local override wins; otherwise use the app's active tenant (set on
  // org switch). Without this fallback, writes stamp tenant_id=undefined and
  // fail the persons/orders RLS WITH CHECK (tenant_id IN user_tenant_ids()).
  return getCrmTenantId() ?? getActiveTenantId()
}

function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value
  }
  return result
}

function getClients() {
  const supabase = getSupabaseClientOptional() as any
  if (!supabase) throw new Error('Supabase not initialized')
  return { core: supabase.schema('saas_core'), pub: supabase }
}

export function createSupabaseCrmProvider(options?: {
  clientConversion?: { archetypeKind: string; extensionTable: string; fkColumn: string }
}): CrmDataProvider {
  const provider: CrmDataProvider = {
    // --- Pipelines (public.pipelines + pipeline_stages) ---
    async getPipelines(): Promise<Pipeline[]> {
      const { pub } = getClients()
      const { data } = await pub.from('pipelines').select('*').eq('is_active', true).order('name')
      return (data ?? []).map((r: any) => snakeToCamel(r) as unknown as Pipeline)
    },

    async getPipelineStages(pipelineId: string): Promise<PipelineStage[]> {
      const { pub } = getClients()
      const { data } = await pub.from('pipeline_stages').select('*').eq('pipeline_id', pipelineId).order('order')
      return (data ?? []).map((r: any) => snakeToCamel(r) as unknown as PipelineStage)
    },

    // --- Leads (via view — single query) ---
    async getLeads(query: LeadQuery): Promise<PaginatedResult<Lead>> {
      const { pub } = getClients()
      let qb = pub.from('v_leads').select('*', { count: 'exact' })
      if (query.search) qb = qb.ilike('name', `%${query.search}%`)
      if (query.status) {
        const statuses = Array.isArray(query.status) ? query.status : [query.status]
        qb = qb.in('lead_status', statuses)
      }
      const page = query.page ?? 1
      const pageSize = query.pageSize ?? 50
      qb = qb.range((page - 1) * pageSize, page * pageSize - 1).order('created_at', { ascending: false })
      const { data, count } = await qb
      return {
        data: (data ?? []).map((r: any) => ({
          id: r.id, name: r.name, email: r.email, phone: r.phone,
          company: r.company, sourceId: r.source_id, sourceName: r.source_name,
          status: r.lead_status ?? 'new',
          assignedToId: r.assigned_to_id, value: r.lead_value ? Number(r.lead_value) : undefined,
          tags: r.tags ?? [], notes: r.notes,
          tenantId: r.tenant_id, createdAt: r.created_at, updatedAt: r.updated_at,
        } as Lead)),
        total: count ?? 0,
      }
    },

    async getLeadById(id: string): Promise<Lead | null> {
      const { pub } = getClients()
      const { data: r } = await pub.from('v_leads').select('*').eq('id', id).single()
      if (!r) return null
      return {
        id: r.id, name: r.name, email: r.email, phone: r.phone,
        company: r.company, status: r.lead_status ?? 'new',
        tags: r.tags ?? [], notes: r.notes,
        tenantId: r.tenant_id, createdAt: r.created_at, updatedAt: r.updated_at,
      } as Lead
    },

    async createLead(input: CreateLeadInput): Promise<Lead> {
      const { core } = getClients()
      const tenantId = getTenantId()
      const { data, error } = await core.from('persons').insert({
        tenant_id: tenantId, kind: 'lead', name: input.name,
        email: input.email, phone: input.phone,
        notes: input.notes, tags: input.tags ?? [], is_active: true,
        metadata: { company: input.company, sourceId: input.sourceId, status: 'new', value: input.value },
      }).select().single()
      if (error) throw new Error(error.message)
      const p = snakeToCamel(data) as any
      return { id: p.id, name: p.name, email: p.email, phone: p.phone, status: 'new', tags: [], tenantId: tenantId!, createdAt: p.createdAt, updatedAt: p.updatedAt } as Lead
    },

    async updateLead(id: string, partial: Partial<Lead>): Promise<Lead> {
      const { core } = getClients()
      const row: any = {}
      if (partial.name) row.name = partial.name
      if (partial.email !== undefined) row.email = partial.email
      if (partial.phone !== undefined) row.phone = partial.phone
      if (partial.notes !== undefined) row.notes = partial.notes
      if (partial.status) row.metadata = { status: partial.status }
      const { data, error } = await core.from('persons').update(row).eq('id', id).select().single()
      if (error) throw new Error(error.message)
      return (await provider.getLeadById(id))!
    },

    async convertLeadToDeal(leadId: string, dealInput: CreateDealInput): Promise<Deal> {
      const { core } = getClients()
      // Update lead status to converted
      await core.from('persons').update({ metadata: { status: 'converted' } }).eq('id', leadId)
      return provider.createDeal({ ...dealInput, leadId } as any)
    },

    // --- Deals (via view — single query with all joins) ---
    async getDeals(query: DealQuery): Promise<PaginatedResult<Deal>> {
      const { pub } = getClients()
      let qb = pub.from('v_deals').select('*', { count: 'exact' })
      if (query.status) {
        const statuses = Array.isArray(query.status) ? query.status : [query.status]
        qb = qb.in('status', statuses)
      }
      if (query.search) qb = qb.ilike('title', `%${query.search}%`)
      if (query.pipelineId) qb = qb.eq('pipeline_id', query.pipelineId)
      if (query.stageId) qb = qb.eq('stage_id', query.stageId)
      const page = query.page ?? 1
      const pageSize = query.pageSize ?? 50
      qb = qb.range((page - 1) * pageSize, page * pageSize - 1).order('created_at', { ascending: false })
      const { data, count } = await qb

      const deals: Deal[] = (data ?? []).map((r: any) => ({
        id: r.id,
        leadId: r.lead_id,
        title: r.title ?? 'Untitled Deal',
        value: r.value ?? 0,
        pipelineId: r.pipeline_id ?? '',
        stageId: r.stage_id ?? '',
        stageName: r.stage_name,
        stageColor: r.stage_color,
        probability: r.probability ?? 0,
        expectedCloseDate: r.expected_close_date,
        assignedToId: r.assigned_to_id,
        contactId: r.contact_id,
        contactName: r.contact_name,
        status: r.status ?? 'open',
        lostReason: r.lost_reason,
        tags: r.tags ?? [],
        notes: r.title,
        tenantId: r.tenant_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      } as Deal))
      return { data: deals, total: count ?? 0 }
    },

    async getDealById(id: string): Promise<Deal | null> {
      const { pub } = getClients()
      const { data: r } = await pub.from('v_deals').select('*').eq('id', id).single()
      if (!r) return null
      return {
        id: r.id, title: r.title ?? '', value: r.value ?? 0,
        pipelineId: r.pipeline_id ?? '', stageId: r.stage_id ?? '',
        stageName: r.stage_name, stageColor: r.stage_color,
        probability: r.probability ?? 0, status: r.status ?? 'open',
        contactName: r.contact_name, tags: r.tags ?? [],
        tenantId: r.tenant_id, createdAt: r.created_at, updatedAt: r.updated_at,
      } as Deal
    },

    async getDealsByStage(pipelineId: string): Promise<Map<string, Deal[]>> {
      const { pub } = getClients()
      const stages = await provider.getPipelineStages(pipelineId)
      // Single query via view — already has stage info joined
      const { data } = await pub.from('v_deals').select('*').eq('pipeline_id', pipelineId).neq('status', 'lost')
      const deals = (data ?? []).map((r: any) => ({
        id: r.id, title: r.title ?? '', value: r.value ?? 0,
        pipelineId: r.pipeline_id, stageId: r.stage_id,
        stageName: r.stage_name, stageColor: r.stage_color,
        probability: r.probability ?? 0, status: r.status ?? 'open',
        contactName: r.contact_name, tags: r.tags ?? [],
        tenantId: r.tenant_id, createdAt: r.created_at, updatedAt: r.updated_at,
      } as Deal))

      const map = new Map<string, Deal[]>()
      for (const stage of stages) map.set(stage.id, [])
      for (const deal of deals) {
        const arr = map.get(deal.stageId)
        if (arr) arr.push(deal)
      }
      return map
    },

    async createDeal(input: CreateDealInput): Promise<Deal> {
      const { core, pub } = getClients()
      const tenantId = getTenantId()

      // Create order in saas_core
      const { data: order, error } = await core.from('orders').insert({
        tenant_id: tenantId, kind: 'deal', status: 'open',
        total: input.value, party_id: input.contactId,
        assignee_id: input.assignedToId, notes: input.title,
        tags: input.tags ?? [], currency: 'BRL',
        metadata: { contactName: input.contactName },
      }).select().single()
      if (error) throw new Error(error.message)

      // Create deal extension with pipeline/stage info
      await pub.from('deal_extensions').insert({
        order_id: order.id, tenant_id: tenantId,
        pipeline_id: input.pipelineId, stage_id: input.stageId,
        probability: 0, expected_close_date: input.expectedCloseDate,
        lead_id: (input as any).leadId,
      })

      return {
        id: order.id, title: input.title, value: input.value,
        pipelineId: input.pipelineId, stageId: input.stageId,
        status: 'open', probability: 0, tags: input.tags ?? [],
        contactName: input.contactName,
        tenantId: tenantId!, createdAt: order.created_at, updatedAt: order.updated_at,
      } as Deal
    },

    async updateDeal(id: string, partial: Partial<Deal>): Promise<Deal> {
      const { core, pub } = getClients()
      if (partial.title || partial.value || partial.status) {
        const row: any = {}
        if (partial.title) row.notes = partial.title
        if (partial.value) row.total = partial.value
        if (partial.status) row.status = partial.status
        await core.from('orders').update(row).eq('id', id)
      }
      if (partial.stageId || partial.probability != null || partial.expectedCloseDate) {
        const row: any = {}
        if (partial.stageId) row.stage_id = partial.stageId
        if (partial.probability != null) row.probability = partial.probability
        if (partial.expectedCloseDate) row.expected_close_date = partial.expectedCloseDate
        await pub.from('deal_extensions').update(row).eq('order_id', id)
      }
      return (await provider.getDealById(id))!
    },

    async moveDealToStage(dealId: string, stageId: string): Promise<Deal> {
      const { core, pub } = getClients()
      const { data: stageRow } = await pub.from('pipeline_stages').select('*').eq('id', stageId).single()
      await pub.from('deal_extensions').update({
        stage_id: stageId, probability: stageRow?.probability ?? 0,
      }).eq('order_id', dealId)
      if (stageRow?.is_won) await core.from('orders').update({ status: 'won' }).eq('id', dealId)
      if (stageRow?.is_lost) await core.from('orders').update({ status: 'lost' }).eq('id', dealId)

      // Cascade to lead + quotes
      if (stageRow) {
        const typedStage: import('../types').PipelineStage = {
          id: stageRow.id, pipelineId: stageRow.pipeline_id, name: stageRow.name,
          order: stageRow.order, color: stageRow.color, probability: stageRow.probability,
          isWon: stageRow.is_won, isLost: stageRow.is_lost,
          tenantId: stageRow.tenant_id, createdAt: stageRow.created_at,
        }
        // Update lead status
        const { data: ext } = await pub.from('deal_extensions').select('lead_id').eq('order_id', dealId).single()
        if (ext?.lead_id) {
          const newLeadStatus = deriveLeadStatus(typedStage)
          await core.from('persons').update({ metadata: { status: newLeadStatus } }).eq('id', ext.lead_id)
        }
        // Update quote statuses
        const { data: quotes } = await core.from('orders').select('id, status').eq('kind', 'quote')
        for (const q of quotes ?? []) {
          const meta = (q as any).metadata
          if (meta?.dealId === dealId) {
            const newStatus = deriveQuoteStatus(typedStage, q.status)
            if (newStatus !== q.status) {
              await core.from('orders').update({ status: newStatus }).eq('id', q.id)
            }
          }
        }
      }

      return (await provider.getDealById(dealId))!
    },

    // --- Activities (public.crm_activities) ---
    async getActivities(query: ActivityQuery): Promise<PaginatedResult<Activity>> {
      const { pub } = getClients()
      let qb = pub.from('crm_activities').select('*', { count: 'exact' })
      if (query.dealId) qb = qb.eq('deal_id', query.dealId)
      if (query.leadId) qb = qb.eq('lead_id', query.leadId)
      if (query.activityType) qb = qb.eq('activity_type', query.activityType)
      if (query.completed === true) qb = qb.not('completed_at', 'is', null)
      if (query.completed === false) qb = qb.is('completed_at', null)
      const page = query.page ?? 1
      const pageSize = query.pageSize ?? 50
      qb = qb.range((page - 1) * pageSize, page * pageSize - 1).order('created_at', { ascending: false })
      const { data, count } = await qb
      return { data: (data ?? []).map((r: any) => snakeToCamel(r) as unknown as Activity), total: count ?? 0 }
    },

    async createActivity(input: CreateActivityInput): Promise<Activity> {
      const { pub } = getClients()
      const tenantId = getTenantId()
      const { data, error } = await pub.from('crm_activities').insert({
        tenant_id: tenantId, deal_id: input.dealId, lead_id: input.leadId,
        contact_id: input.contactId, activity_type: input.activityType,
        title: input.title, description: input.description,
        due_date: input.dueDate, assigned_to_id: input.assignedToId,
      }).select().single()
      if (error) throw new Error(error.message)
      return snakeToCamel(data) as unknown as Activity
    },

    async completeActivity(id: string): Promise<Activity> {
      const { pub } = getClients()
      const { data, error } = await pub.from('crm_activities').update({ completed_at: new Date().toISOString() }).eq('id', id).select().single()
      if (error) throw new Error(error.message)
      return snakeToCamel(data) as unknown as Activity
    },

    // --- Quotes (saas_core.orders kind='quote' + order_items) ---
    async getQuotes(query: QuoteQuery): Promise<PaginatedResult<Quote>> {
      const { core } = getClients()
      let qb = core.from('orders').select('*', { count: 'exact' }).eq('kind', 'quote')
      if (query.status) {
        const statuses = Array.isArray(query.status) ? query.status : [query.status]
        qb = qb.in('status', statuses)
      }
      if (query.search) qb = qb.or(`reference_number.ilike.%${query.search}%,notes.ilike.%${query.search}%`)
      const page = query.page ?? 1
      const pageSize = query.pageSize ?? 50
      qb = qb.range((page - 1) * pageSize, page * pageSize - 1).order('created_at', { ascending: false })
      const { data, count } = await qb
      const quotes: Quote[] = (data ?? []).map((r: any) => {
        // Show financial stage as status when quote has been promoted
        const stage = r.stage as string | undefined
        const financialStages = ['invoiced', 'paid', 'partial', 'overdue']
        const displayStatus = stage && financialStages.includes(stage) ? stage : (r.status ?? 'draft')
        return {
          id: r.id, quoteNumber: r.metadata?.quoteNumber ?? r.reference_number ?? '', quoteDate: r.created_at?.slice(0, 10) ?? '',
          validUntil: r.due_at?.slice(0, 10) ?? '', status: displayStatus,
          totalAmount: r.total ?? 0, contactId: r.party_id,
          contactName: r.metadata?.contactName, observations: r.notes,
          dealId: r.metadata?.dealId, leadId: r.metadata?.leadId, convertedInvoiceId: r.metadata?.convertedInvoiceId,
          items: [], tenantId: r.tenant_id, createdAt: r.created_at, updatedAt: r.updated_at,
        } as Quote
      })
      return { data: quotes, total: count ?? 0 }
    },

    async getQuoteById(id: string): Promise<Quote | null> {
      const { core } = getClients()
      const { data: order } = await core.from('orders').select('*').eq('id', id).eq('kind', 'quote').single()
      if (!order) return null
      const { data: items } = await core.from('order_items').select('*').eq('order_id', id).order('sort_order')
      const stage = order.stage as string | undefined
      const financialStages = ['invoiced', 'paid', 'partial', 'overdue']
      const displayStatus = stage && financialStages.includes(stage) ? stage : (order.status ?? 'draft')
      return {
        id: order.id, quoteNumber: order.metadata?.quoteNumber ?? order.reference_number ?? '', quoteDate: order.created_at?.slice(0, 10) ?? '',
        validUntil: order.due_at?.slice(0, 10) ?? '', status: displayStatus,
        totalAmount: order.total ?? 0, contactId: order.party_id,
        contactName: order.metadata?.contactName, observations: order.notes,
        dealId: order.metadata?.dealId, leadId: order.metadata?.leadId, convertedInvoiceId: order.metadata?.convertedInvoiceId,
        items: (items ?? []).map((i: any) => ({
          id: i.id, quoteId: id, itemKind: i.metadata?.itemKind ?? 'other',
          description: i.name ?? '', quantity: i.quantity ?? 1,
          unitPrice: i.unit_price ?? 0, discount: i.discount ?? 0,
          totalAmount: i.total ?? 0, createdAt: i.created_at,
        } as QuoteItem)),
        tenantId: order.tenant_id, createdAt: order.created_at, updatedAt: order.updated_at,
      } as Quote
    },

    async createQuote(input: CreateQuoteInput): Promise<Quote> {
      const { core } = getClients()
      const tenantId = getTenantId()
      const totalAmount = input.items.reduce((sum, i) => sum + i.totalAmount, 0)

      // Derive next quote number from existing quotes
      const { count } = await core.from('orders').select('*', { count: 'exact', head: true }).eq('kind', 'quote')
      const nextNum = (count ?? 0) + 1

      const { data: order, error } = await core.from('orders').insert({
        tenant_id: tenantId, kind: 'quote', status: 'draft',
        reference_number: `Q-${String(nextNum).padStart(4, '0')}`,
        total: totalAmount, party_id: input.contactId,
        due_at: input.validUntil ? new Date(input.validUntil).toISOString() : null,
        notes: input.observations, currency: 'BRL',
        metadata: { contactName: input.contactName, paymentConditions: input.paymentConditions, dealId: input.dealId, leadId: input.leadId },
      }).select().single()
      if (error) throw new Error(error.message)

      if (input.items.length > 0) {
        const { error: itemsError } = await core.from('order_items').insert(
          input.items.map((item, i) => ({
            order_id: order.id, name: item.description,
            quantity: item.quantity, unit_price: item.unitPrice,
            discount: item.discount, total: item.totalAmount,
            sort_order: i, metadata: { itemKind: item.itemKind },
          }))
        )
        if (itemsError) throw new Error(itemsError.message)
      }

      return {
        id: order.id, quoteNumber: order.reference_number,
        quoteDate: order.created_at?.slice(0, 10), validUntil: input.validUntil,
        status: 'draft', totalAmount, contactName: input.contactName,
        dealId: input.dealId, leadId: input.leadId,
        items: [], tenantId: tenantId!,
        createdAt: order.created_at, updatedAt: order.updated_at,
      } as unknown as Quote
    },

    async updateQuote(id: string, input: CreateQuoteInput): Promise<Quote> {
      const { core } = getClients()
      const totalAmount = input.items.reduce((sum, i) => sum + i.totalAmount, 0)

      const { error } = await core.from('orders').update({
        total: totalAmount, party_id: input.contactId,
        due_at: input.validUntil ? new Date(input.validUntil).toISOString() : null,
        notes: input.observations, metadata: { contactName: input.contactName, paymentConditions: input.paymentConditions, dealId: input.dealId, leadId: input.leadId },
      }).eq('id', id)
      if (error) throw new Error(error.message)

      // Replace items: delete existing, insert new
      await core.from('order_items').delete().eq('order_id', id)
      if (input.items.length > 0) {
        const { error: itemsError } = await core.from('order_items').insert(
          input.items.map((item, i) => ({
            order_id: id, name: item.description,
            quantity: item.quantity, unit_price: item.unitPrice,
            discount: item.discount, total: item.totalAmount,
            sort_order: i, metadata: { itemKind: item.itemKind },
          }))
        )
        if (itemsError) throw new Error(itemsError.message)
      }

      return (await provider.getQuoteById(id))!
    },

    async sendQuote(id: string): Promise<Quote> {
      const { core } = getClients()
      await core.from('orders').update({ status: 'sent' }).eq('id', id)

      // Move deal to Negotiation stage (only forward, never backward)
      try {
        const quote = await provider.getQuoteById(id)
        if (quote?.dealId) {
          const deal = await provider.getDealById(quote.dealId)
          if (deal) {
            const stages = await provider.getPipelineStages(deal.pipelineId)
            const negotiationStage = stages.find((s) => s.name === 'Negotiation')
              ?? stages.filter((s: any) => !s.isWon && !s.isLost).sort((a, b) => b.order - a.order)[0]
            const currentStage = stages.find((s) => s.id === deal.stageId)
            if (negotiationStage && currentStage && negotiationStage.order > currentStage.order) {
              await provider.moveDealToStage(deal.id, negotiationStage.id)
            }
          }
        }
      } catch { /* non-blocking */ }

      return (await provider.getQuoteById(id))!
    },

    async approveQuote(id: string): Promise<Quote> {
      const { core, pub } = getClients()
      const tenantId = getTenantId()

      const quote = await provider.getQuoteById(id)
      if (!quote) throw new Error('Quote not found')

      // 2-4. Atomic promotion (ref number + stage/direction + financial movement)
      //      in one transaction via the shared DB function. Replaces the
      //      multi-step write each plugin used to re-implement. Idempotent.
      const { error: promoteErr } = await pub.rpc('fn_invoice_from_order', {
        p_order_id: id,
        p_due_date: quote.validUntil ?? null,
        p_status: 'approved',
      })
      if (promoteErr) throw new Error(promoteErr.message)

      // 5. Cascade: move deal to Won stage
      if (quote.dealId) {
        try {
          const deal = await provider.getDealById(quote.dealId)
          if (deal) {
            const stages = await provider.getPipelineStages(deal.pipelineId)
            const wonStage = stages.find((s) => s.isWon)
            if (wonStage) await provider.moveDealToStage(deal.id, wonStage.id)
          }
        } catch { /* non-blocking */ }
      }

      // 6. Convert lead to client — use leadId or fall back to contactId (party_id)
      const personToConvert = quote.leadId ?? quote.contactId
      if (personToConvert) {
        const clientKind = options?.clientConversion?.archetypeKind ?? 'client'
        const { data: person } = await core.from('persons')
          .select('kind, name, email, phone, tenant_id, metadata')
          .eq('id', personToConvert).single()

        // Only convert if they're actually a lead (not already a client/staff/etc.)
        const personKind = (person as any)?.kind as string | undefined
        if (person && (personKind === 'lead' || personKind === 'contact')) {
          const personMeta = (person as any)?.metadata ?? {}
          await core.from('persons').update({
            kind: clientKind,
            metadata: { ...personMeta, convertedFromLead: true },
          }).eq('id', personToConvert)

          // Create extension table record
          if (options?.clientConversion) {
            const { extensionTable, fkColumn } = options.clientConversion
            await pub.from(extensionTable).upsert({
              [fkColumn]: personToConvert,
              tenant_id: (person as any).tenant_id,
            }, { onConflict: fkColumn })
          }
        }
      }

      return (await provider.getQuoteById(id))!
    },

    async rejectQuote(id: string, reason: string): Promise<Quote> {
      const { core } = getClients()
      // Read existing metadata to merge
      const { data: existing } = await core.from('orders').select('metadata').eq('id', id).single()
      const existingMeta = (existing as any)?.metadata ?? {}
      const { error } = await core.from('orders').update({
        status: 'rejected',
        metadata: { ...existingMeta, rejectionReason: reason },
      }).eq('id', id)
      if (error) throw new Error(error.message)
      // Cascade: move deal to Lost stage
      const quote = await provider.getQuoteById(id)
      if (quote?.dealId) {
        const deal = await provider.getDealById(quote.dealId)
        if (deal) {
          const stages = await provider.getPipelineStages(deal.pipelineId)
          const lostStage = stages.find((s) => s.isLost)
          if (lostStage) await provider.moveDealToStage(deal.id, lostStage.id)
        }
      }
      return quote!
    },

    async expireQuote(id: string): Promise<Quote> {
      const { core } = getClients()
      await core.from('orders').update({ status: 'expired' }).eq('id', id)
      return (await provider.getQuoteById(id))!
    },

    // Cross-entity lookups
    async getQuotesByDealId(dealId: string): Promise<Quote[]> {
      const { core } = getClients()
      const { data } = await core.from('orders').select('*').eq('kind', 'quote')
      return (data ?? [])
        .filter((r: any) => r.metadata?.dealId === dealId)
        .map((r: any) => ({
          id: r.id, quoteNumber: r.reference_number ?? '', quoteDate: r.created_at?.slice(0, 10) ?? '',
          validUntil: r.due_at?.slice(0, 10) ?? '', status: r.status ?? 'draft',
          totalAmount: r.total ?? 0, contactId: r.party_id,
          contactName: r.metadata?.contactName, dealId: r.metadata?.dealId, leadId: r.metadata?.leadId, convertedInvoiceId: r.metadata?.convertedInvoiceId,
          items: [], tenantId: r.tenant_id, createdAt: r.created_at, updatedAt: r.updated_at,
        } as Quote))
    },

    async getDealByLeadId(leadId: string): Promise<Deal | null> {
      const { pub } = getClients()
      const { data } = await pub.from('deal_extensions').select('order_id').eq('lead_id', leadId).limit(1)
      if (!data || data.length === 0) return null
      return provider.getDealById(data[0].order_id)
    },

    // --- Summary ---
    async getSummary(): Promise<CrmSummary> {
      const { core, pub } = getClients()
      const monthStart = new Date().toISOString().slice(0, 7) + '-01'
      const today = new Date().toISOString().slice(0, 10)

      const { count: totalLeads } = await core.from('persons').select('*', { count: 'exact', head: true }).eq('kind', 'lead')
      const { count: newLeads } = await core.from('persons').select('*', { count: 'exact', head: true }).eq('kind', 'lead').gte('created_at', monthStart)
      const { data: deals } = await core.from('orders').select('status, total, updated_at').eq('kind', 'deal')
      const allDeals = deals ?? []
      const openDeals = allDeals.filter((d: any) => d.status === 'open')
      const wonDeals = allDeals.filter((d: any) => d.status === 'won')
      const wonThisMonth = wonDeals.filter((d: any) => d.updated_at >= monthStart)
      const convertedLeads = allDeals.length // each deal came from a lead conversion

      const { count: pendingActs } = await pub.from('crm_activities').select('*', { count: 'exact', head: true }).is('completed_at', null)
      const { count: overdueActs } = await pub.from('crm_activities').select('*', { count: 'exact', head: true }).is('completed_at', null).lt('due_date', today)

      return {
        totalLeads: totalLeads ?? 0,
        newLeadsThisMonth: newLeads ?? 0,
        totalDeals: allDeals.length,
        openDealsValue: openDeals.reduce((s: number, d: any) => s + (d.total ?? 0), 0),
        wonDealsThisMonth: wonThisMonth.length,
        wonDealsValueThisMonth: wonThisMonth.reduce((s: number, d: any) => s + (d.total ?? 0), 0),
        conversionRate: (totalLeads ?? 0) > 0 ? (convertedLeads / (totalLeads ?? 1)) * 100 : 0,
        averageDealValue: wonDeals.length > 0 ? wonDeals.reduce((s: number, d: any) => s + (d.total ?? 0), 0) / wonDeals.length : 0,
        pendingActivities: pendingActs ?? 0,
        overdueActivities: overdueActs ?? 0,
      }
    },

    async getFunnel(pipelineId: string): Promise<FunnelStage[]> {
      const { pub } = getClients()
      const stages = await provider.getPipelineStages(pipelineId)
      const deals = await provider.getDeals({ status: 'open' })

      return stages.filter((s: any) => !s.isLost).map((stage) => {
        const stageDeals = deals.data.filter((d: any) => d.stageId === stage.id)
        return {
          stageId: stage.id, stageName: stage.name, stageColor: stage.color,
          dealCount: stageDeals.length,
          totalValue: stageDeals.reduce((s, d) => s + d.value, 0),
        }
      })
    },
  }

  return provider
}
