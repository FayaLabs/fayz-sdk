import React, { useEffect, useState } from 'react'
import { getShopProvider } from '@fayz/shop'
import {
  useCartStore,
  selectSubtotal,
  selectDiscountTotal,
  selectShipping,
  selectTotal,
} from '../stores/cart.store'
import { useSessionStore } from '../stores/session.store'
import { establishCustomerSession } from '../auth'
import { useStorefrontConfig } from '../config'
import { navigateTo } from '../router'
import { formatMoney } from '../format'
import { TID } from '../testids'

interface CheckoutForm {
  email: string
  name: string
  street: string
  city: string
  zip: string
  card: string
  expiry: string
  cvc: string
}

function field(
  label: string,
  testId: string,
  value: string,
  onChange: (v: string) => void,
  props?: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        {...props}
      />
    </label>
  )
}

export function CheckoutPage() {
  const config = useStorefrontConfig()
  const cart = useCartStore()
  const session = useSessionStore()

  const [form, setForm] = useState<CheckoutForm>({
    email: session.email ?? '',
    name: session.name ?? '',
    street: '',
    city: '',
    zip: '',
    card: '',
    expiry: '',
    cvc: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [placing, setPlacing] = useState(false)

  const subtotal = selectSubtotal(cart)
  const discountTotal = selectDiscountTotal(cart)
  const shipping = selectShipping(cart, config)
  const total = selectTotal(cart, config)
  const money = (v: number) => formatMoney(v, config.currency, config.locale)

  // Empty cart (and not mid-placement) → nothing to check out
  useEffect(() => {
    if (cart.lines.length === 0 && !placing) navigateTo('/')
  }, [cart.lines.length, placing])

  const set = (key: keyof CheckoutForm) => (v: string) => setForm((f) => ({ ...f, [key]: v }))

  async function placeOrder() {
    setError(null)
    if (!form.email.trim() || !/.+@.+\..+/.test(form.email)) {
      setError('Informe um e-mail válido.')
      return
    }
    if (!form.name.trim()) { setError('Informe seu nome completo.'); return }
    if (!form.street.trim() || !form.city.trim() || !form.zip.trim()) {
      setError('Preencha o endereço de entrega.')
      return
    }
    const cardDigits = form.card.replace(/\s+/g, '')
    if (!/^\d{16}$/.test(cardDigits)) { setError('Número de cartão inválido (16 dígitos).'); return }
    if (!form.expiry.trim() || !form.cvc.trim()) { setError('Preencha validade e CVC do cartão.'); return }

    setPlacing(true)
    try {
      const provider = getShopProvider()
      const email = form.email.trim().toLowerCase()

      // One auth path for the whole storefront: the same adapter-backed
      // session used by the account page, so the buyer lands on "my
      // purchases" already signed in.
      let customerId = session.customerId
      if (!customerId || session.email !== email) {
        const established = await establishCustomerSession(email, { name: form.name.trim() })
        customerId = established.customerId
      }

      const order = await provider.createOrder({
        customerId,
        customerName: form.name.trim(),
        customerEmail: email,
        currency: config.currency,
        notes: `Entrega: ${form.street.trim()}, ${form.city.trim()} ${form.zip.trim()}`,
        discountCode: cart.discountCode ?? undefined,
        discountTotal,
        shippingTotal: shipping,
        items: cart.lines.map((l) => ({
          productId: l.productId,
          name: l.name,
          sku: l.sku ?? undefined,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          imageUrl: l.imageUrl ?? undefined,
        })),
      })

      // mock payment capture
      await provider.updateOrder(order.id, { financialStatus: 'paid' })

      cart.clear()
      navigateTo(`/order/${order.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível concluir o pedido.')
      setPlacing(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">Finalizar compra</h1>
      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="font-semibold">Contato</h2>
            {field('E-mail', TID.checkoutEmail, form.email, set('email'), { type: 'email', placeholder: 'voce@exemplo.com' })}
            {field('Nome completo', TID.checkoutName, form.name, set('name'), { placeholder: 'Seu nome' })}
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">Entrega</h2>
            {field('Endereço', TID.checkoutStreet, form.street, set('street'), { placeholder: 'Rua, número' })}
            <div className="grid grid-cols-2 gap-3">
              {field('Cidade', TID.checkoutCity, form.city, set('city'))}
              {field('CEP', TID.checkoutZip, form.zip, set('zip'), { placeholder: '00000-000' })}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">Pagamento</h2>
            <p className="text-xs text-muted-foreground">Pagamento de demonstração — nenhuma cobrança é feita.</p>
            {field('Número do cartão', TID.checkoutCard, form.card, set('card'), { placeholder: '4242 4242 4242 4242', inputMode: 'numeric' })}
            <div className="grid grid-cols-2 gap-3">
              {field('Validade', TID.checkoutExpiry, form.expiry, set('expiry'), { placeholder: 'MM/AA' })}
              {field('CVC', TID.checkoutCvc, form.cvc, set('cvc'), { placeholder: '123', inputMode: 'numeric' })}
            </div>
          </section>

          {error && (
            <p data-testid={TID.checkoutError} className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            type="button"
            data-testid={TID.placeOrder}
            onClick={placeOrder}
            disabled={placing}
            className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {placing ? 'Processando…' : `Pagar ${money(total)}`}
          </button>
        </div>

        <aside className="h-fit rounded-2xl border bg-card p-5">
          <h2 className="mb-4 font-semibold">Resumo do pedido</h2>
          <ul className="space-y-3">
            {cart.lines.map((l) => (
              <li key={l.productId} className="flex items-center gap-3 text-sm">
                {l.imageUrl && <img src={l.imageUrl} alt={l.name} className="h-12 w-12 rounded-lg border object-cover" />}
                <span className="flex-1">
                  {l.name} <span className="text-muted-foreground">× {l.quantity}</span>
                </span>
                <span data-price={(l.unitPrice * l.quantity).toFixed(2)}>{money(l.unitPrice * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd data-price={subtotal.toFixed(2)}>{money(subtotal)}</dd>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Desconto ({cart.discountCode})</dt>
                <dd data-price={discountTotal.toFixed(2)}>−{money(discountTotal)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Frete</dt>
              <dd data-price={shipping.toFixed(2)}>{shipping === 0 ? 'Grátis' : money(shipping)}</dd>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd data-price={total.toFixed(2)}>{money(total)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </main>
  )
}
