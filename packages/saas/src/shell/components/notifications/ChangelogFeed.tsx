import * as React from 'react'
import { Sparkles, Wrench, Bug } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { ChangelogEntry } from '../../types/notifications'

interface ChangelogFeedProps {
  changelogUrl?: string
  className?: string
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  feature: Sparkles,
  improvement: Wrench,
  fix: Bug,
}

const TYPE_COLORS: Record<string, string> = {
  feature: 'text-primary',
  improvement: 'text-info',
  fix: 'text-success',
}

export function ChangelogFeed({ changelogUrl, className }: ChangelogFeedProps) {
  const [entries, setEntries] = React.useState<ChangelogEntry[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!changelogUrl) return

    setLoading(true)
    fetch(changelogUrl)
      .then((r) => r.json())
      .then((data: ChangelogEntry[]) => setEntries(data))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [changelogUrl])

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!changelogUrl || entries.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <Sparkles className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No updates yet</p>
      </div>
    )
  }

  return (
    <div className={cn('max-h-96 overflow-y-auto', className)}>
      {entries.map((entry) => {
        const Icon = TYPE_ICONS[entry.type] ?? Sparkles
        const colorClass = TYPE_COLORS[entry.type] ?? TYPE_COLORS.feature

        return (
          <div key={entry.id} className="border-b px-4 py-3 last:border-0">
            <div className="flex items-start gap-3">
              <div className={cn('mt-0.5 shrink-0', colorClass)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{entry.title}</p>
                  {entry.version && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {entry.version}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{entry.body}</p>
                <p className="mt-1 text-[10px] text-muted-foreground/70">{entry.date}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
