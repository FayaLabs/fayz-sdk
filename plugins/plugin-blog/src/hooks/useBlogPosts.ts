import { useEffect, useState } from 'react'
import { useBlogContext } from '../context'
import type { BlogPost, BlogListQuery } from '../types'

export interface UseBlogPostsResult {
  posts: BlogPost[]
  loading: boolean
  error: Error | null
}

/**
 * Fetch the post list from the active blog provider. The host maps `posts` into
 * its own card markup; the plugin never dictates presentation.
 */
export function useBlogPosts(query?: BlogListQuery): UseBlogPostsResult {
  const { provider } = useBlogContext()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const limit = query?.limit
  const tag = query?.tag

  useEffect(() => {
    let active = true
    setLoading(true)
    provider
      .listPosts({ limit, tag })
      .then((result) => {
        if (!active) return
        setPosts(result)
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
  }, [provider, limit, tag])

  return { posts, loading, error }
}
