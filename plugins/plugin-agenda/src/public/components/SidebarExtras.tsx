import { User } from 'lucide-react'
import type { SidebarExtrasProps } from '../types'

/** Default overview sidebar: primary CTA + brand highlights + professional. */
export function DefaultSidebarExtras({ professionalName, brand, onStartBooking, labels }: SidebarExtrasProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <button
        type="button"
        onClick={onStartBooking}
        className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {labels.bookNowCta}
      </button>
      <div className="mt-5 space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
        {brand.highlights.map((h, i) => {
          const Icon = h.icon ?? User
          return (
            <p key={i} className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-primary" /> {h.text}
            </p>
          )
        })}
        <p className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-primary" /> {professionalName}
        </p>
      </div>
    </div>
  )
}
