import * as React from 'react'
import { Check, Circle } from 'lucide-react'
import { cn } from '../utils/cn'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../primitives/card'
import { Button } from '../primitives/button'
import { renderIcon } from './icon'
import type { IconRef } from './types'

export interface OnboardingStepInput {
  id: string
  title: string
  description?: string
  icon?: IconRef
  /** Async check: resolves true when the step is already complete. */
  check?: () => Promise<boolean>
  /** Pre-resolved completion (takes precedence over `check`). */
  done?: boolean
  /** Route string (uses onNavigate) or a callback. */
  action?: string | (() => void)
  actionLabel?: string
}

export interface OnboardingWidgetProps {
  title?: string
  subtitle?: string
  steps: OnboardingStepInput[]
  onNavigate?: (path: string) => void
  /** Hide the whole widget once every step is complete. Default: true. */
  hideWhenComplete?: boolean
  className?: string
}

/** Getting-started checklist ("first steps to set up") with progress. */
export function OnboardingWidget({
  title = 'Getting started', subtitle, steps, onNavigate, hideWhenComplete = true, className,
}: OnboardingWidgetProps) {
  const [completed, setCompleted] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(steps.map((s) => [s.id, Boolean(s.done)])),
  )
  // Async checks start unresolved: don't paint until they settle, or an
  // already-onboarded tenant flashes the checklist for the query round-trip
  // before allDone hides it (mount → visible 0/N → resolve → null).
  const [resolved, setResolved] = React.useState(() => steps.every((s) => s.done != null || !s.check))

  React.useEffect(() => {
    let cancelled = false
    Promise.all(steps.map(async (s) => {
      if (s.done != null) return [s.id, s.done] as const
      if (!s.check) return [s.id, false] as const
      try { return [s.id, await s.check()] as const } catch { return [s.id, false] as const }
    })).then((entries) => {
      if (cancelled) return
      setCompleted(Object.fromEntries(entries))
      setResolved(true)
    })
    return () => { cancelled = true }
  }, [steps])

  const doneCount = steps.filter((s) => completed[s.id]).length
  const allDone = doneCount === steps.length
  if (!resolved) return null
  if (allDone && hideWhenComplete) return null

  const runAction = (action: OnboardingStepInput['action']) => {
    if (!action) return
    if (typeof action === 'string') onNavigate?.(action)
    else action()
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
        <div className="mt-2 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${steps.length ? (doneCount / steps.length) * 100 : 0}%` }} />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{doneCount}/{steps.length}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {steps.map((step) => {
          const isDone = completed[step.id]
          return (
            <div key={step.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50">
              <span className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-muted text-muted-foreground',
              )}>
                {isDone ? <Check className="h-4 w-4" /> : (renderIcon(step.icon, 'h-4 w-4') ?? <Circle className="h-4 w-4" />)}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-medium', isDone && 'text-muted-foreground line-through')}>{step.title}</p>
                {step.description ? <p className="truncate text-xs text-muted-foreground">{step.description}</p> : null}
              </div>
              {!isDone && step.action ? (
                <Button size="sm" variant="outline" onClick={() => runAction(step.action)}>
                  {step.actionLabel ?? 'Start'}
                </Button>
              ) : null}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
