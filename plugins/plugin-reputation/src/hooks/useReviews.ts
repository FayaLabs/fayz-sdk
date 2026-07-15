import { useEffect, useState } from 'react'
import { useReputationContext } from '../context'
import type { Review, ReviewListQuery } from '../types'

export interface UseReviewsResult {
  reviews: Review[]
  loading: boolean
  error: Error | null
}

/** Fetch the review list from the active reputation provider. */
export function useReviews(query?: ReviewListQuery): UseReviewsResult {
  const { provider } = useReputationContext()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const limit = query?.limit
  const minRating = query?.minRating

  useEffect(() => {
    let active = true
    setLoading(true)
    provider
      .listReviews({ limit, minRating })
      .then((result) => {
        if (!active) return
        setReviews(result)
        setError(null)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [provider, limit, minRating])

  return { reviews, loading, error }
}
