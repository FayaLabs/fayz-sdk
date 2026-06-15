import React, { useEffect, useState } from 'react'
import {
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Home,
  Lock,
  PackageCheck,
  ShieldCheck,
} from 'lucide-react'
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

type CheckoutStep = 'contact' | 'delivery' | 'payment'

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

const STEPS: Array<{ id: CheckoutStep; label: string }> = [
  { id: 'contact', label: 'Contato' },
  { id: 'delivery', label: 'Entrega' },
  { id: 'payment', label: 'Pagamento' },
]

const SAVED_ADDRESSES = [
  { id: 'home', label: 'Casa', street: 'Rua das Flores, 123', city: 'São Paulo', zip: '01310-100' },
  { id: 'work', label: 'Trabalho', street: 'Av. Paulista, 1000', city: 'São Paulo', zip: '01310-200' },
]

const SAVED_PAYMENT_METHODS = [
  { id: 'visa', label: 'Visa final 4242', card: '4242 4242 4242 4242', expiry: '12/29', cvc: '123' },
  { id: 'mastercard', label: 'Mastercard final 5555', card: '5555 5555 5555 4444', expiry: '11/28', cvc: '321' },
]

const PROCESSING_STEPS = [
  { icon: Lock, label: 'Validando seus dados...' },
  { icon: CreditCard, label: 'Processando pagamento...' },
  { icon: PackageCheck, label: 'Confirmando seu pedido...' },
]

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
      <div className="mt-5 flex gap-1.5">
        {PROCESSING_STEPS.map((_, index) => (
          <span
            key={index}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index <= step ? 'w-8 bg-primary' : 'w-4 bg-muted'
            }`}
          />
        ))}
      </div>
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
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        data-testid={testId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
        {...props}
      />
    </label>
  )
}

function Stepper({ step }: { step: CheckoutStep }) {
  const activeIndex = STEPS.findIndex((item) => item.id === step)
  return (
    <ol className="grid gap-2 sm:grid-cols-3">
      {STEPS.map((item, index) => {
        const done = index < activeIndex
        const active = item.id === step
        return (
          <li
            key={item.id}
            className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${
              active ? 'border-primary bg-primary/5 text-primary' : done ? 'border-border bg-muted/40' : 'border-border text-muted-foreground'
            }`}
          >
            {done ? <CheckCircle2 className="h-4 w-4" /> : <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs">{index + 1}</span>}
            <span className="font-medium">{item.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function CheckoutPage() {
  const config = useStorefrontConfig()
  const cart = useCartStore()
  const session = useSessionStore()

  const [step, setStep] = useState<CheckoutStep>('contact')
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

  function validate(nextStep?: CheckoutStep): boolean {
    setError(null)
    if (!form.email.trim() || !/.+@.+\..+/.test(form.email)) {
      setError('Informe um e-mail válido.')
      setStep('contact')
      return false
    }
    if (!form.name.trim()) {
      setError('Informe seu nome completo.')
      setStep('contact')
      return false
    }
    if ((step !== 'contact' || nextStep === 'payment') && (!form.street.trim() || !form.city.trim() || !form.zip.trim())) {
      setError('Preencha ou selecione o endereço de entrega.')
      setStep('delivery')
      return false
    }
    if (!nextStep && (!/^\d{16}$/.test(form.card.replace(/\s+/g, '')) || !form.expiry.trim() || !form.cvc.trim())) {
      setError('Selecione ou preencha um método de pagamento válido.')
      setStep('payment')
      return false
    }
    return true
  }

  function advance(nextStep: CheckoutStep) {
    if (!validate(nextStep)) return
    setError(null)
    setStep(nextStep)
  }

  async function placeOrder() {
    if (!validate()) return

    setPlacing(true)
    setProcessingStep(0)
    const stepMs = prefersReducedMotion() ? 120 : 700
    const stepTimers = [
      setTimeout(() => setProcessingStep(1), stepMs),
      setTimeout(() => setProcessingStep(2), stepMs * 2),
    ]
    const minDuration = sleep(stepMs * 3)
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

  const selectedAddress = SAVED_ADDRESSES.find((address) =>
    address.street === form.street && address.city === form.city && address.zip === form.zip
  )
  const selectedPayment = SAVED_PAYMENT_METHODS.find((method) =>
    method.card === form.card && method.expiry === form.expiry
  )

  return (
    <main className="min-h-screen bg-background">
      {placing && <ProcessingOverlay step={processingStep} />}
      <header className="border-b bg-background/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Checkout seguro</p>
            <h1 className="sf-heading text-xl font-bold tracking-tight">{config.name}</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Pagamento protegido
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="sf-heading text-3xl font-bold tracking-tight">Finalizar compra</h2>
              <p className="mt-2 text-sm text-muted-foreground">Etapas curtas, dados salvos e mínimo de distração até o pagamento.</p>
            </div>
            <Link to={config.catalogPath} className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted">
              Voltar à loja
            </Link>
          </div>

          <Stepper step={step} />

          <div className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
            {step === 'contact' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Identificação</h3>
                  <p className="text-sm text-muted-foreground">Usamos seu e-mail para recibo, rastreio e próximas compras.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {field('E-mail', TID.checkoutEmail, form.email, set('email'), { type: 'email', placeholder: 'voce@exemplo.com' })}
                  {field('Nome completo', TID.checkoutName, form.name, set('name'), { placeholder: 'Seu nome' })}
                </div>
                <button
                  type="button"
                  onClick={() => advance('delivery')}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
                >
                  Continuar para entrega <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {step === 'delivery' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold">Entrega</h3>
                  <p className="text-sm text-muted-foreground">Escolha um endereço salvo ou informe um novo.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SAVED_ADDRESSES.map((address) => (
                    <button
                      key={address.id}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, street: address.street, city: address.city, zip: address.zip }))}
                      className={`rounded-2xl border p-4 text-left transition hover:bg-muted/50 ${
                        selectedAddress?.id === address.id ? 'border-primary bg-primary/5' : 'border-border bg-background'
                      }`}
                    >
                      <span className="flex items-center gap-2 font-semibold"><Home className="h-4 w-4" />{address.label}</span>
                      <span className="mt-2 block text-sm text-muted-foreground">{address.street}</span>
                      <span className="block text-sm text-muted-foreground">{address.city} - {address.zip}</span>
                    </button>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    {field('Endereço', TID.checkoutStreet, form.street, set('street'), { placeholder: 'Rua, número' })}
                  </div>
                  {field('Cidade', TID.checkoutCity, form.city, set('city'))}
                  {field('CEP', TID.checkoutZip, form.zip, set('zip'), { placeholder: '00000-000' })}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => setStep('contact')} className="rounded-full border px-5 py-3 text-sm font-semibold hover:bg-muted">
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => advance('payment')}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
                  >
                    Continuar para pagamento <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 'payment' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold">Pagamento</h3>
                  <p className="text-sm text-muted-foreground">Escolha um cartão salvo ou use outro método.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SAVED_PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, card: method.card, expiry: method.expiry, cvc: method.cvc }))}
                      className={`rounded-2xl border p-4 text-left transition hover:bg-muted/50 ${
                        selectedPayment?.id === method.id ? 'border-primary bg-primary/5' : 'border-border bg-background'
                      }`}
                    >
                      <span className="flex items-center gap-2 font-semibold"><CreditCard className="h-4 w-4" />{method.label}</span>
                      <span className="mt-2 block text-sm text-muted-foreground">Expira em {method.expiry}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Pagamento de demonstração - nenhuma cobrança é feita.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    {field('Número do cartão', TID.checkoutCard, form.card, set('card'), {
                      placeholder: '4242 4242 4242 4242',
                      inputMode: 'numeric',
                    })}
                  </div>
                  {field('Validade', TID.checkoutExpiry, form.expiry, set('expiry'), { placeholder: 'MM/AA' })}
                  {field('CVC', TID.checkoutCvc, form.cvc, set('cvc'), { placeholder: '123', inputMode: 'numeric' })}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => setStep('delivery')} className="rounded-full border px-5 py-3 text-sm font-semibold hover:bg-muted">
                    Voltar
                  </button>
                  <button
                    type="button"
                    data-testid={TID.placeOrder}
                    onClick={placeOrder}
                    disabled={placing}
                    className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                  >
                    {placing ? 'Processando...' : `Pagar ${money(total)}`}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p data-testid={TID.checkoutError} className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        </section>

        <aside className="h-fit rounded-3xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Resumo do pedido</h2>
          <ul className="mt-4 space-y-4">
            {cart.lines.map((line) => (
              <li key={line.productId} className="flex gap-3 text-sm">
                {line.imageUrl && <img src={line.imageUrl} alt={line.name} className="h-14 w-14 rounded-2xl border object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{line.name}</p>
                  <p className="text-muted-foreground">Qtd. {line.quantity}</p>
                </div>
                <span data-price={(line.unitPrice * line.quantity).toFixed(2)}>
                  {money(line.unitPrice * line.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2 border-t pt-5 text-sm">
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
              <dt className="text-muted-foreground">Frete</dt>
              <dd data-price={shipping.toFixed(2)}>{shipping === 0 ? 'Grátis' : money(shipping)}</dd>
            </div>
            <div className="flex justify-between border-t pt-3 text-base font-bold">
              <dt>Total</dt>
              <dd data-price={total.toFixed(2)}>{money(total)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </main>
  )
}
