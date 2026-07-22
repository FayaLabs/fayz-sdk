import React, { useEffect, useState } from 'react'
import { CreditCard, Lock, PackageCheck, ShieldCheck } from 'lucide-react'
import { getShopProvider } from '@fayz-ai/shop/runtime'
import { formatPostalCode, normalizePostalCode, lookupPostalCode } from '@fayz-ai/core'
import type { CustomerAddress, PaymentMethodKind } from '@fayz-ai/shop/types'
import { prefersReducedMotion } from '../motion'
import {
  useCartStore,
  selectSubtotal,
  selectDiscountTotal,
  selectShipping,
  selectTotal,
} from '../stores/cart.store'
import { useSessionStore } from '../stores/session.store'
import { useDeliveryStore } from '../stores/delivery.store'
import { useStorefrontConfig } from '../config'
import { Link, navigateTo } from '../router'
import { formatMoney } from '../format'
import { TID } from '../testids'
import { placeStorefrontOrder } from '../workflows/checkout'
import { useDiscountValidator } from '../hooks/useDiscountValidator'
import { toast } from '../stores/toast.store'
import { useStorefrontHead } from '../hooks/useStorefrontHead'
import { SignInModal } from '../components/SignInModal'
import { SmoothImage } from '../components/SmoothImage'

interface CheckoutForm {
  email: string
  name: string
  street: string
  city: string
  zip: string
  number: string
  complement: string
  district: string
  state: string
}

type AddressMode = 'saved' | 'new'

/**
 * There is no payment service provider connected, so the checkout does not ask
 * for a card number. It used to, prefilled with 4242 4242 4242 4242, and the
 * digits were validated and then thrown away — a PAN typed into React state
 * that reaches no processor is a liability with no upside. The buyer states how
 * they intend to pay; the order stays `pending` until the merchant confirms the
 * money arrived (shop_confirm_payment, which since 0019 only they can call).
 */
const PAYMENT_LABELS: Record<PaymentMethodKind, { label: string; hint: string }> = {
  pix:         { label: 'Pix',                  hint: 'Você recebe a chave para pagar após confirmar o pedido' },
  credit_card: { label: 'Cartão de crédito',    hint: 'Maquininha na entrega' },
  debit_card:  { label: 'Cartão de débito',     hint: 'Maquininha na entrega' },
  boleto:      { label: 'Boleto',               hint: 'Enviado por e-mail após a confirmação' },
  cash:        { label: 'Dinheiro',             hint: 'Pagamento na entrega' },
  other:       { label: 'Combinar com a loja',  hint: 'A loja entra em contato para acertar o pagamento' },
}

