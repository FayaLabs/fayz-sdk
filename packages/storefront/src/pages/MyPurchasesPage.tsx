import React, { useState } from 'react'
import { Package } from 'lucide-react'
import { useSessionStore } from '../stores/session.store'
import { establishCustomerSession, signUpCustomer, signOutCustomer } from '../auth'
import { useMyOrders } from '../hooks/useMyOrders'
import { useStorefrontConfig } from '../config'
import { Link } from '../router'
import { formatMoney } from '../format'
import { TID } from '../testids'

const FINANCIAL_LABEL: Record<string, string> = {
  paid: 'Pago',
  pending: 'Pendente',
  refunded: 'Reembolsado',
  partially_refunded: 'Parcialmente reembolsado',
  voided: 'Cancelado',
}

function SignInForm() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <div className="mx-auto max-w-sm rounded-2xl border bg-card p-6">
      <h2 className="text-lg font-semibold">Acessar minhas compras</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Informe o e-mail usado nos seus pedidos.
      </p>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!email.trim()) return
          setBusy(true)
          try {
            await signInByEmail(email)
          } finally {
            setBusy(false)
          }
        }}
      >
        <input
          data-testid={TID.signinEmail}
          type="email"
          required
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          data-testid={TID.signinSubmit}
          disabled={busy}
          className="w-full rounded-xl bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {busy ? 'Entrando…' : 'Entrar'}
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
        <SignInForm />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas compras</h1>
          <p className="text-sm text-muted-foreground">{session.email}</p>
        </div>
        <button
          type="button"
          data-testid={TID.signout}
          onClick={() => void signOutCustomer()}
          className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Sair
        </button>
      </div>

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
    </main>
  )
}
