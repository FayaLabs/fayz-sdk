import { useEffect, useState } from 'react'
import { getShopProvider } from '@fayz-ai/shop/runtime'
import type { Product, ListProductsOptions } from '@fayz-ai/shop/types'

export function useProducts(opts: ListProductsOptions): {
  products: Product[]
  loading: boolean
  error: string | null
  reload: () => void
} {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const key = JSON.stringify(opts)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getShopProvider()
      .listProducts(JSON.parse(key) as ListProductsOptions)
      .then((data) => {
        if (cancelled) return
        setProducts(data)
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
  }, [key, nonce])

  return { products, loading, error, reload: () => setNonce((n) => n + 1) }
}
