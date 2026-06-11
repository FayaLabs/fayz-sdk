import type { CrmDataProvider } from './types'
import type {
  Pipeline, PipelineStage, Lead, Deal, Activity, Quote, QuoteItem,
  CreateLeadInput, CreateDealInput, CreateActivityInput, CreateQuoteInput,
  LeadQuery, DealQuery, ActivityQuery, QuoteQuery,
  PaginatedResult, CrmSummary, FunnelStage,
  LeadStatus, DealStatus, QuoteStatus,
} from '../types'
import { deriveLeadStatus, deriveQuoteStatus } from '../cascade'

let nextId = 1
function uid(): string { return String(nextId++) }
function now(): string { return new Date().toISOString() }
function today(): string { return new Date().toISOString().slice(0, 10) }

function paginate<T>(items: T[], page?: number, pageSize?: number): PaginatedResult<T> {
  const p = page ?? 1
  const ps = pageSize ?? 50
  const start = (p - 1) * ps
  return { data: items.slice(start, start + ps), total: items.length }
}

interface MockStore {
  pipelines: Pipeline[]
  stages: PipelineStage[]
  leads: Lead[]
  deals: Deal[]
  activities: Activity[]
  quotes: Quote[]
}

function createStore(seedStages?: Array<{ name: string; color: string; probability: number }>): MockStore {
  const tenantId = 'mock-tenant'
  const pipelineId = uid()

  const defaultStages = seedStages ?? [
    { name: 'New', color: '#6366f1', probability: 10 },
    { name: 'Contacted', color: '#3b82f6', probability: 25 },
    { name: 'Qualified', color: '#f59e0b', probability: 50 },
    { name: 'Proposal', color: '#f97316', probability: 75 },
    { name: 'Negotiation', color: '#8b5cf6', probability: 90 },
    { name: 'Won', color: '#22c55e', probability: 100 },
    { name: 'Lost', color: '#ef4444', probability: 0 },
  ]

  const stages: PipelineStage[] = defaultStages.map((s, i) => ({
    id: uid(),
    pipelineId,
    name: s.name,
    order: i,
    color: s.color,
    probability: s.probability,
    isWon: s.name === 'Won',
    isLost: s.name === 'Lost',
    tenantId,
    createdAt: now(),
  }))

  return {
    pipelines: [{
      id: pipelineId,
      name: 'Sales Pipeline',
      isDefault: true,
      isActive: true,
      tenantId,
      createdAt: now(),
      updatedAt: now(),
    }],
    stages,
    leads: [],
    deals: [],
    activities: [],
    quotes: [],
  }
}

