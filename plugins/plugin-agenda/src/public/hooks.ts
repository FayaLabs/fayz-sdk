import { useEffect, useState } from 'react'
import { useBooking } from './context'
import type { PublicService, ContactInfo } from './types'
import type { TimeSlot } from '../types'

/** The configured bookable services (from context; POC-static, ERP-driven later). */
export function useServices(): PublicService[] {
  return useBooking().services
}

export interface UseAvailableSlotsResult {
  slots: TimeSlot[]
  loading: boolean
  error: Error | null
}

/**
 * Available time slots for a service on a given date. Delegates to
 * provider.getAvailableSlots — mock now, real availability later, same call.
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

export interface CreatePublicBookingInput {
  serviceId: string
  /** ISO datetime of the chosen slot start. */
  startsAt: string
  contact: ContactInfo
}

export interface UseCreateBookingResult {
  submit: (input: CreatePublicBookingInput) => Promise<void>
  submitting: boolean
  error: Error | null
  done: boolean
}

/** Create a booking via the provider. POC: mock append; real persistence later. */
export function useCreateBooking(): UseCreateBookingResult {
  const { provider, professionalId, services } = useBooking()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [done, setDone] = useState(false)

  async function submit(input: CreatePublicBookingInput): Promise<void> {
    const service = services.find((s) => s.id === input.serviceId)
    if (!service) throw new Error('Serviço inválido')
    setSubmitting(true)
    setError(null)
    try {
      await provider.createBooking({
        kind: 'appointment',
        // POC: the customer is captured as the booking title; a real flow would
        // upsert a client/person record and pass its id here.
        clientId: 'public-guest',
        professionalId,
        startsAt: input.startsAt,
        title: input.contact.name,
        notes: [input.contact.phone, input.contact.email, input.contact.notes].filter(Boolean).join(' · ') || undefined,
        services: [
          {
            serviceId: service.id,
            name: service.name,
            durationMinutes: service.durationMinutes,
            price: service.price,
            assigneeId: professionalId,
          },
        ],
      })
      setDone(true)
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
