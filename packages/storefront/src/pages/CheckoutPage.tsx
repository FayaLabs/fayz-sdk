import React, { useEffect, useState } from 'react'
import { CreditCard, Lock, PackageCheck, ShieldCheck, Trash2 } from 'lucide-react'
import { prefersReducedMotion } from '../motion'
import {
  useCartStore,
  selectSubtotal,
  selectDiscountTotal,
  selectShipping,
  selectTotal,
} from '../stores/cart.store'
import { useSessionStore } from '../stores/session.store'
import { useStorefrontConfig } from '../config'
import { Link, navigateTo } from '../router'
import { formatMoney } from '../format'
import { TID } from '../testids'
import { placeStorefrontOrder } from '../workflows/checkout'

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

type AddressMode = 'saved' | 'new'
type PaymentMode = 'saved' | 'new'

const SAVED_ADDRESSES = [
  { id: 'home', label: 'Casa', street: 'Rua das Flores, 123', city: 'São Paulo', zip: '01310-100' },
]

const SAVED_PAYMENT_METHODS = [
  { id: 'visa', label: 'Visa final 4242', card: '4242 4242 4242 4242', expiry: '12/29', cvc: '123' },
]

const PROCESSING_STEPS = [
  { icon: Lock, label: 'Validando seus dados...' },
  { icon: CreditCard, label: 'Processando pagamento...' },
  { icon: PackageCheck, label: 'Confirmando seu pedido...' },
]

const DEFAULT_ADDRESS = SAVED_ADDRESSES[0]!
const DEFAULT_PAYMENT = SAVED_PAYMENT_METHODS[0]!
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function ProcessingOverlay({ step }: { step: number }) {
  const current = PROCESSING_STEPS[Math.min(step, PROCESSING_STEPS.length - 1)]!
  const Icon = current.icon
  return (
    <div
      data-testid={TID.checkoutProcessing}
      className="fixed inset-0 z-50 flex animate-fade-in flex-col items-center justify-center bg-background/95 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-muted border-t-primary" style={{ animationDuration: '1.1s' }} />
        <Icon key={step} className="h-9 w-9 animate-pop-in text-primary" />
      </div>
      <p key={`label-${step}`} className="mt-6 animate-fade-up font-medium">{current.label}</p>
      <p className="mt-8 text-xs text-muted-foreground">Pagamento seguro - não feche esta janela</p>
    </div>
  )
}

function field(
  label: string,
  testId: string,
  value: string,
  onChange: (value: string) => void,
  props?: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        data-testid={testId}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border bg-background px-3.5 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        {...props}
      />
    </label>
  )
}

