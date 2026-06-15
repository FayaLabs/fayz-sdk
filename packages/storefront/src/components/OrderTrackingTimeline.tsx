import React from 'react'
import { Check, Clock, PackageCheck, Truck } from 'lucide-react'
import type { Order } from '@fayz-ai/shop/types'
import { TID } from '../testids'

type TrackingState = 'complete' | 'current' | 'pending'

interface TrackingStep {
  id: string
  label: string
  description: string
  state: TrackingState
  icon: React.ComponentType<{ className?: string }>
}

function isPaymentApproved(order: Order) {
  return ['paid', 'partially_paid', 'partially_refunded', 'refunded'].includes(order.financialStatus)
}

function orderTrackingSteps(order: Order): TrackingStep[] {
  const paymentApproved = isPaymentApproved(order)
  const partiallyFulfilled = order.fulfillmentStatus === 'partially_fulfilled'
  const fulfilled = order.fulfillmentStatus === 'fulfilled'

  return [
    {
      id: 'received',
      label: 'Pedido recebido',
      description: `#${order.orderNumber}`,
      state: 'complete',
      icon: Check,
    },
    {
      id: 'payment',
      label: paymentApproved ? 'Pagamento aprovado' : 'Aguardando pagamento',
      description: paymentApproved ? 'Compra confirmada' : 'Processando',
      state: paymentApproved ? 'complete' : 'current',
      icon: Check,
    },
    {
      id: 'preparing',
      label: 'Preparando envio',
      description: paymentApproved ? 'Separando produtos' : 'Comeca apos pagamento',
      state: fulfilled || partiallyFulfilled ? 'complete' : paymentApproved ? 'current' : 'pending',
      icon: PackageCheck,
    },
    {
      id: 'delivery',
      label: fulfilled ? 'Pedido enviado' : partiallyFulfilled ? 'Envio parcial' : 'Entrega',
      description: fulfilled ? 'A caminho do cliente' : partiallyFulfilled ? 'Parte do pedido saiu' : 'Proxima etapa',
      state: fulfilled ? 'complete' : partiallyFulfilled ? 'current' : 'pending',
      icon: fulfilled || partiallyFulfilled ? Truck : Clock,
    },
  ]
}

export function OrderTrackingTimeline({ order, compact = false }: { order: Order; compact?: boolean }) {
  const steps = orderTrackingSteps(order)

  return (
    <ol
      data-testid={TID.orderTracking}
      className={compact ? 'grid gap-2 sm:grid-cols-4' : 'grid gap-3 sm:grid-cols-4'}
      aria-label="Acompanhamento do pedido"
    >
      {steps.map((step) => {
        const Icon = step.icon
        const active = step.state !== 'pending'
        return (
          <li
            key={step.id}
            data-testid={TID.orderTrackingStep(step.id)}
            data-state={step.state}
            className={[
              'relative min-w-0 rounded-xl border p-3',
              active ? 'border-primary/35 bg-primary/5' : 'bg-muted/20 text-muted-foreground',
              compact ? 'text-xs' : 'text-sm',
            ].join(' ')}
          >
            <div className="flex items-start gap-2">
              <span
                className={[
                  'grid h-7 w-7 shrink-0 place-items-center rounded-full border',
                  active ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30 bg-background',
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
