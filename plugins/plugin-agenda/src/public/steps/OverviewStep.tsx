import { Clock } from 'lucide-react'
import { DAY_NAMES, WEEK_ORDER } from '../format'
import type { BookingComponents, BookingFormatters, PublicBookingLabels, PublicService, ResolvedBookingBrand, WorkingHours } from '../types'

interface OverviewStepProps {
  services: PublicService[]
  servicesLoading: boolean
  businessHours: WorkingHours
  professionalName: string
  labels: PublicBookingLabels
  brand: ResolvedBookingBrand
  fmt: BookingFormatters
  components: BookingComponents
  onStartBooking: (serviceId?: string) => void
}

/** Default view: services + opening hours + sidebar CTA (Quaddro-style). */
export function OverviewStep({
  services, servicesLoading, businessHours, professionalName, labels, brand, fmt, components: C, onStartBooking,
}: OverviewStepProps) {
  const openDays = new Set(businessHours.daysOfWeek)
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="space-y-6">
        {/* Serviços */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-heading text-lg font-bold text-foreground">{labels.servicesHeading}</h3>
          <div className="space-y-3">
            {servicesLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
              ))
            ) : (
              services.map((s, i) => (
                <C.ServiceCard
                  key={s.id}
                  service={s}
                  featured={i === 0}
                  onSelect={() => onStartBooking(s.id)}
                  fmt={fmt}
                  brand={brand}
                />
              ))
            )}
          </div>
        </section>

        {/* Sobre — horário de funcionamento */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-heading text-lg font-bold text-foreground">{labels.aboutHeading}</h3>
          <p className="mt-3 mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" /> {labels.openingHoursHeading}
          </p>
          <ul className="divide-y divide-border border-l-2 border-primary/20 pl-4">
            {WEEK_ORDER.map((day) => {
              const open = openDays.has(day)
              return (
                <li key={day} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-foreground">{DAY_NAMES[day]}</span>
                  <span className={open ? 'tabular-nums text-foreground' : 'text-muted-foreground'}>
                    {open ? `${businessHours.start} – ${businessHours.end}` : labels.closedLabel}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      {/* Sidebar CTA + highlights */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <C.SidebarExtras
          professionalName={professionalName}
          brand={brand}
          labels={labels}
          onStartBooking={() => onStartBooking()}
        />
      </aside>
    </div>
  )
}
