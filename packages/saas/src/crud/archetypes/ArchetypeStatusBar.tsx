import React from 'react'
import { Badge } from '@fayz-ai/ui'

interface ArchetypeStatusBarProps {
  isActive?: boolean
  status?: string
  onActiveChange?: (active: boolean) => void
  onStatusChange?: (status: string) => void
  statusOptions?: string[]
}

export function ArchetypeStatusBar({ isActive, status, onActiveChange, onStatusChange, statusOptions }: ArchetypeStatusBarProps) {
  const hasActive = isActive !== undefined && onActiveChange
  const hasStatus = status !== undefined && onStatusChange && statusOptions

  if (!hasActive && !hasStatus) return null

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2.5">
      {hasActive && (
        <button
          type="button"
          onClick={() => onActiveChange(!isActive)}
          className="flex items-center gap-2 text-sm"
        >
          <div className={`h-2.5 w-2.5 rounded-full transition-colors ${isActive ? 'bg-success' : 'bg-muted-foreground/40'}`} />
          <span className={`font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </button>
      )}

      {hasActive && hasStatus && (
        <div className="h-4 w-px bg-border" />
      )}

      {hasStatus && (
        <div className="flex items-center gap-2">
          {statusOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onStatusChange(opt)}
              className="focus:outline-none"
            >
              <Badge
                variant={status === opt ? 'default' : 'secondary'}
                className={`cursor-pointer transition-all text-xs ${status === opt ? '' : 'opacity-50 hover:opacity-80'}`}
              >
                {opt.charAt(0).toUpperCase() + opt.slice(1).replace(/_/g, ' ')}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
