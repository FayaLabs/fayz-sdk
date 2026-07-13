import { createElement, type FC, type ReactNode } from 'react'
import { CalendarCheck, ShieldCheck, Video } from 'lucide-react'
import type { PluginManifest, PluginScope, VerticalId, PaymentProvider } from '@fayz-ai/core'
import { createSafeDataProvider } from '@fayz-ai/core'
import type { Professional, Schedule } from '../types'
import type { MockAgendaSeed } from '../data/mock'
import { createMockPublicBookingProvider, type PublicBookingDataProvider } from './data'
import { createSupabasePublicBookingProvider } from './data.supabase'
import { BookingProvider, type PublicBookingContextValue, type OnIdentityVerified } from './context'
import { BookingWidget } from './BookingWidget'
import { DEFAULT_BOOKING_COMPONENTS } from './components/defaults'
import type {
  BookingBrand,
  BookingComponents,
  BookingWindow,
  PaymentConfig,
  PublicBookingLabels,
  PublicService,
  ResolvedBookingBrand,
  ResolvedPayment,
  WorkingHours,
} from './types'

export interface PublicBookingOptions {
  /** Mount path for the public booking route. Default '/agendar'. */
  basePath?: string
  /**
   * Tenant this public page books against. REQUIRED when a Supabase client is
   * configured (setGlobalSupabaseClient) — it scopes services/slots/bookings.
   */
  tenantId?: string
  /**
   * The single professional/resource bookings target. With Supabase this must
   * be the staff person UUID; omit → any active professional (RPC unions
   * schedules across staff).
   */
  professional?: { id?: string; name?: string }
  /**
   * Bookable services. Optional: when omitted, the widget fetches the catalog
   * from the provider (Supabase v_public_services). Static wins when provided.
   */
  services?: PublicService[]
  /** Working hours used to seed mock availability + the overview "Sobre" card. */
  workingHours?: WorkingHours
  /** Booking-window bounds for the date/slot picker. */
  window?: Partial<BookingWindow>
  /** Every user-visible string (all defaulted, pt-BR). */
  labels?: Partial<PublicBookingLabels>
  /** Brand personalization: name/logo/tagline/icons/badges/highlights. */
  brand?: BookingBrand
  /** Swap whole subcomponents when structure must change (defaults exported). */
  components?: Partial<BookingComponents>
  /** Adds a final Pagamento (Pix) step. Omit/disable to end the flow at confirmation. */
  payment?: PaymentConfig
  /** Charge provider (from a payments plugin) used by the Pagamento step. Optional. */
  paymentProvider?: PaymentProvider
  /** Host bridge: fired when the customer's phone is verified / details submitted. */
  onIdentityVerified?: OnIdentityVerified
  currency?: string
  locale?: string
  /** Inject a custom provider (overrides the mock/Supabase safe resolver). */
  dataProvider?: PublicBookingDataProvider
  /** Override the full mock seed (advanced). */
  seed?: MockAgendaSeed
  scope?: PluginScope
  verticalId?: VerticalId
}

export interface PublicBookingPlugin {
  manifest: PluginManifest
  Provider: FC<{ children: ReactNode }>
  dataProvider: PublicBookingDataProvider
}

const DEFAULT_LABELS: PublicBookingLabels = {
  title: 'Agende sua consulta',
  serviceStep: 'Escolha o serviço',
  dateStep: 'Escolha a data',
  contactStep: 'Seus dados',
  confirmCta: 'Confirmar agendamento',
  successTitle: 'Agendamento confirmado!',
  successBody: 'Você receberá os detalhes em breve. Até logo!',
  // overview
  servicesHeading: 'Serviços',
  aboutHeading: 'Sobre',
  openingHoursHeading: 'Horário de funcionamento',
  closedLabel: 'Fechado',
  bookNowCta: 'Agendar agora',
  // datetime
  timezoneNote: 'Fuso: Horário de Brasília',
  slotsHeading: 'Horários disponíveis',
  noSlots: 'Nenhum horário disponível neste dia. Tente outra data.',
  continueCta: 'Continuar',
  backToServices: 'Serviços',
  back: 'Voltar',
  prevWeek: 'Semana anterior',
  nextWeek: 'Próxima semana',
  // contact
  contactIntro: 'Preencha as informações abaixo para que seu agendamento seja identificado.',
  phoneLabel: 'Celular',
  phoneHint:
    'Enviaremos um código para confirmar que o número de telefone é seu. Usaremos este número para associar as suas informações à sua conta.',
  sendCodeCta: 'Enviar código via WhatsApp',
  codeTitle: 'Insira o código',
  codeBody: 'Enviamos um código via WhatsApp para você confirmar seu número.',
  codeInvalid: 'Código inválido. Para testar, use 0000.',
  codeConfirmCta: 'Confirmar',
  codeResendHint: 'Reenviar código via WhatsApp em 28 segundos.',
  phoneVerified: 'Celular verificado',
  changePhone: 'Trocar telefone',
  nameLabel: 'Nome completo *',
  namePlaceholder: 'Seu nome',
  emailLabel: 'E-mail',
  emailPlaceholder: 'voce@email.com',
  emailHint: 'Enviaremos uma confirmação e um lembrete antes do agendamento.',
  notesLabel: 'Observação',
  notesPlaceholder: 'Use esse espaço para deixar uma observação sobre este agendamento',
  saveAndContinueCta: 'Salvar e continuar',
  submitError: 'Não foi possível concluir o agendamento. Tente novamente.',
  noChargeNote: 'Pagamento via Pix · Sem cobrança agora',
  // right rail
  railTitle: 'Passos para agendar',
  railWaitingPayment: 'Aguardando pagamento',
  railService: 'Serviço',
  railProfessional: 'Profissional',
  railDatetime: 'Data e horário',
  railContact: 'Informações pessoais',
  railPayment: 'Pagamento',
}

