import { ChevronRight, Clock } from 'lucide-react'
import type { ServiceCardProps } from '../types'

/** Default service row (overview list). Icon/badge/meta come from `brand`;
 *  swap the whole card via `components.ServiceCard`. */
export function DefaultServiceCard({ service, featured, onSelect, fmt, brand }: ServiceCardProps) {
  const Icon = brand.serviceIcon
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full items-center gap-4 rounded-2xl border border-border p-4 text-left transition-colors hover:border-primary hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{service.name}</span>
          {featured && brand.featuredBadge ? (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {brand.featuredBadge}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" /> {service.durationMinutes} min{brand.serviceMeta ? ` · ${brand.serviceMeta}` : ''}
        </span>
        {service.description ? (
          <span className="mt-1 block text-sm text-muted-foreground">{service.description}</span>
        ) : null}
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-semibold tabular-nums text-primary">{fmt.price.format(service.price)}</span>
        <ChevronRight className="ml-auto mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  )
}
