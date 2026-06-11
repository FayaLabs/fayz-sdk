import type {
  Pipeline, PipelineStage, Lead, Deal, Activity, Quote,
  CreateLeadInput, CreateDealInput, CreateActivityInput, CreateQuoteInput,
  LeadQuery, DealQuery, ActivityQuery, QuoteQuery,
  PaginatedResult, CrmSummary, FunnelStage,
} from '../types'

export interface CrmDataProvider {
  // Pipelines
  getPipelines(): Promise<Pipeline[]>
  getPipelineStages(pipelineId: string): Promise<PipelineStage[]>

  // Leads
  getLeads(query: LeadQuery): Promise<PaginatedResult<Lead>>
  getLeadById(id: string): Promise<Lead | null>
  createLead(input: CreateLeadInput): Promise<Lead>
  updateLead(id: string, data: Partial<Lead>): Promise<Lead>
  convertLeadToDeal(leadId: string, dealInput: CreateDealInput): Promise<Deal>

  // Deals
  getDeals(query: DealQuery): Promise<PaginatedResult<Deal>>
  getDealById(id: string): Promise<Deal | null>
  getDealsByStage(pipelineId: string): Promise<Map<string, Deal[]>>
  createDeal(input: CreateDealInput): Promise<Deal>
  updateDeal(id: string, data: Partial<Deal>): Promise<Deal>
  moveDealToStage(dealId: string, stageId: string): Promise<Deal>

  // Activities
  getActivities(query: ActivityQuery): Promise<PaginatedResult<Activity>>
  createActivity(input: CreateActivityInput): Promise<Activity>
  completeActivity(id: string): Promise<Activity>

  // Quotes
  getQuotes(query: QuoteQuery): Promise<PaginatedResult<Quote>>
  getQuoteById(id: string): Promise<Quote | null>
  createQuote(input: CreateQuoteInput): Promise<Quote>
  updateQuote(id: string, input: CreateQuoteInput): Promise<Quote>
  sendQuote(id: string): Promise<Quote>
  approveQuote(id: string): Promise<Quote>
  rejectQuote(id: string, reason: string): Promise<Quote>
  expireQuote(id: string): Promise<Quote>

  // Cross-entity lookups
  getQuotesByDealId(dealId: string): Promise<Quote[]>
  getDealByLeadId(leadId: string): Promise<Deal | null>

  // Summary
  getSummary(): Promise<CrmSummary>
  getFunnel(pipelineId: string): Promise<FunnelStage[]>
}
