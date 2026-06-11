import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '../utils/cn'

type CheckboxColor = 'primary' | 'success' | 'warning' | 'destructive'

interface CheckboxProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  color?: CheckboxColor
  id?: string
}

const COLOR_CLASSES: Record<CheckboxColor, string> = {
  primary: 'border-primary bg-primary text-primary-foreground',
  success: 'border-success bg-success text-white dark:border-success dark:bg-success',
  warning: 'border-warning bg-warning text-white',
  destructive: 'border-destructive bg-destructive text-destructive-foreground',
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ checked = false, onChange, disabled, className, color = 'primary', id, ...props }, ref) => {
    return (
      <button
        ref={ref}
        id={id}
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'peer inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked
            ? `${COLOR_CLASSES[color]} shadow-sm`
            : 'border-muted-foreground/40 bg-background hover:border-muted-foreground/60',
          className,
        )}
        {...props}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </button>
    )
  },
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
export type { CheckboxColor, CheckboxProps }