export function createMockCrmProvider(options?: {
  dealStages?: Array<{ name: string; color: string; probability: number }>
}): CrmDataProvider {
  const store = createStore(options?.dealStages)
  const tenantId = 'mock-tenant'

  // --- Cascade helper: sync lead + quote statuses when a deal moves ---
  function cascadeFromStage(deal: Deal, stage: PipelineStage) {
    // Cascade to lead
    if (deal.leadId) {
      const lead = store.leads.find((l) => l.id === deal.leadId)
      if (lead) {
        lead.status = deriveLeadStatus(stage)
        lead.updatedAt = now()
      }
    }
    // Cascade to quotes
    for (const q of store.quotes) {
      if (q.dealId === deal.id) {
        q.status = deriveQuoteStatus(stage, q.status)
        q.updatedAt = now()
      }
    }
  }

  const provider: CrmDataProvider = {
    async getPipelines() { return store.pipelines },
    async getPipelineStages(pipelineId) { return store.stages.filter((s) => s.pipelineId === pipelineId).sort((a, b) => a.order - b.order) },

    // Leads
    async getLeads(query: LeadQuery) {
      let results = [...store.leads]
      if (query.status) {
        const statuses = Array.isArray(query.status) ? query.status : [query.status]
        results = results.filter((l) => statuses.includes(l.status))
      }
      if (query.sourceId) results = results.filter((l) => l.sourceId === query.sourceId)
      if (query.search) {
        const s = query.search.toLowerCase()
        results = results.filter((l) => l.name.toLowerCase().includes(s) || l.email?.toLowerCase().includes(s) || l.company?.toLowerCase().includes(s))
      }
      results.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return paginate(results, query.page, query.pageSize)
    },

    async getLeadById(id) { return store.leads.find((l) => l.id === id) ?? null },

    async createLead(input: CreateLeadInput) {
      const lead: Lead = {
        id: uid(), name: input.name, email: input.email, phone: input.phone,
        company: input.company, sourceId: input.sourceId, status: 'new',
        assignedToId: input.assignedToId, value: input.value,
        tags: input.tags ?? [], notes: input.notes, tenantId,
        createdAt: now(), updatedAt: now(),
      }
      store.leads.push(lead)
      return lead
    },

    async updateLead(id, data) {
      const lead = store.leads.find((l) => l.id === id)
      if (!lead) throw new Error(`Lead ${id} not found`)
      Object.assign(lead, data, { updatedAt: now() })
      return lead
    },

    async convertLeadToDeal(leadId, dealInput) {
      const lead = store.leads.find((l) => l.id === leadId)
      if (!lead) throw new Error(`Lead ${leadId} not found`)
      lead.status = 'converted'
      lead.updatedAt = now()
      const deal = await provider.createDeal({ ...dealInput, leadId })
      return deal
    },

    // Deals
    async getDeals(query: DealQuery) {
      let results = [...store.deals]
      if (query.pipelineId) results = results.filter((d) => d.pipelineId === query.pipelineId)
      if (query.stageId) results = results.filter((d) => d.stageId === query.stageId)
      if (query.status) {
        const statuses = Array.isArray(query.status) ? query.status : [query.status]
        results = results.filter((d) => statuses.includes(d.status))
      }
      if (query.search) {
        const s = query.search.toLowerCase()
        results = results.filter((d) => d.title.toLowerCase().includes(s) || d.contactName?.toLowerCase().includes(s))
      }
      results.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return paginate(results, query.page, query.pageSize)
    },

    async getDealById(id) { return store.deals.find((d) => d.id === id) ?? null },

    async getDealsByStage(pipelineId) {
      const stages = store.stages.filter((s) => s.pipelineId === pipelineId).sort((a, b) => a.order - b.order)
      const map = new Map<string, Deal[]>()
      for (const stage of stages) {
        map.set(stage.id, store.deals.filter((d) => d.stageId === stage.id && d.status === 'open'))
      }
      return map
    },

    async createDeal(input: CreateDealInput) {
      const stage = store.stages.find((s) => s.id === input.stageId)
      const deal: Deal = {
        id: uid(), leadId: input.leadId, title: input.title, value: input.value,
        pipelineId: input.pipelineId, stageId: input.stageId,
        stageName: stage?.name, stageColor: stage?.color,
        probability: stage?.probability ?? 0, expectedCloseDate: input.expectedCloseDate,
        assignedToId: input.assignedToId, contactId: input.contactId,
        contactName: input.contactName, status: 'open',
        tags: input.tags ?? [], notes: input.notes, tenantId,
        createdAt: now(), updatedAt: now(),
      }
      store.deals.push(deal)
      return deal
    },

    async updateDeal(id, data) {
      const deal = store.deals.find((d) => d.id === id)
      if (!deal) throw new Error(`Deal ${id} not found`)
      Object.assign(deal, data, { updatedAt: now() })
      return deal
    },

    async moveDealToStage(dealId, stageId) {
      const deal = store.deals.find((d) => d.id === dealId)
      if (!deal) throw new Error(`Deal ${dealId} not found`)
      const stage = store.stages.find((s) => s.id === stageId)
      if (!stage) throw new Error(`Stage ${stageId} not found`)
      deal.stageId = stageId
      deal.stageName = stage.name
      deal.stageColor = stage.color
      deal.probability = stage.probability ?? 0
      if (stage.isWon) deal.status = 'won'
      if (stage.isLost) deal.status = 'lost'
      deal.updatedAt = now()

      // Cascade to lead + quotes
      cascadeFromStage(deal, stage)

      return deal
    },

    // Activities
    async getActivities(query: ActivityQuery) {
      let results = [...store.activities]
      if (query.dealId) results = results.filter((a) => a.dealId === query.dealId)
      if (query.leadId) results = results.filter((a) => a.leadId === query.leadId)
      if (query.activityType) results = results.filter((a) => a.activityType === query.activityType)
      if (query.completed !== undefined) {
        results = query.completed ? results.filter((a) => a.completedAt) : results.filter((a) => !a.completedAt)
      }
      results.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return paginate(results, query.page, query.pageSize)
    },

    async createActivity(input: CreateActivityInput) {
      const activity: Activity = {
        id: uid(), dealId: input.dealId, leadId: input.leadId,
        contactId: input.contactId, activityType: input.activityType,
        title: input.title, description: input.description,
        dueDate: input.dueDate, assignedToId: input.assignedToId,
        tenantId, createdAt: now(),
      }
      store.activities.push(activity)
      return activity
    },

    async completeActivity(id) {
      const activity = store.activities.find((a) => a.id === id)
      if (!activity) throw new Error(`Activity ${id} not found`)
      activity.completedAt = now()
      return activity
    },

    // Quotes
    async getQuotes(query: QuoteQuery) {
      let results = [...store.quotes]
      if (query.status) {
        const statuses = Array.isArray(query.status) ? query.status : [query.status]
        results = results.filter((q) => statuses.includes(q.status))
      }
      if (query.contactId) results = results.filter((q) => q.contactId === query.contactId)
      if (query.search) {
        const s = query.search.toLowerCase()
        results = results.filter((q) => q.quoteNumber.includes(s) || q.contactName?.toLowerCase().includes(s))
      }
      results.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return paginate(results, query.page, query.pageSize)
    },

    async getQuoteById(id) { return store.quotes.find((q) => q.id === id) ?? null },

    async createQuote(input: CreateQuoteInput) {
      const quoteId = uid()
      const items: QuoteItem[] = input.items.map((item) => ({
        id: uid(), quoteId, ...item, createdAt: now(),
      }))
      const totalAmount = items.reduce((sum, i) => sum + i.totalAmount, 0)
      const quote: Quote = {
        id: quoteId, dealId: input.dealId, leadId: input.leadId,
        contactId: input.contactId,
        contactName: input.contactName, quoteNumber: `Q-${String(store.quotes.length + 1).padStart(4, '0')}`,
        quoteDate: input.quoteDate, validUntil: input.validUntil,
        status: 'draft', totalAmount, observations: input.observations,
        paymentConditions: input.paymentConditions, items, tenantId,
        createdAt: now(), updatedAt: now(),
      }
      store.quotes.push(quote)
      return quote
    },

    async updateQuote(id, input: CreateQuoteInput) {
      const quote = store.quotes.find((q) => q.id === id)
      if (!quote) throw new Error(`Quote ${id} not found`)
      const items: QuoteItem[] = input.items.map((item) => ({
        id: uid(), quoteId: id, ...item, createdAt: now(),
      }))
      const totalAmount = items.reduce((sum, i) => sum + i.totalAmount, 0)
      quote.contactId = input.contactId
      quote.contactName = input.contactName
      quote.dealId = input.dealId
      quote.leadId = input.leadId
      quote.quoteDate = input.quoteDate
      quote.validUntil = input.validUntil
      quote.observations = input.observations
      quote.paymentConditions = input.paymentConditions
      quote.items = items
      quote.totalAmount = totalAmount
      quote.updatedAt = now()
      return quote
    },

    async sendQuote(id) {
      const quote = store.quotes.find((q) => q.id === id)
      if (!quote) throw new Error(`Quote ${id} not found`)
      quote.status = 'sent'
      quote.updatedAt = now()
      return quote
    },

    async approveQuote(id) {
      const quote = store.quotes.find((q) => q.id === id)
      if (!quote) throw new Error(`Quote ${id} not found`)
      quote.status = 'approved'
      quote.updatedAt = now()

      // Cascade: move deal to Won stage
      if (quote.dealId) {
        const deal = store.deals.find((d) => d.id === quote.dealId)
        if (deal) {
          const wonStage = store.stages.find((s) => s.pipelineId === deal.pipelineId && s.isWon)
          if (wonStage) {
            await provider.moveDealToStage(deal.id, wonStage.id)
          }
        }
      }

      // Generate mock invoice
      quote.convertedInvoiceId = uid()

      // Convert lead to client
      if (quote.leadId) {
        const lead = store.leads.find((l) => l.id === quote.leadId)
        if (lead) {
          lead.metadata = { ...lead.metadata, convertedFromLead: true }
        }
      }

      return quote
    },

    async rejectQuote(id, reason) {
      const quote = store.quotes.find((q) => q.id === id)
      if (!quote) throw new Error(`Quote ${id} not found`)
      quote.status = 'rejected'
      quote.rejectionReason = reason
      quote.updatedAt = now()

      // Cascade: move deal to Lost stage
      if (quote.dealId) {
        const deal = store.deals.find((d) => d.id === quote.dealId)
        if (deal) {
          const lostStage = store.stages.find((s) => s.pipelineId === deal.pipelineId && s.isLost)
          if (lostStage) {
            await provider.moveDealToStage(deal.id, lostStage.id)
          }
        }
      }
      return quote
    },

    async expireQuote(id) {
      const quote = store.quotes.find((q) => q.id === id)
      if (!quote) throw new Error(`Quote ${id} not found`)
      quote.status = 'expired'
      quote.updatedAt = now()
      return quote
    },

    // Cross-entity lookups
    async getQuotesByDealId(dealId) {
      return store.quotes.filter((q) => q.dealId === dealId)
    },

    async getDealByLeadId(leadId) {
      return store.deals.find((d) => d.leadId === leadId) ?? null
    },

    // Summary
    async getSummary(): Promise<CrmSummary> {
      const monthStart = today().slice(0, 7) + '-01'
      const monthLeads = store.leads.filter((l) => l.createdAt >= monthStart)
      const wonDeals = store.deals.filter((d) => d.status === 'won')
      const wonThisMonth = wonDeals.filter((d) => d.updatedAt >= monthStart)
      const openDeals = store.deals.filter((d) => d.status === 'open')
      const totalConverted = store.leads.filter((l) => l.status === 'converted').length
      const pendingActivities = store.activities.filter((a) => !a.completedAt)
      const overdueActivities = pendingActivities.filter((a) => a.dueDate && a.dueDate < today())

      return {
        totalLeads: store.leads.length,
        newLeadsThisMonth: monthLeads.length,
        totalDeals: store.deals.length,
        openDealsValue: openDeals.reduce((s, d) => s + d.value, 0),
        wonDealsThisMonth: wonThisMonth.length,
        wonDealsValueThisMonth: wonThisMonth.reduce((s, d) => s + d.value, 0),
        conversionRate: store.leads.length > 0 ? (totalConverted / store.leads.length) * 100 : 0,
        averageDealValue: wonDeals.length > 0 ? wonDeals.reduce((s, d) => s + d.value, 0) / wonDeals.length : 0,
        pendingActivities: pendingActivities.length,
        overdueActivities: overdueActivities.length,
      }
    },

    async getFunnel(pipelineId) {
      const stages = store.stages.filter((s) => s.pipelineId === pipelineId && !s.isLost).sort((a, b) => a.order - b.order)
      return stages.map((stage) => {
        const deals = store.deals.filter((d) => d.stageId === stage.id)
        return {
          stageId: stage.id, stageName: stage.name, stageColor: stage.color,
          dealCount: deals.length, totalValue: deals.reduce((s, d) => s + d.value, 0),
        }
      })
    },
  }

  return provider
}
