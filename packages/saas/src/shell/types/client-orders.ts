// ---------------------------------------------------------------------------
// Client Orders / Documents — Unified stage-based types for the "Pedidos" tab
// One row per commercial interaction, progressing through stages.
// ---------------------------------------------------------------------------

/** Order lifecycle stage */
export type ClientDocumentStage =
  | 'draft'
  | 'quoted'
  | 'booked'
  | 'invoiced'
  | 'paid'
  | 'partial'
  | 'overdue'
  | 'cancelled'
  | 'no_show'
  | 'completed'

/** A unified row in the client orders list */
export interface ClientDocument {
  id: string
  /** What it is: appointment, sale, purchase */
  kind: string
  /** Where it is in lifecycle */
  stage: ClientDocumentStage
  /** Sequential reference number, e.g. #REC-00001 */
  referenceNumber?: string
  /** Primary date — starts_at for booked orders, created_at otherwise */
  date: string
  /** Booking start time (only for orders with starts_at) */
  startsAt?: string
  /** Total amount */
  total: number
  /** Amount paid so far */
  paidAmount?: number
  /** Human-readable description — service names, item summary, etc. */
  description?: string
  createdAt: string
}

/** Query parameters for fetching client documents */
export interface ClientOrdersQuery {
  clientId: string
  /** Filter by stage group: 'quoted', 'booked', 'invoiced', 'paid' */
  stages?: string[]
  page?: number
  pageSize?: number
}

/** Provider interface for fetching a client's unified order/document list */
export interface ClientOrdersProvider {
  getDocuments(query: ClientOrdersQuery): Promise<{ data: ClientDocument[]; total: number }>
}

/** Navigator callback for clicking a row in the orders tab */
export interface ClientOrdersNavigator {
  onNavigate(doc: ClientDocument): void
}
