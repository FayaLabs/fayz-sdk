import type { PipelineStage, LeadStatus, QuoteStatus } from './types'

/**
 * Derives the lead status from the pipeline stage the deal is in.
 * Pipeline stages are the single source of truth for lead lifecycle.
 */
export function deriveLeadStatus(stage: PipelineStage): LeadStatus {
  if (stage.isWon) return 'converted'
  if (stage.isLost) return 'lost'
  if (stage.probability <= 10) return 'new'
  if (stage.probability <= 25) return 'contacted'
  return 'qualified'
}

/**
 * Derives the quote status from the pipeline stage.
 * Never downgrades — if the quote is already 'sent', moving the deal
 * backward won't revert it to 'draft'.
 */
export function deriveQuoteStatus(stage: PipelineStage, current: QuoteStatus): QuoteStatus {
  if (stage.isWon) return 'approved'
  if (stage.isLost) return 'rejected'
  return current
}
