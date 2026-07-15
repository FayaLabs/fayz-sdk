import { Check } from 'lucide-react'
import type { StepRailItemProps } from '../types'

/** One row in the wizard's right-hand progress rail. */
export function DefaultStepRailItem({ n, label, state, children }: StepRailItemProps) {
  return (
    <li className="relative pl-11">
      <span aria-hidden className="absolute left-[15px] top-8 bottom-[-18px] w-px bg-border last:hidden" />
      <span
        className={[
          'absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
          state === 'done'
            ? 'bg-primary text-primary-foreground'
            : state === 'active'
              ? 'bg-accent text-primary ring-2 ring-primary'
              : 'bg-muted text-muted-foreground',
        ].join(' ')}
      >
        {state === 'done' ? <Check className="h-4 w-4" /> : n}
      </span>
      <p className={`pt-1 text-sm font-semibold ${state === 'todo' ? 'text-muted-foreground' : 'text-foreground'}`}>
        {label}
      </p>
      {children ? <div className="mt-2">{children}</div> : null}
    </li>
  )
}
