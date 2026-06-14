import { useEffect, useState } from 'react'
import { getShopProvider } from '@fayz-ai/shop/runtime'
import type { Product } from '@fayz-ai/shop/types'

export function useProduct(slug: string): {
  product: Product | null
  loading: boolean
  error: string | null
} {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getShopProvider()
      .listProducts({ slug, status: 'active', limit: 1 })
      .then((data) => {
        if (cancelled) return
        setProduct(data[0] ?? null)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  return { product, loading, error }
}
