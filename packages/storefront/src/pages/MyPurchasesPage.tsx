import React, { useState } from 'react'
import { CreditCard, MapPin, Package, QrCode } from 'lucide-react'
import { getShopProvider } from '@fayz-ai/shop/runtime'
import { useSessionStore } from '../stores/session.store'
import { establishCustomerSession, signUpCustomer } from '../auth'
import { useMyOrders } from '../hooks/useMyOrders'
import { useStorefrontConfig } from '../config'
import { Link } from '../router'
import { formatMoney } from '../format'
import { TID } from '../testids'
import { CustomerAccountShell, type AccountSection } from '../components/CustomerAccountShell'
import { OrderTrackingTimeline } from '../components/OrderTrackingTimeline'
import { financialStatusBadge } from '../order-status'
import { useStorefrontHead } from '../hooks/useStorefrontHead'
import { SmoothImage } from '../components/SmoothImage'

function AuthForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) return
    if (mode === 'signup' && !name.trim()) {
      setError('Informe seu nome.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'signup') await signUpCustomer(email, password, name.trim())
      else await establishCustomerSession(email, { password })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar. Verifique seus dados.')
    } finally {
      setBusy(false)
    }
  }

  const tab = (id: 'signin' | 'signup', label: string, testId: string) => (
    <button
      type="button"
      data-testid={testId}
      onClick={() => {
        setMode(id)
        setError(null)
      }}
      className={`flex-1 border-b-2 pb-2.5 text-sm font-semibold transition-colors ${
        mode === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="mx-auto max-w-sm animate-fade-up border bg-card p-7" style={{ borderRadius: 'var(--sf-radius-card)' }}>
      <h2 className="sf-heading text-xl font-semibold">Minha conta</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Acompanhe pedidos e acelere seus próximos checkouts.
      </p>
      <div className="mt-5 flex gap-2">
        {tab('signin', 'Entrar', TID.authTabSignin)}
        {tab('signup', 'Criar conta', TID.authTabSignup)}
      </div>
      <form className="mt-5 space-y-3" onSubmit={submit}>
        {mode === 'signup' && (
          <input
            data-testid={TID.signinName}
            type="text"
            required
            placeholder="Nome completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border bg-background px-3 py-2.5 text-sm"
            style={{ borderRadius: 'var(--sf-radius-input)' }}
          />
        )}
        <input
          data-testid={TID.signinEmail}
          type="email"
          required
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border bg-background px-3 py-2.5 text-sm"
          style={{ borderRadius: 'var(--sf-radius-input)' }}
        />
        <input
          data-testid={TID.signinPassword}
          type="password"
          required
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border bg-background px-3 py-2.5 text-sm"
          style={{ borderRadius: 'var(--sf-radius-input)' }}
        />
        {error && (
          <p data-testid={TID.authError} className="text-sm text-destructive">{error}</p>
        )}
        <button
          type="submit"
          data-testid={TID.signinSubmit}
          disabled={busy}
          className="sf-cta w-full bg-primary py-3 font-semibold text-primary-foreground shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
          style={{ borderRadius: 'var(--sf-radius-button)' }}
        >
          {busy ? 'Entrando…' : mode === 'signup' ? 'Criar conta' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

function OrdersPanel() {
  const config = useStorefrontConfig()
  const { orders, loading } = useMyOrders()
  const money = (v: number) => formatMoney(v, config.currency, config.locale)

  if (loading) return <div className="py-16 text-center text-muted-foreground">Carregando…</div>
  if (orders.length === 0) {
    return (
      <div data-testid={TID.purchasesEmpty} className="rounded-2xl border bg-card py-16 text-center">
        <Package className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-muted-foreground">Você ainda não tem pedidos.</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">Explorar a loja</Link>
      </div>
    )
  }
  return (
    <ul data-testid={TID.purchasesList} className="space-y-4">
      {orders.map((order) => (
        <li
          key={order.id}
          data-testid={TID.purchaseItem}
          data-order-number={order.orderNumber}
          className="rounded-2xl border bg-card p-5"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold">Pedido #{order.orderNumber}</span>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${financialStatusBadge(order.financialStatus).className}`}>
              {financialStatusBadge(order.financialStatus).label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString(config.locale)}
          </p>
          <div className="mt-4">
            <OrderTrackingTimeline order={order} compact />
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 rounded-lg border px-2 py-1 text-xs">
                {item.imageUrl && <SmoothImage src={item.imageUrl} alt={item.name} className="h-6 w-6 rounded object-cover" />}
                {item.name} × {item.quantity}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
            <Link to={`/order/${order.id}`} className="font-medium text-primary hover:underline">
              Ver detalhes
            </Link>
            <span>
              <span className="mr-2 text-muted-foreground">Total</span>
              <span className="font-semibold" data-price={order.total.toFixed(2)}>{money(order.total)}</span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

function ProfilePanel() {
  const session = useSessionStore()
  const [name, setName] = useState(session.name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    setSaved(false)
    try {
      if (session.customerId) {
        const parts = trimmed.split(/\s+/).filter(Boolean)
        await getShopProvider().updateCustomer(session.customerId, {
          firstName: parts[0] ?? trimmed,
          lastName: parts.slice(1).join(' '),
        })
      }
      useSessionStore.setState({ name: trimmed })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="max-w-md rounded-2xl border bg-card p-6">
      <h2 className="sf-heading text-lg font-semibold">Perfil</h2>
      <p className="mt-1 text-sm text-muted-foreground">Seus dados para os próximos checkouts.</p>
      <label className="mt-5 block text-sm font-medium">
        Nome completo
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); setSaved(false) }}
          className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
          placeholder="Seu nome"
        />
      </label>
      <label className="mt-4 block text-sm font-medium">
        E-mail
        <input
          value={session.email ?? ''}
          readOnly
          className="mt-1 w-full cursor-not-allowed rounded-lg border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground"
        />
      </label>
      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="sf-cta rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
        {saved && <span className="text-sm font-medium text-emerald-700">Salvo</span>}
      </div>
    </form>
  )
}

