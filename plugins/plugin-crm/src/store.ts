import { createStore, type StoreApi } from 'zustand/vanilla'
import { dedup } from '@fayz-ai/saas'
import { toast } from '@fayz-ai/ui'
import type { CrmDataProvider } from './data/types'
import type {
  Pipeline, PipelineStage, Lead, Deal, Activity, Quote,
  CrmSummary, FunnelStage,
  LeadQuery, DealQuery, ActivityQuery, QuoteQuery,
  CreateLeadInput, CreateDealInput, CreateActivityInput, CreateQuoteInput,
} from './types'

export interface CrmUIState {
  pipelines: Pipeline[]
  stages: PipelineStage[]
  leads: Lead[]
  leadsTotal: number
  leadsLoading: boolean
  deals: Deal[]
  dealsTotal: number
  dealsLoading: boolean
  dealsByStage: Map<string, Deal[]>
  activities: Activity[]
  activitiesTotal: number
  activitiesLoading: boolean
  quotes: Quote[]
  quotesTotal: number
  quotesLoading: boolean
  summary: CrmSummary | null
  summaryLoading: boolean
  funnel: FunnelStage[]

  fetchPipelines(): Promise<void>
  fetchSummary(): Promise<void>
  fetchFunnel(pipelineId: string): Promise<void>
  fetchLeads(query: LeadQuery): Promise<void>
  fetchDeals(query: DealQuery): Promise<void>
  fetchDealsByStage(pipelineId: string): Promise<void>
  fetchActivities(query: ActivityQuery): Promise<void>
  /** Re-fetch the timeline with the last query — writes append system events. */
  refreshActivities(): Promise<void>
  fetchQuotes(query: QuoteQuery): Promise<void>
  createLead(input: CreateLeadInput): Promise<Lead>
  createDeal(input: CreateDealInput): Promise<Deal>
  createActivity(input: CreateActivityInput): Promise<Activity>
  createQuote(input: CreateQuoteInput): Promise<Quote>
  updateQuote(id: string, input: CreateQuoteInput): Promise<Quote>
  sendQuote(id: string): Promise<Quote>
  approveQuote(id: string): Promise<Quote>
  rejectQuote(id: string, reason: string): Promise<Quote>
  expireQuote(id: string): Promise<Quote>
  moveDealToStage(dealId: string, stageId: string): Promise<void>
}

