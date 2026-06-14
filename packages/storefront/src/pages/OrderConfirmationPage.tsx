import React, { useEffect, useState } from 'react'
import { getShopProvider } from '@fayz-ai/shop'
import { prefersReducedMotion } from '../motion'
import type { Order } from '@fayz-ai/shop'
import { useStorefrontConfig } from '../config'
import { Link } from '../router'
import { formatMoney } from '../format'
import { TID } from '../testids'

const FINANCIAL_LABEL: Record<string, string> = {
  paid: 'Pago',
  pending: 'Pendente',
  refunded: 'Reembolsado',
}

const CONFETTI_COLORS = ['hsl(var(--primary))', '#f59e0b', '#10b981', '#3b82f6', '#ec4899']

/** One-shot celebration: circle pops in, check draws itself, confetti rains. */
function SuccessMark() {
  const reduced = prefersReducedMotion()
  return (
    <div className="relative mx-auto h-24 w-24">
      {!reduced &&
        Array.from({ length: 14 }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute h-2 w-2 animate-confetti-fall rounded-sm"
            style={{
              left: `${(i * 7.3) % 100}%`,
              top: '-4px',
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDelay: `${200 + (i % 7) * 90}ms`,
            }}
          />
        ))}
      <span className={`absolute inset-0 rounded-full bg-emerald-100 ${reduced ? '' : 'animate-pop-in'}`} />
      <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full p-6" aria-hidden>
        <path
          d="M10 25 L20 35 L38 14"
          fill="none"
          stroke="rgb(5 150 105)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="48"
          className={reduced ? '' : 'animate-draw-check'}
        />
      </svg>
    </div>
  )
}

export function OrderConfirmationPage({ orderId }: { orderId: string }) {
  const config = useStorefrontConfig()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const money = (v: number) => formatMoney(v, config.currency, config.locale)

  useEffect(() => {
    let cancelled = false
    getShopProvider()
      .getOrder(orderId)
      .then((o) => {
        if (!cancelled) setOrder(o)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orderId])

  if (loading) {
    return <main className="mx-auto max-w-2xl px-4 py-20 text-center text-muted-foreground">Carregando…</main>
  }
  if (!order) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-muted-foreground">Pedido não encontrado.</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">Voltar à loja</Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="animate-fade-up border bg-card p-8 text-center" style={{ borderRadius: 'var(--sf-radius-card)' }}>
        <SuccessMark />
        <h1 className="sf-heading mt-5 animate-fade-up text-3xl font-bold tracking-tight" style={{ animationDelay: '350ms' }}>
          Pedido confirmado!
        </h1>
        <p className="mt-1 text-muted-foreground">
          Obrigado pela compra, {order.customerName ?? 'cliente'}. Enviamos a confirmação para {order.customerEmail}.
        </p>
        <p className="mt-4 text-lg">
          Pedido <span data-testid={TID.orderNumber} className="font-semibold">#{order.orderNumber}</span>{' '}
          <span
            data-testid={TID.orderStatus}
            className="ml-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-sm font-medium text-emerald-800"
          >
            {FINANCIAL_LABEL[order.financialStatus] ?? order.financialStatus}
          </span>
        </p>

        <ul className="mt-8 space-y-3 border-t pt-6 text-left">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 text-sm">
              {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="h-12 w-12 rounded-lg border object-cover" />}
              <span className="flex-1">
                {item.name} <span className="text-muted-foreground">× {item.quantity}</span>
              </span>
              <span data-price={item.total.toFixed(2)}>{money(item.total)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1.5 border-t pt-4 text-left text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd data-price={order.subtotal.toFixed(2)}>{money(order.subtotal)}</dd>
          </div>
          {order.discountTotal > 0 && (
            <div className="flex justify-between text-emerald-700">
              <dt>Desconto {order.discountCode ? `(${order.discountCode})` : ''}</dt>
              <dd data-price={order.discountTotal.toFixed(2)}>−{money(order.discountTotal)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Frete</dt>
            <dd data-price={order.shippingTotal.toFixed(2)}>
              {order.shippingTotal === 0 ? 'Grátis' : money(order.shippingTotal)}
            </dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd data-testid={TID.orderTotal} data-price={order.total.toFixed(2)}>{money(order.total)}</dd>
          </div>
        </dl>

        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/account"
            data-testid={TID.viewPurchases}
            className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:opacity-90"
          >
            Minhas compras
          </Link>
          <Link to="/" className="rounded-xl border px-5 py-2.5 font-semibold hover:bg-muted">
            Continuar comprando
          </Link>
        </div>
      </div>
    </main>
  )
}
