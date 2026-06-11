import * as React from 'react'
import { ArrowLeft } from 'lucide-react'

interface BreadcrumbProps {
  /** Parent label (e.g. "Invoices", "Clients") — clicking navigates back */
  parent: string
  /** Current item name (e.g. "Invoice #123", "John Doe") */
  current?: string
  /** Navigate back handler */
  onBack: () => void
}

export function Breadcrumb({ parent, current, onBack }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {parent}
      </button>
      {current !== undefined && (
        <>
          <span>/</span>
          {current ? (
            <span className="text-foreground font-medium truncate max-w-[200px]">{current}</span>
          ) : (
            <span className="inline-block h-4 w-24 rounded bg-muted animate-pulse align-middle" />
          )}
        </>
      )}
    </nav>
  )
}