export function createCrmStore(provider: CrmDataProvider): StoreApi<CrmUIState> {
  let lastActivitiesQuery: ActivityQuery = {}
  return createStore<CrmUIState>((set, get) => ({
    pipelines: [], stages: [],
    leads: [], leadsTotal: 0, leadsLoading: false,
    deals: [], dealsTotal: 0, dealsLoading: false,
    dealsByStage: new Map(),
    activities: [], activitiesTotal: 0, activitiesLoading: false,
    quotes: [], quotesTotal: 0, quotesLoading: false,
    summary: null, summaryLoading: false,
    funnel: [],

    async fetchPipelines() {
      return dedup('crm:pipelines', async () => {
        const pipelines = await provider.getPipelines()
        const stages = pipelines.length > 0 ? await provider.getPipelineStages(pipelines[0].id) : []
        set({ pipelines, stages })
      })
    },

    async fetchSummary() {
      return dedup('crm:summary', async () => {
        set({ summaryLoading: true })
        const summary = await provider.getSummary()
        set({ summary, summaryLoading: false })
      })
    },

    async fetchFunnel(pipelineId) {
      return dedup('crm:funnel:' + pipelineId, async () => {
        const funnel = await provider.getFunnel(pipelineId)
        set({ funnel })
      })
    },

    async fetchLeads(query) {
      return dedup('crm:leads:' + JSON.stringify(query), async () => {
        set({ leadsLoading: true })
        const result = await provider.getLeads(query)
        set({ leads: result.data, leadsTotal: result.total, leadsLoading: false })
      })
    },

    async fetchDeals(query) {
      return dedup('crm:deals:' + JSON.stringify(query), async () => {
        set({ dealsLoading: true })
        const result = await provider.getDeals(query)
        set({ deals: result.data, dealsTotal: result.total, dealsLoading: false })
      })
    },

    async fetchDealsByStage(pipelineId) {
      return dedup('crm:dealsByStage:' + pipelineId, async () => {
        set({ dealsLoading: true })
        const dealsByStage = await provider.getDealsByStage(pipelineId)
        set({ dealsByStage, dealsLoading: false })
      })
    },

    async fetchActivities(query) {
      lastActivitiesQuery = query
      return dedup('crm:activities:' + JSON.stringify(query), async () => {
        set({ activitiesLoading: true })
        const result = await provider.getActivities(query)
        set({ activities: result.data, activitiesTotal: result.total, activitiesLoading: false })
      })
    },

    async refreshActivities() {
      try {
        const result = await provider.getActivities(lastActivitiesQuery)
        set({ activities: result.data, activitiesTotal: result.total })
      } catch { /* timeline refresh is best-effort */ }
    },

    async fetchQuotes(query) {
      return dedup('crm:quotes:' + JSON.stringify(query), async () => {
        set({ quotesLoading: true })
        const result = await provider.getQuotes(query)
        set({ quotes: result.data, quotesTotal: result.total, quotesLoading: false })
      })
    },

    async createLead(input) {
      try {
        const lead = await provider.createLead(input)

        // Auto-create a deal in the first pipeline stage so it appears in the kanban
        // Fetch pipelines if not loaded yet
        let { pipelines, stages } = get()
        if (pipelines.length === 0) {
          pipelines = await provider.getPipelines()
          stages = pipelines.length > 0 ? await provider.getPipelineStages(pipelines[0].id) : []
          set({ pipelines, stages })
        }

        const defaultPipeline = pipelines.find((p) => p.isDefault) ?? pipelines[0]
        const firstStage = stages.filter((s) => !s.isWon && !s.isLost).sort((a, b) => a.order - b.order)[0]
        if (defaultPipeline && firstStage) {
          try {
            await provider.createDeal({
              leadId: lead.id,
              title: lead.name,
              value: input.value ?? 0,
              pipelineId: defaultPipeline.id,
              stageId: firstStage.id,
              contactName: lead.name,
            })
          } catch {
            // Deal creation failed — lead is still created, just won't appear in pipeline
          }
        }

        const summary = await provider.getSummary()
        set({ summary })
        void get().refreshActivities()
        toast.success('Lead captured')
        return lead
      } catch (err: any) {
        toast.error('Failed to create lead', { description: err?.message })
        throw err
      }
    },

    async createDeal(input) {
      try {
        const deal = await provider.createDeal(input)
        const [summary] = await Promise.all([provider.getSummary()])
        set({ summary })
        void get().refreshActivities()
        toast.success('Deal created')
        return deal
      } catch (err: any) {
        toast.error('Failed to create deal', { description: err?.message })
        throw err
      }
    },

    async createActivity(input) {
      try {
        const activity = await provider.createActivity(input)
        toast.success('Activity logged')
        return activity
      } catch (err: any) {
        toast.error('Failed to log activity', { description: err?.message })
        throw err
      }
    },

    async createQuote(input) {
      try {
        let { pipelines, stages } = get()
        if (pipelines.length === 0) {
          pipelines = await provider.getPipelines()
          stages = pipelines.length > 0 ? await provider.getPipelineStages(pipelines[0].id) : []
          set({ pipelines, stages })
        }
        const defaultPipeline = pipelines.find((p) => p.isDefault) ?? pipelines[0]

        let leadId = input.leadId
        let dealId = input.dealId
        const contactId = input.contactId
        const contactName = input.contactName

        // Step 1: Resolve or create a lead
        if (!leadId && contactId) {
          // contactId might be a lead (e.g., from "Add as Lead" in the form)
          // Check if this person is a lead
          try {
            const lead = await provider.getLeadById(contactId)
            if (lead) leadId = lead.id
          } catch { /* not a lead, that's OK */ }
        }

        if (!leadId && contactName) {
          // No lead found — create one
          try {
            const lead = await provider.createLead({ name: contactName })
            leadId = lead.id
            if (!contactId) input = { ...input, contactId: lead.id }
          } catch { /* ignore */ }
        }

        // Step 2: Resolve or create a deal for this lead
        if (leadId && !dealId) {
          try {
            const existingDeal = await provider.getDealByLeadId(leadId)
            if (existingDeal) {
              dealId = existingDeal.id
            } else if (defaultPipeline) {
              // No deal exists — create one
              const firstStage = stages.filter((s) => !s.isWon && !s.isLost).sort((a, b) => a.order - b.order)[0]
              if (firstStage) {
                const deal = await provider.createDeal({
                  leadId, title: contactName ?? 'Deal',
                  value: input.items?.reduce((s, i) => s + (i.totalAmount ?? 0), 0) ?? 0,
                  pipelineId: defaultPipeline.id, stageId: firstStage.id,
                  contactName: contactName ?? '',
                })
                dealId = deal.id
              }
            }
          } catch { /* ignore */ }
        }

        // Create the quote with proper links
        const enrichedInput = { ...input, leadId, dealId }
        const quote = await provider.createQuote(enrichedInput)

        // If we have a deal, advance it to Proposal stage (only forward)
        if (dealId && defaultPipeline) {
          try {
            const deal = await provider.getDealById(dealId)
            if (deal && deal.status === 'open') {
              const currentStage = stages.find((s) => s.id === deal.stageId)
              const proposalStage = stages.find((s) => s.name === 'Proposal')
                ?? stages.filter((s) => !s.isWon && !s.isLost).sort((a, b) => b.order - a.order)[0]
              // Only advance forward
              if (proposalStage && currentStage && proposalStage.order > currentStage.order) {
                await provider.moveDealToStage(dealId, proposalStage.id)
              }
            }
          } catch { /* ignore */ }
        }

        // Refresh local state — quotes + pipeline
        set((state) => ({ quotes: [quote, ...state.quotes], quotesTotal: state.quotesTotal + 1 }))
        if (defaultPipeline) {
          try {
            const dealsByStage = await provider.getDealsByStage(defaultPipeline.id)
            set({ dealsByStage })
          } catch { /* non-blocking */ }
        }
        void get().refreshActivities()
        toast.success('Quote created')
        return quote
      } catch (err: any) {
        toast.error('Failed to create quote', { description: err?.message })
        throw err
      }
    },

    async updateQuote(id, input) {
      try {
        const quote = await provider.updateQuote(id, input)
        set((state) => ({ quotes: state.quotes.map((q) => q.id === id ? quote : q) }))
        toast.success('Quote updated')
        return quote
      } catch (err: any) {
        toast.error('Failed to update quote', { description: err?.message })
        throw err
      }
    },

    async sendQuote(id) {
      try {
        const quote = await provider.sendQuote(id)
        set((state) => ({ quotes: state.quotes.map((q) => q.id === id ? quote : q) }))
        void get().refreshActivities()
        toast.success('Quote sent')
        return quote
      } catch (err: any) {
        toast.error('Failed to send quote', { description: err?.message })
        throw err
      }
    },

    async approveQuote(id) {
      try {
        const quote = await provider.approveQuote(id)
        // Full refresh — cascades touch deals, leads, quotes, creates invoice
        const { pipelines } = get()
        if (pipelines.length > 0) {
          const [dealsByStage, summary, leadsResult, quotesResult] = await Promise.all([
            provider.getDealsByStage(pipelines[0].id),
            provider.getSummary(),
            provider.getLeads({}),
            provider.getQuotes({}),
          ])
          set({ dealsByStage, summary, leads: leadsResult.data, leadsTotal: leadsResult.total, quotes: quotesResult.data, quotesTotal: quotesResult.total })
        }
        void get().refreshActivities()
        toast.success('Quote approved — invoice created')
        return quote
      } catch (err: any) {
        toast.error('Failed to approve quote', { description: err?.message })
        throw err
      }
    },

    async rejectQuote(id, reason) {
      try {
        const quote = await provider.rejectQuote(id, reason)
        const { pipelines } = get()
        if (pipelines.length > 0) {
          const [dealsByStage, summary, leadsResult, quotesResult] = await Promise.all([
            provider.getDealsByStage(pipelines[0].id),
            provider.getSummary(),
            provider.getLeads({}),
            provider.getQuotes({}),
          ])
          set({ dealsByStage, summary, leads: leadsResult.data, leadsTotal: leadsResult.total, quotes: quotesResult.data, quotesTotal: quotesResult.total })
        }
        void get().refreshActivities()
        toast.success('Quote rejected')
        return quote
      } catch (err: any) {
        toast.error('Failed to reject quote', { description: err?.message })
        throw err
      }
    },

    async expireQuote(id) {
      try {
        const quote = await provider.expireQuote(id)
        set((state) => ({ quotes: state.quotes.map((q) => q.id === id ? quote : q) }))
        toast.success('Quote expired')
        return quote
      } catch (err: any) {
        toast.error('Failed to expire quote', { description: err?.message })
        throw err
      }
    },

    async moveDealToStage(dealId, stageId) {
      await provider.moveDealToStage(dealId, stageId)
      const { pipelines } = get()
      if (pipelines.length > 0) {
        const [dealsByStage, summary, leadsResult, quotesResult] = await Promise.all([
          provider.getDealsByStage(pipelines[0].id),
          provider.getSummary(),
          provider.getLeads({}),
          provider.getQuotes({}),
        ])
        set({ dealsByStage, summary, leads: leadsResult.data, leadsTotal: leadsResult.total, quotes: quotesResult.data, quotesTotal: quotesResult.total })
      }
      void get().refreshActivities()
    },
  }))
}
