import * as React from 'react'
import * as LucideIcons from 'lucide-react'
import type { IconRef } from './types'

/** Resolve an IconRef (lucide name or component) to a renderable element. */
export function renderIcon(icon: IconRef | undefined, className = 'h-4 w-4'): React.ReactNode {
  if (!icon) return null
  if (typeof icon === 'string') {
    const Comp = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[icon]
    return Comp ? React.createElement(Comp, { className }) : null
  }
  return React.createElement(icon, { className })
}
