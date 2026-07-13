import { createElement, type FC, type ReactNode } from 'react'
import type { PluginManifest, PluginScope, VerticalId, PaymentProvider } from '@fayz-ai/core'
import { createSafeDataProvider } from '@fayz-ai/core'
import type { AgendaDataProvider } from '../data/types'
import type { Professional, Schedule } from '../types'
import { createMockAgendaProvider, type MockAgendaSeed } from '../data/mock'
import { createSupabaseAgendaProvider } from '../data/supabase'
import { BookingProvider, type PublicBookingContextValue, type OnIdentityVerified } from './context'
import { BookingWidget } from './BookingWidget'
import type { PublicService, BookingWindow, PublicBookingLabels, WorkingHours, PaymentConfig, ResolvedPayment } from './types'

export interface PublicBookingOptions {
  /** Mount path for the public booking route. Default '/agendar'. */
  basePath?: string
  /** The single professional/resource bookings target (POC). */
  professional?: { id?: string; name?: string }
  /** Bookable services shown in the widget. */
  services: PublicService[]
  /** Working hours used to seed the mock provider's availability. */
  workingHours?: WorkingHours
  /** Booking-window bounds for the date/slot picker. */
  window?: Partial<BookingWindow>
  labels?: Partial<PublicBookingLabels>
  /** Adds a final Pagamento (Pix) step. Omit/disable to end the flow at confirmation. */
  payment?: PaymentConfig
  /** Charge provider (from a payments plugin) used by the Pagamento step. Optional. */
  paymentProvider?: PaymentProvider
  /** Host bridge: fired when the customer's phone is verified / details submitted. */
  onIdentityVerified?: OnIdentityVerified
  currency?: string
  locale?: string
  /** Inject a custom provider (real availability). Overrides the safe resolver. */
  dataProvider?: AgendaDataProvider
  /** Override the full mock seed (advanced). */
  seed?: MockAgendaSeed
  scope?: PluginScope
  verticalId?: VerticalId
}

export interface PublicBookingPlugin {
  manifest: PluginManifest
  Provider: FC<{ children: ReactNode }>
  dataProvider: AgendaDataProvider
}

const DEFAULT_LABELS: PublicBookingLabels = {
  title: 'Agende sua consulta',
  serviceStep: 'Escolha o serviço',
  dateStep: 'Escolha a data',
  contactStep: 'Seus dados',
  confirmCta: 'Confirmar agendamento',
  successTitle: 'Agendamento confirmado!',
  successBody: 'Você receberá os detalhes em breve. Até logo!',
}

const DEFAULT_WINDOW: BookingWindow = { minAdvanceHours: 2, maxAdvanceDays: 21, slotInterval: 30 }

const DEFAULT_HOURS: WorkingHours = { daysOfWeek: [1, 2, 3, 4, 5, 6], start: '09:00', end: '18:00' }

let scheduleId = 0

function buildSchedules(professionalId: string, hours: WorkingHours): Schedule[] {
  return hours.daysOfWeek.map((day) => ({
    id: `sched-${professionalId}-${day}-${scheduleId++}`,
    tenantId: 'public',
    kind: 'working_hours',
    assigneeId: professionalId,
    locationId: null,
    dayOfWeek: day,
    specificDate: null,
    startsAt: hours.start,
    endsAt: hours.end,
    isActive: true,
    metadata: {},
  }))
}

export function createPublicBookingPlugin(options: PublicBookingOptions): PublicBookingPlugin {
  const basePath = options.basePath ?? '/agendar'
  const professionalId = options.professional?.id ?? 'dr-hiago'
  const professionalName = options.professional?.name ?? 'Especialista'
  const window: BookingWindow = { ...DEFAULT_WINDOW, ...options.window }
  const labels: PublicBookingLabels = { ...DEFAULT_LABELS, ...options.labels }
  const currency = options.currency ?? 'BRL'
  const locale = options.locale ?? 'pt-BR'
  const hours = options.workingHours ?? DEFAULT_HOURS
  const payment: ResolvedPayment | null = options.payment?.enabled
    ? {
        reservationFeePercent: options.payment.reservationFeePercent ?? 100,
        method: options.payment.method ?? 'pix',
      }
    : null

  const professional: Professional = {
    id: professionalId,
    name: professionalName,
    avatarUrl: null,
    locationId: null,
    locationName: null,
    isActive: true,
  }
  const mockSeed: MockAgendaSeed = options.seed ?? {
    professionals: [professional],
    schedules: buildSchedules(professionalId, hours),
    bookings: [],
  }

  const provider =
    options.dataProvider ??
    createSafeDataProvider(
      () => createSupabaseAgendaProvider(),
      () => createMockAgendaProvider({ seed: mockSeed }),
    )

  const value: PublicBookingContextValue = {
    provider,
    professionalId,
    professionalName,
    services: options.services,
    businessHours: hours,
    payment,
    paymentProvider: options.paymentProvider ?? null,
    onIdentityVerified: options.onIdentityVerified ?? null,
    window,
    labels,
    currency,
    locale,
  }
  const Provider: FC<{ children: ReactNode }> = ({ children }) =>
    createElement(BookingProvider, { value, children })
  Provider.displayName = 'PublicBookingProvider'

  const BookingScreen: FC<unknown> = () =>
    createElement('section', { className: 'py-16 bg-background' },
      createElement('div', { className: 'container mx-auto px-6' },
        createElement(BookingWidget)))
  BookingScreen.displayName = 'BookingScreen'

  const manifest: PluginManifest = {
    id: 'booking',
    name: 'Agendamento',
    icon: 'CalendarCheck',
    version: '0.1.0',
    scope: options.scope ?? 'universal',
    verticalId: options.verticalId,
    scaffolds: ['website', 'landing_page'],
    defaultEnabled: true,
    dependencies: [],
    navigation: [],
    routes: [{ path: basePath, component: BookingScreen, guard: 'public' }],
    widgets: [],
  }

  return { manifest, Provider, dataProvider: provider }
}
