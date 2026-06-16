import { useCallback, useEffect, useState } from 'react'
import { getShopProvider } from '@fayz-ai/shop/runtime'
import type { Order } from '@fayz-ai/shop/types'
import { useSessionStore } from '../stores/session.store'

export function useMyOrders(): { orders: Order[]; loading: boolean; refresh: () => void } {
  const customerId = useSessionStore((s) => s.customerId)
  const email = useSessionStore((s) => s.email)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    if (!customerId && !email) {
      setOrders([])
      setLoading(false)
      return
    }
    setLoading(true)
    // Scope by customerId (RLS-enforced to the owner on Supabase) when available;
    // fall back to email only for legacy sessions without a linked customer.
    const query = customerId ? { customerId, limit: 50 } : { customerEmail: email!, limit: 50 }
    getShopProvider()
      .listOrders(query)
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
  }, [customerId, email, tick])

  return { orders, loading, refresh }
}
