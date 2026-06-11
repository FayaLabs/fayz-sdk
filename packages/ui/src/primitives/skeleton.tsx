import { cn } from '../utils/cn'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
}

/**
 * Skeleton loader that mimics a table with rows and columns.
 * Drop-in replacement for "Loading..." text in list views.
 */
function TableSkeleton({ columns = 4, rows = 2 }: { columns?: number; rows?: number }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="border-b bg-muted/30 flex gap-4 px-4 py-2.5">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 rounded bg-muted-foreground/10" />
        ))}
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn(
                  'h-3 rounded',
                  c === 0 ? 'flex-[2]' : 'flex-1',
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export { Skeleton, TableSkeleton }
