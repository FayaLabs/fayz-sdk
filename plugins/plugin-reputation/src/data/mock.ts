import type { ReputationDataProvider } from './types'
import type { Review, ReviewSummary, ReviewListQuery } from '../types'

export interface ReputationSeed {
  reviews: Review[]
  /** Explicit aggregate. If omitted, it is computed from `reviews`. */
  summary?: ReviewSummary
}

export interface MockReputationProviderOptions {
  seed?: ReputationSeed
}

const FALLBACK_REVIEWS: Review[] = [
  { id: 'r1', author: 'Camila R.', source: 'Google', rating: 5, text: 'Excelente atendimento, recomendo!', date: 'Jun 2025' },
  { id: 'r2', author: 'Tom B.', source: 'Facebook', rating: 5, text: 'Processo simples e resultado ótimo.', date: 'Jun 2025' },
  { id: 'r3', author: 'Aisha K.', source: 'Google', rating: 4, text: 'Muito bom no geral.', date: 'Jun 2025' },
]

function computeSummary(reviews: Review[]): ReviewSummary {
  const count = reviews.length
  const average = count === 0 ? 0 : Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => Math.round(r.rating) === stars).length,
  }))
  return { average, count, distribution }
}

export function createMockReputationProvider(options?: MockReputationProviderOptions): ReputationDataProvider {
  const reviews: Review[] = options?.seed?.reviews ?? FALLBACK_REVIEWS
  const summary: ReviewSummary = options?.seed?.summary ?? computeSummary(reviews)

  return {
    async listReviews(query?: ReviewListQuery): Promise<Review[]> {
      let result = reviews
      if (query?.minRating != null) result = result.filter((r) => r.rating >= query.minRating!)
      if (query?.limit != null) result = result.slice(0, query.limit)
      return result
    },
    async getSummary(): Promise<ReviewSummary> {
      return summary
    },
  }
}
