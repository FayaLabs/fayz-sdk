import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '../lib/cn'
import { useTranslation } from '../hooks/useTranslation'
import { useRightRailStore } from '../right-rail'

/** The shell's companion column: a tab bar and whichever panel is active.
 *  The frame inset comes from AppShell's `<aside>` padding, so this fills its
 *  box exactly. */
export function RightRail({ frame = true }: { frame?: boolean }) {
  const { t } = useTranslation()
  const open = useRightRailStore((s) => s.open)
  const panels = useRightRailStore((s) => s.panels)
  const active = useRightRailStore((s) => s.active)
  const openPanel = useRightRailStore((s) => s.openPanel)
  const close = useRightRailStore((s) => s.close)

  const current = panels.find((p) => p.id === active) ?? panels[0]
  if (!open || !current) return null
  const Panel = current.Component

  return (
    <div
      role="complementary"
      aria-label={current.label}
      className={cn(
        'flex min-h-0 flex-col overflow-hidden bg-card',
        'fixed inset-0 z-40 motion-safe:animate-slide-in-from-bottom',
        'md:motion-safe:animate-slide-in-from-right',
        'md:static md:z-auto md:h-full md:w-full',
        frame
          ? 'md:rounded-2xl md:border md:border-border/60'
          : 'md:border-l md:border-border/60',
      )}
    >
      <div className="flex items-center gap-1 border-b border-border/40 px-1.5 py-1.5">
        {panels.length > 1 ? (
          <div className="flex min-w-0 flex-1 items-center gap-0.5" role="tablist">
            {panels.map((panel) => {
              const Icon = panel.icon
              const selected = panel.id === current.id
              return (
                <button
                  key={panel.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => openPanel(panel.id)}
                  className={cn(
                    'inline-flex min-w-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                  <span className="truncate">{panel.label}</span>
                  {panel.badge && panel.badge.count > 0 && (
                    <span
                      className={cn(
                        'inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums',
                        panel.badge.tone === 'destructive'
                          ? 'bg-destructive text-destructive-foreground'
                          : 'bg-muted-foreground/15 text-muted-foreground',
                      )}
                    >
                      {panel.badge.count > 99 ? '99+' : panel.badge.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <span className="min-w-0 flex-1 truncate px-2 text-[12.5px] font-semibold text-foreground">
            {current.label}
          </span>
        )}

        <button
          type="button"
          onClick={close}
          aria-label={t('common.close')}
          title={t('common.close')}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Keyed so switching tabs does not hand one panel's DOM to another. */}
      <div key={current.id} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Panel />
      </div>
    </div>
  )
}
