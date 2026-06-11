import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../utils/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-button text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Polaris primary — near-black brand with the stronger primary bevel
        default:
          'bg-primary text-primary-foreground border border-primary shadow-button-primary hover:bg-primary/90 active:shadow-button-inset',
        destructive:
          'bg-destructive text-destructive-foreground border border-destructive shadow-button-primary hover:bg-destructive/90 active:shadow-button-inset',
        // Default/secondary surface — white with hairline + bevel
        outline:
          'border border-border bg-card text-foreground shadow-button hover:bg-muted active:shadow-button-inset',
        secondary:
          'border border-border bg-card text-foreground shadow-button hover:bg-muted active:shadow-button-inset',
        ghost: 'hover:bg-muted hover:text-foreground',
        link: 'text-info underline-offset-4 hover:underline',
      },
      size: {
        // Polaris button sizes: md 30px, sm 26px, lg 36px
        default: 'h-[30px] px-3 py-1',
        sm: 'h-[26px] rounded-button px-2.5 text-xs',
        lg: 'h-9 rounded-button px-4 text-sm',
        icon: 'h-[30px] w-[30px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
