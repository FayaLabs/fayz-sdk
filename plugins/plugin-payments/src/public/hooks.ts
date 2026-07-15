import { useCallback, useEffect, useRef, useState } from 'react'
import type { CreateChargeInput, PixCharge, ChargeStatus } from '@fayz-ai/core'
import { usePaymentContext } from './context'

export interface UsePixChargeResult {
  charge: PixCharge | null
  creating: boolean
  error: Error | null
  create: (input: CreateChargeInput) => Promise<PixCharge | null>
  reset: () => void
}

/**
 * Create a Pix charge on demand. For a standalone checkout page; the booking
 * widget uses its own injected provider directly (agenda depends only on core).
 */
export function usePixCharge(): UsePixChargeResult {
  const { provider } = usePaymentContext()
  const [charge, setCharge] = useState<PixCharge | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const create = useCallback(
    async (input: CreateChargeInput) => {
      setCreating(true)
      setError(null)
      try {
        const c = await provider.createCharge(input)
        setCharge(c)
        return c
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
        return null
      } finally {
        setCreating(false)
      }
    },
    [provider],
  )

  const reset = useCallback(() => {
    setCharge(null)
    setError(null)
  }, [])

  return { charge, creating, error, create, reset }
}

/**
 * Poll a charge's status until it settles. Cleans the interval on unmount,
 * chargeId change, and terminal states.
 */
export function useChargeStatus(chargeId: string | null, intervalMs = 2500): ChargeStatus | null {
  const { provider } = usePaymentContext()
  const [status, setStatus] = useState<ChargeStatus | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let active = true
    setStatus(null)
    if (!chargeId) return

    const clear = () => {
      if (timer.current) { clearInterval(timer.current); timer.current = null }
    }
    const tick = () => {
      provider
        .getChargeStatus(chargeId)
        .then((s) => {
          if (!active) return
          setStatus(s)
          if (s === 'paid' || s === 'expired' || s === 'failed') clear()
        })
        .catch(() => { /* keep polling on transient errors */ })
    }
    tick()
    timer.current = setInterval(tick, intervalMs)
    return () => { active = false; clear() }
  }, [provider, chargeId, intervalMs])

  return status
}
