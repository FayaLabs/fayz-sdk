import { useEffect, useState } from 'react'
import { useReputationContext } from '../context'
import type { ReviewSummary } from '../types'

export interface UseReviewSummaryResult {
  summary: ReviewSummary | null
  loading: boolean
  error: Error | null
}

/** Fetch the aggregate rating summary (average + count + distribution). */
export function useReviewSummary(): UseReviewSummaryResult {
  const { provider } = useReputationContext()
  const [summary, setSummary] = useState<ReviewSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    provider
      .getSummary()
      .then((result) => {
        if (!active) return
        setSummary(result)
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
  }, [provider])

  return { summary, loading, error }
}
