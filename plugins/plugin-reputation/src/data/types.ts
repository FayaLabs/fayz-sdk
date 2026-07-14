import type { Review, ReviewSummary, ReviewListQuery } from '../types'

/**
 * Data seam for reputation. Mock/seed powers the POC; a Supabase (or
 * Google/Facebook sync) implementation swaps in later with no component change.
 */
export interface ReputationDataProvider {
  listReviews(query?: ReviewListQuery): Promise<Review[]>
  getSummary(): Promise<ReviewSummary>
}
