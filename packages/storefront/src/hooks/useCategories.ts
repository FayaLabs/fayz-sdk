import { useEffect, useState } from 'react'
import { getShopProvider } from '@fayz/shop'
import type { Category } from '@fayz/shop'

export function useCategories(): { categories: Category[]; loading: boolean } {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getShopProvider()
      .listCategories()
      .then((data) => {
        if (!cancelled) setCategories(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { categories, loading }
}
