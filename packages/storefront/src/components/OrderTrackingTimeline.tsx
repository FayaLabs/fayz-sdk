import React from 'react'
import { Check, Clock, PackageCheck, RotateCcw, Truck, XCircle } from 'lucide-react'
import type { Order } from '@fayz-ai/shop/types'
import { isPaid, isRefunded } from '../order-status'
import { TID } from '../testids'

type TrackingState = 'complete' | 'current' | 'pending' | 'cancelled'

interface TrackingStep {
  id: string
  label: string
  description: string
  state: TrackingState
  icon: React.ComponentType<{ className?: string }>
}

function orderTrackingSteps(order: Order): TrackingStep[] {
  const received: TrackingStep = {
    id: 'received',
    label: 'Pedido recebido',
    description: `#${order.orderNumber}`,
    state: 'complete',
    icon: Check,
  }

  // Terminal states short-circuit the happy path.
  if (order.status === 'cancelled' || order.financialStatus === 'voided') {
    return [
      received,
      { id: 'payment', label: 'Pedido cancelado', description: 'Este pedido foi cancelado', state: 'cancelled', icon: XCircle },
    ]
  }
  if (isRefunded(order.financialStatus)) {
    return [
      received,
      { id: 'payment', label: 'Pagamento aprovado', description: 'Compra confirmada', state: 'complete', icon: Check },
      {
        id: 'refund',
        label: order.financialStatus === 'refunded' ? 'Reembolsado' : 'Reembolso parcial',
        description: 'Valor devolvido ao cliente',
        state: 'cancelled',
        icon: RotateCcw,
      },
    ]
  }

  const paid = isPaid(order.financialStatus)
  const partiallyFulfilled = order.fulfillmentStatus === 'partially_fulfilled'
  const fulfilled = order.fulfillmentStatus === 'fulfilled'

  return [
    received,
    {
      id: 'payment',
      label: paid ? 'Pagamento aprovado' : 'Aguardando pagamento',
      description: paid ? 'Compra confirmada' : 'Processando',
      state: paid ? 'complete' : 'current',
      icon: Check,
    },
    {
      id: 'preparing',
      label: 'Preparando envio',
      description: paid ? 'Separando produtos' : 'Começa após o pagamento',
      state: fulfilled || partiallyFulfilled ? 'complete' : paid ? 'current' : 'pending',
      icon: PackageCheck,
    },
    {
      id: 'delivery',
      label: fulfilled ? 'Pedido enviado' : partiallyFulfilled ? 'Envio parcial' : 'Entrega',
      description: fulfilled ? 'A caminho do cliente' : partiallyFulfilled ? 'Parte do pedido saiu' : 'Próxima etapa',
      state: fulfilled ? 'complete' : partiallyFulfilled ? 'current' : 'pending',
      icon: fulfilled || partiallyFulfilled ? Truck : Clock,
    },
  ]
}

const GRID_COLS: Record<number, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
}

export function OrderTrackingTimeline({ order, compact = false }: { order: Order; compact?: boolean }) {
  const steps = orderTrackingSteps(order)

  return (
    <ol
      data-testid={TID.orderTracking}
      className={`grid ${compact ? 'gap-2' : 'gap-3'} ${GRID_COLS[steps.length] ?? 'sm:grid-cols-4'}`}
      aria-label="Acompanhamento do pedido"
    >
      {steps.map((step) => {
        const Icon = step.icon
        const cancelled = step.state === 'cancelled'
        const active = step.state !== 'pending'
        return (
          <li
            key={step.id}
            data-testid={TID.orderTrackingStep(step.id)}
            data-state={step.state}
            className={[
              'relative min-w-0 rounded-xl border p-3',
              cancelled
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : active
                  ? 'border-primary/35 bg-primary/5'
                  : 'bg-muted/20 text-muted-foreground',
              compact ? 'text-xs' : 'text-sm',
            ].join(' ')}
          >
            <div className="flex items-start gap-2">
              <span
                className={[
                  'grid h-7 w-7 shrink-0 place-items-center rounded-full border',
                  cancelled
                    ? 'border-rose-300 bg-rose-500 text-white'
                    : active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30 bg-background',
                ].join(' ')}
                aria-hidden
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-foreground">{step.label}</span>
                <span className="mt-0.5 block truncate text-muted-foreground">{step.description}</span>
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
