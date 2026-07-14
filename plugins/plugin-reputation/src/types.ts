// ---------------------------------------------------------------------------
// Reputation domain types (shared by the admin M1 view and the website surface).
// Presentation-agnostic: a host site maps these into its own review-card markup.
// ---------------------------------------------------------------------------

export type ReviewSource = 'Google' | 'Facebook' | 'Instagram' | 'Website' | (string & {})

export interface Review {
  id: string
  /** Reviewer display name. */
  author: string
  rating: number
  text: string
  /** Human-readable date (e.g. "Janeiro 2025"). */
  date: string
  source?: ReviewSource
  /** Whether the business has replied (admin surface). */
  replied?: boolean
}

export interface ReviewSummary {
  /** Average rating, e.g. 4.8. */
  average: number
  /** Total number of ratings, e.g. 123. */
  count: number
  /** Optional star distribution (5→1). */
  distribution?: Array<{ stars: number; count: number }>
}

export interface ReviewListQuery {
  limit?: number
  /** Minimum rating to include. */
  minRating?: number
}
