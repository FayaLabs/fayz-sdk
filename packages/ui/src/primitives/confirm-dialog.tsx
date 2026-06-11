import * as React from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Info, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '../utils/cn'
import { Button } from './button'

type ConfirmVariant = 'default' | 'destructive' | 'warning' | 'success'

interface ConfirmDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
  loading?: boolean
}

const VARIANT_CONFIG: Record<
  ConfirmVariant,
  {
    icon: React.ElementType
    iconBg: string
    iconColor: string
    buttonVariant: 'default' | 'destructive'
  }
> = {
  default: {
    icon: Info,
    iconBg: 'bg-info/10',
    iconColor: 'text-info',
    buttonVariant: 'default',
  },
  destructive: {
    icon: XCircle,
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
    buttonVariant: 'destructive',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
    buttonVariant: 'destructive',
  },
  success: {
    icon: CheckCircle2,
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
    buttonVariant: 'default',
  },
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  const config = VARIANT_CONFIG[variant]
  const Icon = config.icon

  React.useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-fade-in"
        onClick={onCancel}
      />

      <div
        className="relative z-10 w-full max-w-sm mx-4 rounded-modal border border-border bg-card shadow-lg animate-zoom-in"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={description ? 'confirm-desc' : undefined}
      >
        <div className="p-6">
          <div className="flex gap-4">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-full shrink-0', config.iconBg)}>
              <Icon className={cn('h-5 w-5', config.iconColor)} />
            </div>
            <div className="min-w-0 pt-0.5">
              <h3 id="confirm-title" className="text-sm font-semibold text-foreground">
                {title}
              </h3>
              {description && (
                <p id="confirm-desc" className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button variant={config.buttonVariant} size="sm" onClick={onConfirm} disabled={loading}>
              {loading ? 'Processing...' : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