export function CheckoutPage() {
  const config = useStorefrontConfig()
  const cart = useCartStore()
  const session = useSessionStore()

  const [selectedAddressId, setSelectedAddressId] = useState(DEFAULT_ADDRESS.id)
  const [selectedPaymentId, setSelectedPaymentId] = useState(DEFAULT_PAYMENT.id)
  const [savedAddresses, setSavedAddresses] = useState(SAVED_ADDRESSES)
  const [savedPaymentMethods, setSavedPaymentMethods] = useState(SAVED_PAYMENT_METHODS)
  const [addressMode, setAddressMode] = useState<AddressMode>('saved')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('saved')
  const [form, setForm] = useState<CheckoutForm>({
    email: session.email ?? '',
    name: session.name ?? '',
    street: DEFAULT_ADDRESS.street,
    city: DEFAULT_ADDRESS.city,
    zip: DEFAULT_ADDRESS.zip,
    card: DEFAULT_PAYMENT.card,
    expiry: DEFAULT_PAYMENT.expiry,
    cvc: DEFAULT_PAYMENT.cvc,
  })
  const [error, setError] = useState<string | null>(null)
  const [placing, setPlacing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0)

  const subtotal = selectSubtotal(cart)
  const discountTotal = selectDiscountTotal(cart)
  const shipping = selectShipping(cart, config)
  const total = selectTotal(cart, config)
  const money = (value: number) => formatMoney(value, config.currency, config.locale)

  useEffect(() => {
    if (cart.lines.length === 0 && !placing) navigateTo(config.catalogPath)
  }, [cart.lines.length, config.catalogPath, placing])

  const set = (key: keyof CheckoutForm) => (value: string) => setForm((current) => ({ ...current, [key]: value }))

  function applySavedAddress(address: typeof SAVED_ADDRESSES[number]) {
    setAddressMode('saved')
    setSelectedAddressId(address.id)
    setForm((current) => ({ ...current, street: address.street, city: address.city, zip: address.zip }))
  }

  function selectAddress(addressId: string) {
    const address = savedAddresses.find((item) => item.id === addressId)
    if (address) applySavedAddress(address)
  }

  function addNewAddress() {
    setAddressMode('new')
    setSelectedAddressId('new')
    setForm((current) => ({ ...current, street: '', city: '', zip: '' }))
  }

  function removeAddress(addressId: string) {
    const nextAddresses = savedAddresses.filter((item) => item.id !== addressId)
    setSavedAddresses(nextAddresses)
    if (selectedAddressId !== addressId) return
    const fallback = nextAddresses[0]
    if (fallback) applySavedAddress(fallback)
    else addNewAddress()
  }

  function applySavedPayment(method: typeof SAVED_PAYMENT_METHODS[number]) {
    setPaymentMode('saved')
    setSelectedPaymentId(method.id)
    setForm((current) => ({ ...current, card: method.card, expiry: method.expiry, cvc: method.cvc }))
  }

  function selectPayment(paymentId: string) {
    const method = savedPaymentMethods.find((item) => item.id === paymentId)
    if (method) applySavedPayment(method)
  }

  function addNewPayment() {
    setPaymentMode('new')
    setSelectedPaymentId('new')
    setForm((current) => ({ ...current, card: '', expiry: '', cvc: '' }))
  }

  function removePayment(paymentId: string) {
    const nextMethods = savedPaymentMethods.filter((item) => item.id !== paymentId)
    setSavedPaymentMethods(nextMethods)
    if (selectedPaymentId !== paymentId) return
    const fallback = nextMethods[0]
    if (fallback) applySavedPayment(fallback)
    else addNewPayment()
  }

  function validate(): boolean {
    setError(null)
    if (!form.email.trim() || !/.+@.+\..+/.test(form.email)) {
      setError('Informe um e-mail válido.')
      return false
    }
    if (!form.name.trim()) {
      setError('Informe seu nome completo.')
      return false
    }
    if (!form.street.trim() || !form.city.trim() || !form.zip.trim()) {
      setError('Preencha ou selecione o endereço de entrega.')
      return false
    }
    if (!/^\d{16}$/.test(form.card.replace(/\s+/g, '')) || !form.expiry.trim() || !form.cvc.trim()) {
      setError('Selecione ou preencha um método de pagamento válido.')
      return false
    }
    return true
  }

  async function placeOrder() {
    if (!validate()) return

    setPlacing(true)
    setProcessingStep(0)
    const stepMs = prefersReducedMotion() ? 120 : 600
    const stepTimers = [
      setTimeout(() => setProcessingStep(1), stepMs),
      setTimeout(() => setProcessingStep(2), stepMs * 2),
    ]
    const minDuration = sleep(stepMs * 2)
    try {
      const { order } = await placeStorefrontOrder({
        config,
        cart,
        session,
        customer: { email: form.email, name: form.name },
        address: { street: form.street, city: form.city, zip: form.zip },
        markPaid: true,
      })

      await minDuration
      cart.clear()
      navigateTo(`/order/${order.id}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível concluir o pedido.')
      setPlacing(false)
    } finally {
      stepTimers.forEach(clearTimeout)
    }
  }

  const primaryCta = placing ? 'Processando...' : `Comprar agora - ${money(total)}`

  return (
    <main className="min-h-screen bg-background">
      {placing && <ProcessingOverlay step={processingStep} />}
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-6 sm:px-6">
          <Link to={config.catalogPath} className="text-sm text-muted-foreground hover:text-foreground">
            Voltar à loja
          </Link>
          <div className="text-center">
            <div className="sf-heading text-2xl font-bold tracking-tight">{config.logo ?? config.name}</div>
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Checkout seguro
            </div>
          </div>
          <a href="mailto:suporte@example.com" className="text-sm text-muted-foreground hover:text-foreground">
            Ajuda
          </a>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-5 lg:px-6">
        <section className="lg:col-span-3 lg:pr-10">
          <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label="Checkout steps">
            <span className="font-medium text-foreground">Informações</span>
            <span>/</span>
            <span>Entrega</span>
            <span>/</span>
            <span>Pagamento</span>
          </nav>

          <div className="space-y-8">
            <section>
              <div className="mb-3 flex items-center justify-between gap-4">
                <h1 className="text-xl font-semibold tracking-tight">Informações de contato</h1>
                <span className="text-sm text-muted-foreground">Já tem conta? Entrar</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('E-mail', TID.checkoutEmail, form.email, set('email'), {
                  type: 'email',
                  placeholder: 'E-mail ou telefone',
                })}
                {field('Nome completo', TID.checkoutName, form.name, set('name'), {
                  placeholder: 'Nome completo',
                })}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold tracking-tight">Endereço de entrega</h2>
              <div className="mb-3 grid gap-3">
                {savedAddresses.map((address) => (
                  <div
                    key={address.id}
                    className={`group relative rounded-lg border p-3 pr-11 text-left text-sm transition hover:bg-muted/40 ${
                      selectedAddressId === address.id ? 'border-primary bg-primary/5' : 'border-border bg-background'
                    }`}
                  >
                    <button type="button" onClick={() => selectAddress(address.id)} className="block w-full text-left">
                      <span className="flex items-center justify-between gap-3 font-semibold">
                        {address.label}
                        {addressMode === 'saved' && selectedAddressId === address.id && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">Selecionado</span>
                        )}
                      </span>
                      <span className="mt-1 block text-muted-foreground">{address.street}</span>
                      <span className="block text-muted-foreground">{address.city} - {address.zip}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAddress(address.id)}
                      className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                      aria-label={`Remover endereço ${address.label}`}
                      title="Remover endereço"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addNewAddress}
                  className={`rounded-lg border border-dashed p-3 text-left text-sm transition hover:bg-muted/40 ${
                    addressMode === 'new' ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'
                  }`}
                >
                  <span className="block font-semibold text-primary">+ Adicionar novo endereço</span>
                  <span className="mt-1 block text-muted-foreground">Preencher outro endereço para esta compra</span>
                </button>
              </div>
              {addressMode === 'new' && (
                <div className="grid gap-3">
                  {field('Endereço', TID.checkoutStreet, form.street, set('street'), { placeholder: 'Endereço' })}
                  <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                    {field('Cidade', TID.checkoutCity, form.city, set('city'), { placeholder: 'Cidade' })}
                    {field('CEP', TID.checkoutZip, form.zip, set('zip'), { placeholder: 'CEP' })}
                  </div>
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold tracking-tight">Pagamento</h2>
              <div className="mb-3 grid gap-3">
                {savedPaymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`group relative rounded-lg border p-3 pr-11 text-left text-sm transition hover:bg-muted/40 ${
                      selectedPaymentId === method.id ? 'border-primary bg-primary/5' : 'border-border bg-background'
                    }`}
                  >
                    <button type="button" onClick={() => selectPayment(method.id)} className="block w-full text-left">
                      <span className="flex items-center justify-between gap-3 font-semibold">
                        <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" />{method.label}</span>
                        {paymentMode === 'saved' && selectedPaymentId === method.id && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">Selecionado</span>
                        )}
                      </span>
                      <span className="mt-1 block text-muted-foreground">Expira em {method.expiry}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removePayment(method.id)}
                      className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                      aria-label={`Remover cartão ${method.label}`}
                      title="Remover cartão"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addNewPayment}
                  className={`rounded-lg border border-dashed p-3 text-left text-sm transition hover:bg-muted/40 ${
                    paymentMode === 'new' ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'
                  }`}
                >
                  <span className="flex items-center gap-2 font-semibold text-primary"><CreditCard className="h-4 w-4" />+ Adicionar novo cartão</span>
                  <span className="mt-1 block text-muted-foreground">Usar outro cartão nesta compra</span>
                </button>
              </div>
              {paymentMode === 'new' && (
                <div className="grid gap-3">
                  {field('Número do cartão', TID.checkoutCard, form.card, set('card'), {
                    placeholder: 'Número do cartão',
                    inputMode: 'numeric',
                  })}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {field('Validade', TID.checkoutExpiry, form.expiry, set('expiry'), { placeholder: 'MM/AA' })}
                    {field('CVC', TID.checkoutCvc, form.cvc, set('cvc'), { placeholder: 'CVC', inputMode: 'numeric' })}
                  </div>
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">Pagamento de demonstração - nenhuma cobrança é feita.</p>
            </section>

            {error && (
              <p data-testid={TID.checkoutError} className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

          </div>

          <footer className="mt-10 flex flex-wrap gap-4 border-t pt-5 text-xs text-muted-foreground">
            <a href="#/privacy" className="hover:text-foreground">Privacidade</a>
            <a href="#/terms" className="hover:text-foreground">Termos</a>
            <a href="#/refunds" className="hover:text-foreground">Trocas e devoluções</a>
          </footer>
        </section>

        <aside className="rounded-xl border bg-muted/20 p-5 lg:sticky lg:top-6 lg:col-span-2 lg:self-start">
          <h2 className="sr-only">Resumo do pedido</h2>
          <ul className="space-y-4">
            {cart.lines.map((line) => (
              <li key={line.productId} className="flex gap-3 text-sm">
                <div className="relative h-16 w-16 flex-none overflow-hidden rounded-lg border bg-background">
                  {line.imageUrl && <img src={line.imageUrl} alt={line.name} className="h-full w-full object-cover" />}
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-muted-foreground px-1.5 text-[10px] font-bold text-background">
                    {line.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{line.name}</p>
                  {line.sku && <p className="text-xs text-muted-foreground">{line.sku}</p>}
                </div>
                <span data-price={(line.unitPrice * line.quantity).toFixed(2)}>
                  {money(line.unitPrice * line.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-8 space-y-3 border-t pt-6 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd data-price={subtotal.toFixed(2)}>{money(subtotal)}</dd>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Desconto ({cart.discountCode})</dt>
                <dd data-price={discountTotal.toFixed(2)}>-{money(discountTotal)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Entrega</dt>
              <dd data-price={shipping.toFixed(2)}>{shipping === 0 ? 'Grátis' : money(shipping)}</dd>
            </div>
            <div className="flex justify-between border-t pt-5 text-lg font-bold">
              <dt>Total</dt>
              <dd data-price={total.toFixed(2)}>{money(total)}</dd>
            </div>
          </dl>
          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Compra protegida e dados criptografados.
          </div>
          <div className="mt-6 grid gap-3 border-t pt-5">
            <button
              type="button"
              data-testid={TID.placeOrder}
              onClick={placeOrder}
              disabled={placing}
              className="rounded-lg bg-primary px-6 py-4 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {primaryCta}
            </button>
            <Link to={config.catalogPath} className="text-center text-sm text-muted-foreground hover:text-foreground">
              Voltar ao carrinho
            </Link>
          </div>
        </aside>
      </div>
    </main>
  )
}
