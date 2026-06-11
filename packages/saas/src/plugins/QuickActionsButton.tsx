import React, { useState, useRef, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@fayz/ui'
import { Button } from '@fayz/ui'
import { ICON_MAP } from '@fayz/ui'
import type { PluginQuickAction } from '@fayz/core'

/**
 * Quick actions button for plugin modules.
 * Shows a "+" button that opens a popover with contextual insert actions.
 * Reusable by any plugin.
 */
export function QuickActionsButton({ actions, className }: {
  actions: PluginQuickAction[]
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (actions.length === 0) return null

  return (
    <div ref={ref} className={cn('relative', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className={cn(open && 'bg-muted')}
      >
        <Plus className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-45')} />
        <span>New</span>
      </Button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-2 w-64 rounded-xl border bg-popover shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 origin-top-right">
          <div className="p-1.5">
            {actions.map((action) => {
              const Icon = action.icon ? (ICON_MAP[action.icon] ?? Plus) : Plus
              return (
                <button
                  key={action.id}
                  onClick={() => { action.action(); setOpen(false) }}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{action.label}</p>
                    {action.description && (
                      <p className="text-[10px] text-muted-foreground leading-tight">{action.description}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