const DEFAULT_WINDOW: BookingWindow = { minAdvanceHours: 2, maxAdvanceDays: 21, slotInterval: 30 }

const DEFAULT_HOURS: WorkingHours = { daysOfWeek: [1, 2, 3, 4, 5, 6], start: '09:00', end: '18:00' }

function resolveBrand(brand: BookingBrand | undefined, labels: PublicBookingLabels): ResolvedBookingBrand {
  const name = brand?.name ?? labels.title
  return {
    name,
    initials: brand?.initials ?? name.charAt(0).toUpperCase(),
    logoUrl: brand?.logoUrl,
    tagline: brand?.tagline === undefined ? 'Agendamento online seguro' : brand.tagline,
    serviceIcon: brand?.serviceIcon ?? Video,
    serviceMeta: brand?.serviceMeta === undefined ? 'Online' : brand.serviceMeta,
    featuredBadge: brand?.featuredBadge === undefined ? 'Mais procurado' : brand.featuredBadge,
    highlights: brand?.highlights ?? [
      { icon: CalendarCheck, text: 'Confirmação imediata' },
      { icon: ShieldCheck, text: 'Agendamento seguro' },
    ],
  }
}

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
  // Mock needs a concrete seed professional; Supabase can target any (null).
  const mockProfessionalId = options.professional?.id ?? 'pro-1'
  const professionalId = options.professional?.id ?? null
  const professionalName = options.professional?.name ?? 'Especialista'
  const window: BookingWindow = { ...DEFAULT_WINDOW, ...options.window }
  const labels: PublicBookingLabels = { ...DEFAULT_LABELS, ...options.labels }
  const brand = resolveBrand(options.brand, labels)
  const components: BookingComponents = { ...DEFAULT_BOOKING_COMPONENTS, ...options.components }
  const currency = options.currency ?? 'BRL'
  const locale = options.locale ?? 'pt-BR'
  const hours = options.workingHours ?? DEFAULT_HOURS
  const staticServices = options.services ?? null
  const payment: ResolvedPayment | null = options.payment?.enabled
    ? {
        reservationFeePercent: options.payment.reservationFeePercent ?? 100,
        method: options.payment.method ?? 'pix',
      }
    : null

  const professional: Professional = {
    id: mockProfessionalId,
    name: professionalName,
    avatarUrl: null,
    locationId: null,
    locationName: null,
    isActive: true,
  }
  const mockSeed: MockAgendaSeed = options.seed ?? {
    professionals: [professional],
    schedules: buildSchedules(mockProfessionalId, hours),
    bookings: [],
  }

  const provider =
    options.dataProvider ??
    createSafeDataProvider<PublicBookingDataProvider>(
      () => {
        if (!options.tenantId) {
          throw new Error(
            '[plugin-agenda/public] `tenantId` is required when a Supabase client is configured (setGlobalSupabaseClient).',
          )
        }
        return createSupabasePublicBookingProvider({ tenantId: options.tenantId })
      },
      () =>
        createMockPublicBookingProvider({
          seed: mockSeed,
          services: staticServices ?? [],
          professionalId: mockProfessionalId,
        }),
    )

  const base: Omit<PublicBookingContextValue, 'services' | 'servicesLoading'> = {
    provider,
    professionalId,
    professionalName,
    businessHours: hours,
    payment,
    paymentProvider: options.paymentProvider ?? null,
    onIdentityVerified: options.onIdentityVerified ?? null,
    window,
    labels,
    brand,
    components,
    currency,
    locale,
  }
  const Provider: FC<{ children: ReactNode }> = ({ children }) =>
    createElement(BookingProvider, { base, staticServices, children })
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
    version: '0.3.0',
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
