import { useEffect, useState } from 'react'
import { useBlogContext } from '../context'
import type { BlogPost } from '../types'

export interface UsePostResult {
  post: BlogPost | null
  loading: boolean
  error: Error | null
}

/** Fetch a single post by slug from the active blog provider. */
export function usePost(slug: string | undefined): UsePostResult {
  const { provider } = useBlogContext()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let active = true
    if (!slug) {
      setPost(null)
      setLoading(false)
      return
    }
    setLoading(true)
    provider
      .getPost(slug)
      .then((result) => {
        if (!active) return
        setPost(result)
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
  }, [provider, slug])

  return { post, loading, error }
}