const PROCESSING_STEPS = [
  { icon: Lock, label: 'Validando seus dados...' },
  { icon: PackageCheck, label: 'Registrando seu pedido...' },
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
  const delivery = useDeliveryStore()
  const validateDiscount = useDiscountValidator()
  useStorefrontHead({ title: `Checkout — ${config.name}` })

  const paymentMethods = config.payments.methods
  const [selectedAddressId, setSelectedAddressId] = useState('new')
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([])
  // 'new' until the address book actually loads: an empty book must show an
  // empty form, never a placeholder address belonging to nobody.
  const [addressMode, setAddressMode] = useState<AddressMode>('new')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKind>(paymentMethods[0] ?? 'pix')
  const [form, setForm] = useState<CheckoutForm>({
    email: session.email ?? '',
    name: session.name ?? '',
    street: '',
    city: '',
    zip: '',
    number: '',
    complement: '',
    district: '',
    state: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [discountCode, setDiscountCode] = useState('')
  const [discountError, setDiscountError] = useState<string | null>(null)
  const [discountSuccess, setDiscountSuccess] = useState<string | null>(null)
  const [applyingDiscount, setApplyingDiscount] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0)
  const [showSignin, setShowSignin] = useState(false)
  const [zipLookup, setZipLookup] = useState<'idle' | 'loading' | 'found' | 'not-found'>('idle')

  const subtotal = selectSubtotal(cart)
  const discountTotal = selectDiscountTotal(cart)
  const shipping = selectShipping(cart, config)
  const total = selectTotal(cart, config)
  const money = (value: number) => formatMoney(value, config.currency, config.locale)

  useEffect(() => {
    if (cart.lines.length === 0 && !placing) navigateTo(config.catalogPath)
  }, [cart.lines.length, config.catalogPath, placing])


  const set = (key: keyof CheckoutForm) => (value: string) => setForm((current) => ({ ...current, [key]: value }))

  /**
   * Editing the CEP re-fetches the address and refills what the postal service
   * knows, leaving number and complement alone — those are the buyer's and must
   * survive a correction to the postcode.
   *
   * Only what the lookup can supply is overwritten. Silently keeping a stale
   * street from a previous CEP is worse than an empty one: the parcel goes to
   * the wrong place and everything on screen looks filled in.
   */
  async function setZip(value: string) {
    const masked = formatPostalCode(value)
    setForm((current) => ({ ...current, zip: masked }))
    if (normalizePostalCode(masked).length !== 8) {
      setZipLookup('idle')
      return
    }
    setZipLookup('loading')
    try {
      const found = await lookupPostalCode(masked)
      if (!found) {
        setZipLookup('not-found')
        return
      }
      setZipLookup('found')
      setForm((current) => ({
        ...current,
        street: found.street || current.street,
        district: found.district || current.district,
        city: found.city,
        state: found.state,
      }))
    } catch {
      // Offline or the provider is down — the buyer can still type it out.
      setZipLookup('idle')
    }
  }

  async function applyDiscountCode() {
    setApplyingDiscount(true)
    setDiscountError(null)
    setDiscountSuccess(null)
    try {
      const appliedCode = discountCode.trim().toUpperCase()
      const result = await validateDiscount(discountCode)
      if (result.valid) {
        cart.applyDiscount(appliedCode, result.percent)
        setDiscountCode(appliedCode)
        setDiscountSuccess(`${appliedCode} aplicado: ${result.percent}% de desconto.`)
        toast.success('Cupom aplicado!', `${appliedCode} • ${result.percent}% de desconto`)
      } else {
        setDiscountError(result.message ?? 'Cupom inválido.')
        toast.error('Cupom inválido', result.message ?? 'Verifique o código e tente novamente.')
      }
    } finally {
      setApplyingDiscount(false)
    }
  }

  function clearDiscountCode() {
    cart.clearDiscount()
    setDiscountCode('')
    setDiscountSuccess(null)
    setDiscountError(null)
  }

  // The signed-in shopper's real address book. RLS scopes it to them, so a
  // guest (or a customer whose account was never linked to an auth identity)
  // simply gets nothing back and types their address.
  useEffect(() => {
    const customerId = session.customerId
    if (!customerId) {
      setSavedAddresses([])
      setAddressMode('new')
      return
    }
    let cancelled = false
    const provider = getShopProvider()
    void provider
      .listCustomerAddresses?.(customerId)
      .then((addresses) => {
        if (cancelled || addresses.length === 0) return
        setSavedAddresses(addresses)
        applySavedAddress(addresses[0]!)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [session.customerId])

  /**
   * The CEP given back on the product page lands here.
   *
   * This is the payoff of the whole delivery flow: street, district, city and
   * UF arrive filled and the buyer types a house number. It only fires when no
   * saved address was selected — a signed-in shopper's own address book still
   * wins over a postcode lookup, because it also knows their number and
   * complement, which no postal service can supply.
   */
  useEffect(() => {
    if (addressMode !== 'new') return
    const looked = delivery.address
    if (!looked) return
    setForm((current) => {
      if (current.zip.trim() || current.street.trim()) return current
      return {
        ...current,
        zip: formatPostalCode(looked.postalCode),
        street: looked.street,
        district: looked.district,
        city: looked.city,
        state: looked.state,
      }
    })
  }, [delivery.address, addressMode])

  function applySavedAddress(address: CustomerAddress) {
    setAddressMode('saved')
    setSelectedAddressId(address.id)
    setForm((current) => ({
      ...current,
      street: address.street,
      city: address.city,
      zip: address.postalCode,
      number: address.number ?? '',
      complement: address.complement ?? '',
      district: address.district ?? '',
      state: address.state,
    }))
  }

  function selectAddress(addressId: string) {
    const address = savedAddresses.find((item) => item.id === addressId)
    if (address) applySavedAddress(address)
  }

  function addNewAddress() {
    setAddressMode('new')
    setSelectedAddressId('new')
    setForm((current) => ({ ...current, street: '', city: '', zip: '', number: '', complement: '', district: '', state: '' }))
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
    // Number and district are required because a courier cannot deliver without
    // them; the old form collected only street/city/CEP and logistics had to guess.
    if (!form.street.trim() || !form.city.trim() || !form.zip.trim() || !form.district.trim()) {
      setError('Preencha ou selecione o endereço de entrega.')
      return false
    }
    // Called out on its own: with the CEP filling everything else, the number is
    // usually the only thing missing, and "preencha o endereço" sent people
    // hunting through fields that were already correct.
    if (!form.number.trim()) {
      setError('Falta o número do endereço.')
      return false
    }
    // UF is required now: 117 of the 266 addresses already in the pool have no
    // state, and a carrier cannot quote or ship without one.
    if (form.state.trim().length !== 2) {
      setError('Informe a UF com duas letras (ex.: RJ).')
      return false
    }
    // Coverage. shop_place_order refuses an unserved postal code anyway (0021),
    // so this only turns a raw SQL error into a sentence the buyer can act on —
    // the rule itself lives on the server, not here.
    if (delivery.status === 'unserved' && delivery.postalCode === normalizePostalCode(form.zip)) {
      setError('Ainda não entregamos nesse CEP. Tente outro endereço.')
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
        shippingAddress: {
          postalCode: form.zip.trim(),
          street: form.street.trim(),
          number: form.number.trim() || undefined,
          complement: form.complement.trim() || undefined,
          district: form.district.trim() || undefined,
          city: form.city.trim(),
          state: form.state.trim().toUpperCase(),
        },
        // The method the buyer actually chose, which opens the ledger row in
        // public.transactions with the right kind.
        paymentMethod,
        // Never marked paid from the browser. It used to be, through an RPC that
        // was granted to anon — so any buyer holding their own order id could
        // declare it settled. The order is now born `pending` and only the
        // merchant (or a PSP webhook) can confirm the money arrived.
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
      {showSignin && !session.email && (
        <SignInModal
          defaultEmail={form.email}
          onClose={() => setShowSignin(false)}
          onSignedIn={(signed) =>
            setForm((current) => ({ ...current, email: signed.email ?? current.email, name: signed.name || current.name }))
          }
        />
      )}
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
                {session.email ? (
                  <span className="text-sm text-muted-foreground">Conectado como {session.email}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSignin((value) => !value)}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Já tem conta? Entrar
                  </button>
                )}
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
                      <span className="mt-1 block text-muted-foreground">
                        {[address.street, address.number].filter(Boolean).join(', ')}
                        {address.complement ? ` — ${address.complement}` : ''}
                      </span>
                      <span className="block text-muted-foreground">
                        {[address.district, address.city, address.state].filter(Boolean).join(' · ')} — {address.postalCode}
                      </span>
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
                  <span className="block font-semibold text-primary">
                    {savedAddresses.length > 0 ? '+ Adicionar novo endereço' : 'Informe o endereço de entrega'}
                  </span>
                  <span className="mt-1 block text-muted-foreground">Preencher outro endereço para esta compra</span>
                </button>
              </div>
              {addressMode === 'new' && (
                <div className="grid gap-3">
                  {/* CEP first, because it FILLS the fields below it. With it at
                      the bottom the buyer typed street, district, city and UF by
                      hand and only then reached the one field that would have
                      supplied all four — and editing it later has to refill
                      them, which reads as the form rewriting itself. */}
                  <div className="grid gap-1 sm:grid-cols-[200px_1fr] sm:items-center">
                    {field('CEP', TID.checkoutZip, form.zip, setZip, {
                      placeholder: 'CEP',
                      inputMode: 'numeric',
                      autoComplete: 'postal-code',
                    })}
                    <p className="px-1 text-xs text-muted-foreground">
                      {zipLookup === 'loading' ? 'Buscando endereço…'
                        : zipLookup === 'not-found' ? 'CEP não encontrado — preencha o endereço à mão.'
                        : 'Preenchemos o endereço para você.'}
                    </p>
                  </div>
                  {field('Endereço', TID.checkoutStreet, form.street, set('street'), { placeholder: 'Rua, avenida…' })}
                  <div className="grid grid-cols-2 gap-3">
                    {field('Número', 'checkout-number', form.number, set('number'), { placeholder: 'Número' })}
                    {field('Complemento', 'checkout-complement', form.complement, set('complement'), { placeholder: 'Apto, bloco (opcional)' })}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {field('Bairro', 'checkout-district', form.district, set('district'), { placeholder: 'Bairro' })}
                    {field('UF', 'checkout-state', form.state, set('state'), { placeholder: 'UF' })}
                  </div>
                  {field('Cidade', TID.checkoutCity, form.city, set('city'), { placeholder: 'Cidade' })}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold tracking-tight">Pagamento</h2>
              <div className="mb-3 grid gap-3" role="radiogroup" aria-label="Forma de pagamento">
                {paymentMethods.map((method) => {
                  const copy = PAYMENT_LABELS[method]
                  const selected = paymentMethod === method
                  return (
                    <button
                      key={method}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      data-testid={`checkout-payment-${method}`}
                      onClick={() => setPaymentMethod(method)}
                      className={`rounded-lg border p-3 text-left text-sm transition hover:bg-muted/40 ${
                        selected ? 'border-primary bg-primary/5' : 'border-border bg-background'
                      }`}
                    >
                      <span className="flex items-center justify-between gap-3 font-semibold">
                        <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" />{copy.label}</span>
                        {selected && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">Selecionado</span>
                        )}
                      </span>
                      <span className="mt-1 block text-muted-foreground">{copy.hint}</span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Nenhuma cobrança é feita agora. Seu pedido é registrado e a loja confirma o pagamento.
              </p>
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
              <li key={line.lineId ?? line.productId} className="flex gap-3 text-sm">
                <div className="relative h-16 w-16 flex-none overflow-hidden rounded-lg border bg-background">
                  {line.imageUrl && <SmoothImage src={line.imageUrl} alt={line.name} className="h-full w-full object-cover" />}
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-muted-foreground px-1.5 text-[10px] font-bold text-background">
                    {line.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{line.name}</p>
                  {line.sku && <p className="text-xs text-muted-foreground">{line.sku}</p>}
                  {line.optionsLabel && <p className="text-xs text-muted-foreground">{line.optionsLabel}</p>}
                </div>
                <span data-price={(line.unitPrice * line.quantity).toFixed(2)}>
                  {money(line.unitPrice * line.quantity)}
                </span>
              </li>
            ))}
          </ul>
          {config.features.discounts && (
            <div className="mt-5 space-y-2 border-t pt-5">
              <div className="flex gap-2">
                <input
                  data-testid={TID.discountInput}
                  type="text"
                  placeholder="Cupom de desconto"
                  value={discountCode}
                  onChange={(event) => {
                    setDiscountCode(event.target.value)
                    setDiscountSuccess(null)
                    setDiscountError(null)
                  }}
                  className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm uppercase"
                />
                <button
                  type="button"
                  data-testid={TID.discountApply}
                  onClick={applyDiscountCode}
                  disabled={applyingDiscount || !discountCode.trim()}
                  className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
                >
                  Aplicar
                </button>
              </div>
              {discountError && (
                <p data-testid={TID.discountError} className="text-xs text-destructive">
                  {discountError}
                </p>
              )}
              {discountSuccess && (
                <p className="text-xs font-semibold text-emerald-700">
                  {discountSuccess}
                </p>
              )}
            </div>
          )}
          <dl className="mt-8 space-y-3 border-t pt-6 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd data-price={subtotal.toFixed(2)}>{money(subtotal)}</dd>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-emerald-700" data-testid={TID.discountRow}>
                <dt>
                  Desconto{' '}
                  <button
                    type="button"
                    onClick={clearDiscountCode}
                    className="text-xs text-muted-foreground underline"
                  >
                    ({cart.discountCode} ×)
                  </button>
                </dt>
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
