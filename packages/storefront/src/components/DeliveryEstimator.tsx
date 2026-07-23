import React, { useState } from 'react'
import { MapPin, Truck } from 'lucide-react'
import { formatPostalCode } from '@fayz-ai/core'
import { useDeliveryStore, resolveOptionRate } from '../stores/delivery.store'
import { useCartStore, selectSubtotal } from '../stores/cart.store'
import { useStorefrontConfig } from '../config'
import { formatMoney } from '../format'
import { TID } from '../testids'

/**
 * "Do you deliver to me, for how much, and when" — asked on the product page,
 * before the shopper has invested anything in a cart.
 *
 * The CEP is kept in the delivery store, so the answer follows them to the cart
 * and lands at checkout with street/district/city/UF already filled. That is
 * the actual payoff: the buyer types a house number instead of an address.
 *
 * `subtotal` is the PRE-discount cart subtotal, the same number shop_place_order
 * uses to resolve free-above thresholds. Quoting against anything else is how
 * the cart and the order end up disagreeing (see migration 0017).
 */
export function DeliveryEstimator({ compact = false }: { compact?: boolean }) {
  const config = useStorefrontConfig()
  const cart = useCartStore()
  const delivery = useDeliveryStore()
  const [draft, setDraft] = useState(() => formatPostalCode(delivery.postalCode))

  const subtotal = selectSubtotal(cart)
  const money = (value: number) => formatMoney(value, config.currency, config.locale)
  const loading = delivery.status === 'loading'

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    await delivery.resolve(draft, subtotal)
  }

  function eta(option: { etaMinDays?: number; etaMaxDays?: number }): string | null {
    const { etaMinDays: min, etaMaxDays: max } = option
    if (min == null && max == null) return null
    if (min === 0 && (max === 0 || max === 1)) return 'hoje ou amanhã'
    if (min != null && max != null && min !== max) return `${min} a ${max} dias úteis`
    return `${max ?? min} dia(s) útil(eis)`
  }

  return (
    <section
      data-testid={TID.deliveryEstimator}
      className={compact ? 'rounded-lg border p-3' : 'mt-6 rounded-lg border p-4'}
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Truck className="h-4 w-4 text-primary" />
        Calcular entrega
      </div>

      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          data-testid={TID.deliveryCepInput}
          aria-label="CEP"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="00000-000"
          value={draft}
          onChange={(event) => setDraft(formatPostalCode(event.target.value))}
          className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
        <button
          type="submit"
          data-testid={TID.deliveryCepSubmit}
          disabled={loading}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? '...' : 'Calcular'}
        </button>
      </form>

      {/* Shown whenever there is one, including alongside a price: the range
          may be covered even though the CEP itself was mistyped. */}
      {delivery.error && (
        <p data-testid={TID.deliveryError} className="mt-3 text-sm text-destructive">
          {delivery.error}
        </p>
      )}

      {delivery.address && (
        <p data-testid={TID.deliveryAddress} className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {[delivery.address.street, delivery.address.district].filter(Boolean).join(', ')}
            {delivery.address.street || delivery.address.district ? ' — ' : ''}
            {delivery.address.city}/{delivery.address.state}
          </span>
        </p>
      )}

      {delivery.status === 'served' && (
        <ul className="mt-3 space-y-2">
          {delivery.options.map((option) => {
            const selected = delivery.selectedZoneId === option.zoneId
            const label = eta(option)
            // Resolved for the cart as it stands right now, not for whatever it
            // held when the CEP was typed — the same rule the server applies.
            const rate = resolveOptionRate(option, subtotal)
            return (
              <li key={option.zoneId}>
                <button
                  type="button"
                  data-testid={TID.deliveryOption}
                  data-zone={option.zoneId}
                  data-rate={rate.toFixed(2)}
                  aria-pressed={selected}
                  onClick={() => delivery.selectZone(option.zoneId)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                    selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {option.carrier ? `${option.carrier} · ${option.name}` : option.name}
                    </span>
                    {label && <span className="block text-xs text-muted-foreground">{label}</span>}
                  </span>
                  <span className="shrink-0 font-semibold">
                    {rate === 0 ? 'Grátis' : money(rate)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/*
        No options for a valid address. For a store that configured zones this
        means "outside our delivery area" and checkout will refuse the order, so
        it is said plainly here rather than at the end of the funnel. A store
        with no zones at all never reaches this state — it quotes nothing and
        keeps its flat rate.
      */}
      {delivery.status === 'unserved' && (
        <p data-testid={TID.deliveryUnserved} className="mt-3 text-sm text-destructive">
          Ainda não entregamos nesse CEP.
        </p>
      )}

      {delivery.postalCode && (
        <button
          type="button"
          data-testid={TID.deliveryClear}
          onClick={() => { delivery.clear(); setDraft('') }}
          className="mt-3 text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Trocar CEP
        </button>
      )}
    </section>
  )
}
