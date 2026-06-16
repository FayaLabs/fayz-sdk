import React from 'react'
import { CreditCard, LogOut, MapPin, Package, ShieldCheck, User } from 'lucide-react'
import { signOutCustomer } from '../auth'
import { useStorefrontConfig } from '../config'
import { Link } from '../router'
import { useSessionStore } from '../stores/session.store'
import { TID } from '../testids'

export type AccountSection = 'profile' | 'orders' | 'addresses' | 'payments'

interface CustomerAccountShellProps {
  title: string
  subtitle?: string
  active: AccountSection
  /** Switch the active section in-place. */
  onSelect?: (section: AccountSection) => void
  children: React.ReactNode
}

const menuItems = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'orders', label: 'Meus pedidos', icon: Package },
  { id: 'addresses', label: 'Endereços', icon: MapPin },
  { id: 'payments', label: 'Pagamentos', icon: CreditCard },
] as const

export function CustomerAccountShell({ title, subtitle, active, onSelect, children }: CustomerAccountShellProps) {
  const config = useStorefrontConfig()
  const session = useSessionStore()
  const displayName = session.name || session.email?.split('@')[0] || 'Cliente'
  const displayEmail = session.email || 'Conta criada no checkout'

  return (
    <main data-testid={TID.customerAccountShell} className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{config.name}</p>
          <h1 className="sf-heading text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <Link to={config.catalogPath} className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted">
          Voltar à loja
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="h-fit rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{displayEmail}</p>
            </div>
          </div>

          <nav data-testid={TID.customerAccountMenu} className="mt-4 space-y-1" aria-label="Área do cliente">
            {menuItems.map((item) => {
              const Icon = item.icon
              const selected = item.id === active
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={selected ? 'page' : undefined}
                  onClick={() => onSelect?.(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
                    selected ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              )
            })}
          </nav>

          <div className="mt-4 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Conta protegida
            </div>
            <p className="mt-1">Pedidos, pagamentos e endereços ficam organizados para próximas compras.</p>
          </div>

          <button
            type="button"
            data-testid={TID.signout}
            onClick={() => void signOutCustomer()}
            className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </aside>

        <section className="min-w-0">{children}</section>
      </div>
    </main>
  )
}
