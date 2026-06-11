import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../utils/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium leading-[18px] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-muted text-muted-foreground',
        secondary: 'bg-muted text-muted-foreground',
        info: 'bg-info-soft text-info-soft-foreground',
        success: 'bg-success-soft text-success-soft-foreground',
        warning: 'bg-warning-soft text-warning-soft-foreground',
        destructive: 'bg-destructive-soft text-destructive-soft-foreground',
        magic: 'bg-magic-soft text-magic-soft-foreground',
        strong: 'bg-primary text-primary-foreground',
        outline: 'border border-border text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

const VARIANTS_WITH_DOT = new Set([
  'info',
  'success',
  'warning',
  'destructive',
  'magic',
])

const DOT_COLOR: Record<string, string> = {
  info: 'hsl(var(--info))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  destructive: 'hsl(var(--destructive))',
  magic: 'hsl(var(--magic))',
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  // Show a leading status dot. Defaults to true for status variants
  // (info/success/warning/destructive/magic), false for neutral/outline/strong.
  dot?: boolean
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  const v = variant ?? 'default'
  const showDot = dot ?? VARIANTS_WITH_DOT.has(v)
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {showDot && (
        <span
          className="inline-block size-1.5 rounded-full"
          style={{ background: DOT_COLOR[v] ?? 'currentColor' }}
        />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
