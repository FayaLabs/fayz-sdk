import * as React from 'react'
import { cn } from '../utils/cn'

export interface GoldCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Brand-colored hero variant — `bg-primary text-primary-foreground` with a
   * soft branded shadow. Use for the headline card (e.g. a balance hero). When
   * false (default) it's a plain surface card (`bg-card` + border).
   */
  branded?: boolean
}

/**
 * GoldCard — a generic, reusable rounded card wrapper for dashboard surfaces.
 *
 * The `branded` variant paints the card in the app's primary color so a single
 * hero (balance, headline KPI, CTA) pops against the neutral grid. Both variants
 * are internally full-width so they reflow cleanly inside the responsive
 * DashboardGrid (full-width on mobile, cell-width on desktop).
 */
export const GoldCard = React.forwardRef<HTMLDivElement, GoldCardProps>(
  ({ branded = false, className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'h-full rounded-3xl p-5',
        branded
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
          : 'border border-border bg-card text-card-foreground shadow-sm',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  ),
)
GoldCard.displayName = 'GoldCard'
