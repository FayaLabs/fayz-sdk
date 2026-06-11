// ---------------------------------------------------------------------------
// CRM/Sales Plugin — Pure TypeScript types
// Zero dependencies. Generic CRM abstracted from beautyplace.
// ---------------------------------------------------------------------------

// ============================================================
// ENUMS / LITERALS
// ============================================================

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'lost'
export type DealStatus = 'open' | 'won' | 'lost'
export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'
export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'task' | 'whatsapp' | (string & {})

// ============================================================
// CORE ENTITIES
// ============================================================

export interface Pipeline {
  id: string
  name: string
  isDefault: boolean
  isActive: boolean
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface PipelineStage {
  id: string
  pipelineId: string
  name: string
  order: number
  color: string
  probability: number
  isWon: boolean
  isLost: boolean
  tenantId: string
  createdAt: string
}

export interface Lead {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  sourceId?: string
  sourceName?: string
  status: LeadStatus
  assignedToId?: string
  assignedToName?: string
  pipelineId?: string
  stageId?: string
  stageName?: string
  value?: number
  tags: string[]
  notes?: string
  metadata?: Record<string, unknown>
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface Deal {
  id: string
  leadId?: string
  title: string
  value: number
  pipelineId: string
  stageId: string
  stageName?: string
  stageColor?: string
  probability: number
  expectedCloseDate?: string
  assignedToId?: string
  assignedToName?: string
  contactId?: string
  contactName?: string
  status: DealStatus
  lostReason?: string
  tags: string[]
  notes?: string
  metadata?: Record<string, unknown>
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface Activity {
  id: string
  dealId?: string
  leadId?: string
  contactId?: string
  contactName?: string
  activityType: ActivityType
  title: string
  description?: string
  dueDate?: string
  completedAt?: string
  assignedToId?: string
  assignedToName?: string
  tenantId: string
  createdAt: string
}

export interface Quote {
  id: string
  dealId?: string
  leadId?: string
  contactId?: string
  contactName?: string
  quoteNumber: string
  quoteDate: string
  validUntil: string
  status: QuoteStatus
  totalAmount: number
  observations?: string
  paymentConditions?: string
  rejectionReason?: string
  convertedInvoiceId?: string
  items: QuoteItem[]
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface QuoteItem {
  id: string
  quoteId: string
  itemKind: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  totalAmount: number
  referenceId?: string
  createdAt: string
}

export interface LeadSource {
  id: string
  name: string
  isActive: boolean
  tenantId: string
  createdAt: string
}

export interface Tag {
  id: string
  name: string
  color: string
  tenantId: string
  createdAt: string
}

// ============================================================
// INPUT TYPES
// ============================================================

export interface CreateLeadInput {
  name: string
  email?: string
  phone?: string
  company?: string
  sourceId?: string
  value?: number
  notes?: string
  tags?: string[]
  assignedToId?: string
}

export interface CreateDealInput {
  leadId?: string
  title: string
  value: number
  pipelineId: string
  stageId: string
  expectedCloseDate?: string
  contactId?: string
  contactName?: string
  assignedToId?: string
  notes?: string
  tags?: string[]
}

export interface CreateActivityInput {
  dealId?: string
  leadId?: string
  contactId?: string
  activityType: ActivityType
  title: string
  description?: string
  dueDate?: string
  assignedToId?: string
}

export interface CreateQuoteInput {
  dealId?: string
  leadId?: string
  contactId?: string
  contactName?: string
  quoteDate: string
  validUntil: string
  observations?: string
  paymentConditions?: string
  items: Omit<QuoteItem, 'id' | 'quoteId' | 'createdAt'>[]
}

// ============================================================
// QUERY TYPES
// ============================================================

export interface DateRange { from: string; to: string }

export interface LeadQuery {
  status?: LeadStatus | LeadStatus[]
  sourceId?: string
  search?: string
  page?: number
  pageSize?: number
}

export interface DealQuery {
  pipelineId?: string
  stageId?: string
  status?: DealStatus | DealStatus[]
  assignedToId?: string
  search?: string
  page?: number
  pageSize?: number
}

export interface ActivityQuery {
  dealId?: string
  leadId?: string
  activityType?: ActivityType
  completed?: boolean
  dateRange?: DateRange
  page?: number
  pageSize?: number
}

export interface QuoteQuery {
  status?: QuoteStatus | QuoteStatus[]
  contactId?: string
  search?: string
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
}

// ============================================================
// AGGREGATION
// ============================================================

export interface CrmSummary {
  totalLeads: number
  newLeadsThisMonth: number
  totalDeals: number
  openDealsValue: number
  wonDealsThisMonth: number
  wonDealsValueThisMonth: number
  conversionRate: number
  averageDealValue: number
  pendingActivities: number
  overdueActivities: number
}

export interface FunnelStage {
  stageId: string
  stageName: string
  stageColor: string
  dealCount: number
  totalValue: number
}
