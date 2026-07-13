import type { ReputationDataProvider } from './types'
import type { Review, ReviewSummary, ReviewListQuery } from '../types'

// ---------------------------------------------------------------------------
// Supabase-backed reputation provider — STUB (deferred to Phase 2).
//
// Later: read a `reviews` table (tenant-scoped, RLS) and/or synced Google/
// Facebook reviews. Swapping this in is a pure provider change — hooks and
// components are untouched. Throws until then so createSafeDataProvider falls
// back to the mock/seed provider whenever no Supabase client is configured.
// ---------------------------------------------------------------------------

export function createSupabaseReputationProvider(): ReputationDataProvider {
  const notImplemented = (): never => {
    throw new Error(
      '[plugin-reputation] Supabase provider not implemented yet — deferred to Phase 2. ' +
        'Run on the mock/seed provider (no Supabase client configured) for now.',
    )
  }
  return {
    listReviews: (_query?: ReviewListQuery): Promise<Review[]> => notImplemented(),
    getSummary: (): Promise<ReviewSummary> => notImplemented(),
  }
}
