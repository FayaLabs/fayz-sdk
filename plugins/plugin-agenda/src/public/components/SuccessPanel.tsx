import { Calendar, Check, User } from 'lucide-react'
import { formatSlotRange } from '../format'
import type { SuccessPanelProps } from '../types'

/** Default confirmation panel (final step). */
export function DefaultSuccessPanel({ service, slotStart, professionalName, labels, fmt }: SuccessPanelProps) {
  return (
    <div className="py-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary">
        <Check className="h-8 w-8" />
      </div>
      <h3 className="font-heading text-2xl font-bold text-foreground">{labels.successTitle}</h3>
      <p className="mx-auto mt-2 max-w-sm text-muted-foreground">{labels.successBody}</p>
      {service && slotStart ? (
        <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-border bg-muted/50 p-4 text-left">
          <p className="font-semibold text-foreground">{service.name}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
            <Calendar className="h-4 w-4 text-primary" /> {formatSlotRange(slotStart, service.durationMinutes, fmt)}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="h-4 w-4 text-primary" /> {professionalName}
          </p>
        </div>
      ) : null}
    </div>
  )
}
