import React from 'react'
import { Settings } from 'lucide-react'
import { Button } from '@fayz-ai/ui'
import type { PluginQuickAction } from '@fayz-ai/core'
import { QuickActionsButton } from './QuickActionsButton'

/**
 * ModuleActionBar — the single, standard top-right action area for every plugin
 * module page. Pass it straight to `ModulePage`'s `headerAction` prop.
 *
 * Owns the two things every module's header repeated by hand:
 *  - a primary "New" action (rendered via QuickActionsButton, which adapts its
 *    variant to the layout: solid in `tabs` products, outline in `rail`),
 *  - a settings gear that deep-links into the central Settings area.
 *
 * Plugins stop hand-rolling `<div className="flex gap-2">…gear…</div>` blocks:
 *   headerAction={<ModuleActionBar quickActions={quickActions} settingsPath="/settings/crm" />}
 */
export function ModuleActionBar({
  quickActions,
  settingsPath,
  settingsLabel,
  leading,
  trailing,
}: {
  /** Primary insert actions. Omit (or empty) to hide the New button. */
  quickActions?: PluginQuickAction[]
  /** Hash route to the central settings tab, e.g. '/settings/crm'. Omit to hide the gear. */
  settingsPath?: string
  /** Accessible title for the gear button. */
  settingsLabel?: string
  /** Optional extra controls rendered before the New button (e.g. a filter). */
  leading?: React.ReactNode
  /** Optional extra controls rendered after the gear. */
  trailing?: React.ReactNode
}) {
  const hasQuickActions = !!quickActions && quickActions.length > 0
  if (!hasQuickActions && !settingsPath && !leading && !trailing) return null

  return (
    <div className="flex items-center gap-2">
      {leading}
      {hasQuickActions && <QuickActionsButton actions={quickActions} />}
      {settingsPath && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => { window.location.hash = settingsPath }}
          title={settingsLabel ?? 'Settings'}
        >
          <Settings className="h-4 w-4" />
        </Button>
      )}
      {trailing}
    </div>
  )
}
