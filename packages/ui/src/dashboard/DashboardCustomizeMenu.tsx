import * as React from 'react'
import { SlidersHorizontal, RotateCcw } from 'lucide-react'
import type { DashboardWidgetDef } from '@fayz-ai/core'
import { useTranslation } from '@fayz-ai/core'
import { Button } from '../primitives/button'
import {
  Dropdown, DropdownTrigger, DropdownContent, DropdownLabel, DropdownSeparator, DropdownCheckboxItem, DropdownItem,
} from '../primitives/dropdown'

export interface DashboardCustomizeMenuProps {
  /** Full set of registered widgets for this surface. */
  widgets: DashboardWidgetDef[]
  /** Ids currently visible. */
  visibleIds: Set<string>
  onToggle: (widgetId: string, visible: boolean) => void
  onReset: () => void
  label?: string
}

/** Gear menu to choose which widgets appear on the dashboard (persisted). */
export function DashboardCustomizeMenu({ widgets, visibleIds, onToggle, onReset, label }: DashboardCustomizeMenuProps) {
  const t = useTranslation()
  if (widgets.length === 0) return null
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {label ?? 'Customize'}
        </Button>
      </DropdownTrigger>
      <DropdownContent align="end" className="max-h-[70vh] w-60 overflow-y-auto">
        <DropdownLabel>{label ?? 'Show widgets'}</DropdownLabel>
        <DropdownSeparator />
        {widgets.map((w) => (
          <DropdownCheckboxItem
            key={w.id}
            checked={visibleIds.has(w.id)}
            onCheckedChange={(checked) => onToggle(w.id, Boolean(checked))}
            onSelect={(e) => e.preventDefault()}
          >
            {t(w.title)}
          </DropdownCheckboxItem>
        ))}
        <DropdownSeparator />
        <DropdownItem onSelect={() => onReset()}>
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          {'Reset to defaults'}
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  )
}
