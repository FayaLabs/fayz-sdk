import { ShieldCheck } from 'lucide-react'
import type { BrandHeaderProps } from '../types'

/** Default brand header shown above every booking view. Override via
 *  `components.BrandHeader` when the structure must change; text/logo-only
 *  changes need just the `brand` option. */
export function DefaultBrandHeader({ brand }: BrandHeaderProps) {
  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
      {brand.logoUrl ? (
        <img src={brand.logoUrl} alt={brand.name} className="h-11 w-11 rounded-xl object-cover" />
      ) : (
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
          {brand.initials}
        </span>
      )}
      <div>
        <p className="font-heading text-base font-bold text-foreground">{brand.name}</p>
        {brand.tagline ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> {brand.tagline}
          </p>
        ) : null}
      </div>
    </div>
  )
}
