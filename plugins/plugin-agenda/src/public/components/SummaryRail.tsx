import { CreditCard } from 'lucide-react'
import { formatSlotRange } from '../format'
import type {
  BookingComponents,
  BookingFormatters,
  PublicBookingLabels,
  PublicService,
  ResolvedPayment,
  StepState,
} from '../types'

export interface RailState {
  service: StepState
  professional: StepState
  datetime: StepState
  contact: StepState
  payment: StepState
}

interface SummaryRailProps {
  title: string
  railState: RailState
  service: PublicService | null
  professionalName: string
  slotStart: string | null
  /** Display string for the verified contact ("Nome · +55 (11) …"), or null. */
  contactSummary: string | null
  payment: ResolvedPayment | null
  paymentReached: boolean
  labels: PublicBookingLabels
  fmt: BookingFormatters
  components: BookingComponents
  serviceMeta: string | null
}

/** Right-hand progress + summary rail (internal; rows via components.StepRailItem). */
export function SummaryRail({
  title, railState, service, professionalName, slotStart, contactSummary,
  payment, paymentReached, labels, fmt, components: C, serviceMeta,
}: SummaryRailProps) {
  return (
    <div className="sticky top-24 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="mb-5 font-heading text-sm font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ol className="space-y-6">
        <C.StepRailItem n={1} label={labels.railService} state={railState.service}>
          {service ? (
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="truncate text-sm font-semibold text-foreground">{service.name}</p>
              <p className="mt-0.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>{serviceMeta ? `${serviceMeta} · ` : ''}{service.durationMinutes} min</span>
                <span className="font-semibold tabular-nums text-primary">{fmt.price.format(service.price)}</span>
              </p>
            </div>
          ) : null}
        </C.StepRailItem>

        <C.StepRailItem n={2} label={labels.railProfessional} state={railState.professional}>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {professionalName.charAt(0)}
            </span>
            <span className="text-sm text-foreground">{professionalName}</span>
          </div>
        </C.StepRailItem>

        <C.StepRailItem n={3} label={labels.railDatetime} state={railState.datetime}>
          {slotStart && service ? (
            <p className="text-sm tabular-nums text-foreground">
              {formatSlotRange(slotStart, service.durationMinutes, fmt)}
            </p>
          ) : null}
        </C.StepRailItem>

        <C.StepRailItem n={4} label={labels.railContact} state={railState.contact}>
          {contactSummary ? <p className="text-sm text-foreground">{contactSummary}</p> : null}
        </C.StepRailItem>

        {payment ? (
          <C.StepRailItem n={5} label={labels.railPayment} state={railState.payment}>
            {paymentReached ? (
              <p className="flex items-center gap-1.5 text-sm text-foreground">
                <CreditCard className="h-3.5 w-3.5 text-primary" /> Pix à vista
              </p>
            ) : null}
          </C.StepRailItem>
        ) : null}
      </ol>
    </div>
  )
}
