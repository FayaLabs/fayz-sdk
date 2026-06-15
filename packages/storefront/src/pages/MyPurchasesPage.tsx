import React, { useState } from 'react'
import { Package } from 'lucide-react'
import { useSessionStore } from '../stores/session.store'
import { establishCustomerSession, signUpCustomer } from '../auth'
import { useMyOrders } from '../hooks/useMyOrders'
import { useStorefrontConfig } from '../config'
import { Link } from '../router'
import { formatMoney } from '../format'
import { TID } from '../testids'
import { CustomerAccountShell } from '../components/CustomerAccountShell'
import { OrderTrackingTimeline } from '../components/OrderTrackingTimeline'

const FINANCIAL_LABEL: Record<string, string> = {
  paid: 'Pago',
  pending: 'Pendente',
  refunded: 'Reembolsado',
  partially_refunded: 'Parcialmente reembolsado',
  voided: 'Cancelado',
}

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

export function MyPurchasesPage() {
  const config = useStorefrontConfig()
  const session = useSessionStore()
  const { orders, loading } = useMyOrders()
  const money = (v: number) => formatMoney(v, config.currency, config.locale)

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
      subtitle="Acompanhe pedidos, dados de entrega e pagamentos."
      active="orders"
    >
      {loading ? (
        <div className="py-16 text-center text-muted-foreground">Carregando…</div>
      ) : orders.length === 0 ? (
        <div data-testid={TID.purchasesEmpty} className="rounded-2xl border bg-card py-16 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">Você ainda não tem pedidos.</p>
          <Link to="/" className="mt-4 inline-block text-primary underline">Explorar a loja</Link>
        </div>
      ) : (
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
                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                  {FINANCIAL_LABEL[order.financialStatus] ?? order.financialStatus}
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
                    {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="h-6 w-6 rounded object-cover" />}
                    {item.name} × {item.quantity}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold" data-price={order.total.toFixed(2)}>{money(order.total)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </CustomerAccountShell>
  )
}
