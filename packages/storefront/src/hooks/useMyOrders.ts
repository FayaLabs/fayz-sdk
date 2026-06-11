import { useCallback, useEffect, useState } from 'react'
import { getShopProvider } from '@fayz/shop'
import type { Order } from '@fayz/shop'
import { useSessionStore } from '../stores/session.store'

export function useMyOrders(): { orders: Order[]; loading: boolean; refresh: () => void } {
  const email = useSessionStore((s) => s.email)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    if (!email) {
      setOrders([])
      setLoading(false)
      return
    }
    setLoading(true)
    getShopProvider()
      .listOrders({ customerEmail: email, limit: 50 })
      .then((data) => {
        if (!cancelled) setOrders(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [email, tick])

  return { orders, loading, refresh }
}
