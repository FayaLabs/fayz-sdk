import * as React from 'react'
import type { LoginAmbassador } from './types'

/**
 * Social-proof "ambassador" strip for the split-login brand panel. Restores
 * (modernized) the old login avatar cluster: a short row of small, softly
 * overlapping circular portraits sitting just above the tagline, optionally
 * followed by a microtext label ("+2 mil profissionais").
 *
 * Small (40px), subtle, no flashy motion — a very gentle idle float only, which
 * fully disables under prefers-reduced-motion. Degrades to nothing when no
 * usable images are supplied, so it is always safe to render. Purely
 * presentational — never touches the auth flow.
 */

const FLOAT_STYLES = `
@keyframes fayz-amb-drift {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}
@media (prefers-reduced-motion: reduce) {
  .fayz-amb-avatar { animation: none !important; }
}
`

export interface AmbassadorBubblesProps {
  ambassadors?: LoginAmbassador[]
  /** Optional social-proof caption shown beside the avatars, e.g. "+2 mil profissionais". */
  label?: string
}

export function AmbassadorBubbles({ ambassadors, label }: AmbassadorBubblesProps) {
  const items = (ambassadors ?? []).filter((a) => a && typeof a.image === 'string' && a.image.trim() !== '')
  if (items.length === 0) return null
  const shown = items.slice(0, 5)

  return (
    <div className="flex items-center gap-3">
      <style>{FLOAT_STYLES}</style>
      <div className="flex -space-x-2">
        {shown.map((ambassador, index) => (
          <div
            key={`${ambassador.name}-${index}`}
            title={ambassador.role ? `${ambassador.name} · ${ambassador.role}` : ambassador.name}
            className="fayz-amb-avatar relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-sidebar bg-sidebar-accent shadow-md ring-1 ring-sidebar-foreground/10 transition-transform duration-200 hover:z-10 hover:scale-110"
            style={{ animation: `fayz-amb-drift 4s ease-in-out ${index * 0.4}s infinite` }}
          >
            <img
              src={ambassador.image}
              alt={ambassador.name}
              className="h-full w-full object-cover"
              loading="lazy"
              draggable={false}
            />
          </div>
        ))}
      </div>
      {label ? <p className="text-xs font-medium text-sidebar-foreground/80">{label}</p> : null}
    </div>
  )
}
