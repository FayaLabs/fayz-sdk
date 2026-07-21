import { useEffect, useState } from 'react'
import { useBooking } from './context'
import type { PublicService } from './types'
import type { PublicCreateBookingInput, PublicBookingResult } from './data'
import type { TimeSlot } from '../types'

/** The resolved bookable services (static option or fetched from the provider). */
export function useServices(): PublicService[] {
  return useBooking().services
}

export interface UsePublicServicesResult {
  services: PublicService[]
  loading: boolean
}

/** Like useServices, but exposes the fetch state for skeletons. */
export function usePublicServices(): UsePublicServicesResult {
  const { services, servicesLoading } = useBooking()
  return { services, loading: servicesLoading }
}

export interface UseAvailableSlotsResult {
  slots: TimeSlot[]
  loading: boolean
  error: Error | null
}

/**
 * Available time slots for a service on a given date. Delegates to
 * provider.getAvailableSlots — mock now, Supabase RPC when configured, same call.
 */
export function useAvailableSlots(params: { serviceId: string | null; date: string | null }): UseAvailableSlotsResult {
  const { provider, professionalId, services, window } = useBooking()
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const { serviceId, date } = params
  const service = services.find((s) => s.id === serviceId)
  const durationMinutes = service?.durationMinutes ?? 0

  useEffect(() => {
    let active = true
    if (!serviceId || !date || !durationMinutes) {
      setSlots([])
      return
    }
    setLoading(true)
    provider
      .getAvailableSlots({ assigneeId: professionalId, date, durationMinutes, slotInterval: window.slotInterval })
      .then((result) => {
        if (!active) return
        setSlots(result)
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
  }, [provider, professionalId, serviceId, date, durationMinutes, window.slotInterval])

  return { slots, loading, error }
}

export type CreatePublicBookingInput = PublicCreateBookingInput

export interface UseCreateBookingResult {
  submit: (input: CreatePublicBookingInput) => Promise<PublicBookingResult>
  submitting: boolean
  error: Error | null
  done: boolean
}

/** Create a booking via the provider (mock append / Supabase RPC). */
export function useCreateBooking(): UseCreateBookingResult {
  const { provider, professionalId } = useBooking()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [done, setDone] = useState(false)

  async function submit(input: CreatePublicBookingInput): Promise<PublicBookingResult> {
    setSubmitting(true)
    setError(null)
    try {
      // The professional the visitor saw availability for must be the one
      // booked — thread it unless the caller already pinned another.
      const result = await provider.createBooking({
        ...input,
        assigneeId: input.assigneeId ?? professionalId ?? null,
      })
      setDone(true)
      return result
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      throw e
    } finally {
      setSubmitting(false)
    }
  }

  return { submit, submitting, error, done }
}
