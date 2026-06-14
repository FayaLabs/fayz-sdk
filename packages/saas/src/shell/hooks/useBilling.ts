import { useCallback, useMemo } from 'react'
import { useBillingStore } from '../stores/billing.store'
import { getSupabaseClient } from '../lib/supabase'
import type { PlanInterval } from '../types'

export function useBilling() {
  const store = useBillingStore()

  const fetchPlans = useCallback(async () => {
    store.setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('prices->monthly', { ascending: true })

      if (error) throw error
      store.setPlans(data ?? [])
    } catch (err) {
      console.error('Failed to fetch plans:', err)
    } finally {
      store.setLoading(false)
    }
  }, [store])

  const fetchSubscription = useCallback(async () => {
    store.setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') throw error
      store.setSubscription(data ?? null)
    } catch (err) {
      console.error('Failed to fetch subscription:', err)
    } finally {
      store.setLoading(false)
    }
  }, [store])

  const fetchInvoices = useCallback(async () => {
    store.setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      store.setInvoices(data ?? [])
    } catch (err) {
      console.error('Failed to fetch invoices:', err)
    } finally {
      store.setLoading(false)
    }
  }, [store])

  const subscribe = useCallback(
    async (planId: string, interval: PlanInterval) => {
      store.setLoading(true)
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase.functions.invoke(
          'create-checkout',
          { body: { planId, interval } }
        )

        if (error) throw error
        if (data?.url) {
          window.location.href = data.url
        }
      } catch (err) {
        console.error('Failed to create checkout session:', err)
        throw err
      } finally {
        store.setLoading(false)
      }
    },
    [store]
  )

  const cancelSubscription = useCallback(async () => {
    store.setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.functions.invoke(
        'cancel-subscription',
        { body: {} }
      )

      if (error) throw error
      await fetchSubscription()
    } catch (err) {
      console.error('Failed to cancel subscription:', err)
      throw err
    } finally {
      store.setLoading(false)
    }
  }, [store, fetchSubscription])

  const resumeSubscription = useCallback(async () => {
    store.setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.functions.invoke(
        'resume-subscription',
        { body: {} }
      )

      if (error) throw error
      await fetchSubscription()
    } catch (err) {
      console.error('Failed to resume subscription:', err)
      throw err
    } finally {
      store.setLoading(false)
    }
  }, [store, fetchSubscription])

  return useMemo(
    () => ({
      subscription: store.subscription,
      invoices: store.invoices,
      plans: store.plans,
      loading: store.loading,
      fetchPlans,
      fetchSubscription,
      fetchInvoices,
      subscribe,
      cancelSubscription,
      resumeSubscription,
    }),
    [
      store.subscription,
      store.invoices,
      store.plans,
      store.loading,
      fetchPlans,
      fetchSubscription,
      fetchInvoices,
      subscribe,
      cancelSubscription,
      resumeSubscription,
    ]
  )
}