function AddressesPanel() {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        <h2 className="sf-heading text-lg font-semibold">Endereços</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Você informa o endereço de entrega no checkout. Em breve será possível salvar endereços para reutilizar
        nas próximas compras.
      </p>
      <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary underline">
        Continuar comprando
      </Link>
    </div>
  )
}

function PaymentsPanel() {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        <h2 className="sf-heading text-lg font-semibold">Pagamentos</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Os pagamentos são processados com segurança no checkout — nenhum dado de pagamento fica salvo nesta conta.
      </p>
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-sm">
        <QrCode className="h-4 w-4 text-primary" />
        <span>Pix e cartão via Mercado Pago no momento da compra.</span>
      </div>
    </div>
  )
}

const SECTION_SUBTITLE: Record<AccountSection, string> = {
  profile: 'Seus dados de contato.',
  orders: 'Acompanhe seus pedidos e entregas.',
  addresses: 'Endereços de entrega.',
  payments: 'Como você paga na loja.',
}

export function MyPurchasesPage() {
  const config = useStorefrontConfig()
  const session = useSessionStore()
  const [section, setSection] = useState<AccountSection>('orders')
  useStorefrontHead({ title: `Minha conta — ${config.name}` })

  if (!session.email) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <AuthForm />
      </main>
    )
  }

  return (
    <CustomerAccountShell
      title="Minha conta"
      subtitle={SECTION_SUBTITLE[section]}
      active={section}
      onSelect={setSection}
    >
      {section === 'profile' && <ProfilePanel />}
      {section === 'orders' && <OrdersPanel />}
      {section === 'addresses' && <AddressesPanel />}
      {section === 'payments' && <PaymentsPanel />}
    </CustomerAccountShell>
  )
}
