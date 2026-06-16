import React, { useEffect } from 'react'
import { AlertCircle, Check, Info, X } from 'lucide-react'
import { useToastStore, type Toast } from '../stores/toast.store'

const ICON: Record<Toast['variant'], React.ComponentType<{ className?: string }>> = {
  success: Check,
  error: AlertCircle,
  info: Info,
}

const ACCENT: Record<Toast['variant'], string> = {
  success: 'bg-emerald-500/10 text-emerald-600',
  error: 'bg-destructive/10 text-destructive',
  info: 'bg-primary/10 text-primary',
}

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss)
  const Icon = ICON[toast.variant]

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), toast.durationMs)
    return () => window.clearTimeout(timer)
  }, [toast.id, toast.durationMs, dismiss])

  return (
    <div
      role="status"
      className="pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] animate-slide-in-from-right items-start gap-3 rounded-xl border bg-card p-3.5 shadow-lg"
    >
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${ACCENT[toast.variant]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-xs text-muted-foreground">{toast.description}</p>}
      </div>
      <button
        type="button"
        aria-label="Fechar"
        onClick={() => dismiss(toast.id)}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  )
}
