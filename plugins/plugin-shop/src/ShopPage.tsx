import React, { useEffect, useState, useCallback } from 'react'
import { getShopProvider } from '@fayz-ai/shop'
import type { Product, Order, ShopCustomer, Discount, ListProductsOptions, ShopProvider } from '@fayz-ai/shop'

export type ShopProviderResolver = ShopProvider | (() => ShopProvider)

export interface ShopPageProps {
  provider?: ShopProviderResolver
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function currency(value: number, code = 'BRL', locale = 'pt-BR') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(value)
}

function badge(label: string, color: string) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  draft: 'bg-gray-100 text-gray-700',
  archived: 'bg-orange-100 text-orange-700',
  open: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-700',
  paid: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-yellow-100 text-yellow-800',
  fulfilled: 'bg-emerald-100 text-emerald-800',
  unfulfilled: 'bg-gray-100 text-gray-700',
  'partially_fulfilled': 'bg-blue-100 text-blue-800',
}

function resolveShopProvider(provider?: ShopProviderResolver): ShopProvider {
  return typeof provider === 'function' ? provider() : provider ?? getShopProvider()
}

// ---------------------------------------------------------------------------
// Products tab
// ---------------------------------------------------------------------------

function ProductsTab({ provider }: ShopPageProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async (opts?: ListProductsOptions) => {
    setLoading(true)
    try {
      const data = await resolveShopProvider(provider).listProducts(opts)
      setProducts(data)
    } finally {
      setLoading(false)
    }
  }, [provider])

  useEffect(() => { load() }, [load])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setSearch(q)
    load(q ? { search: q } : undefined)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <input
          type="search" value={search} onChange={handleSearch}
          placeholder="Buscar produtos..."
          className="border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <span className="text-sm text-muted-foreground">{products.length} produtos</span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : products.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Produto</th>
                <th className="text-left px-4 py-3 font-medium">SKU</th>
                <th className="text-right px-4 py-3 font-medium">Preço</th>
                <th className="text-right px-4 py-3 font-medium">Estoque</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.sku ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{currency(p.price, p.currency)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={p.inventoryCount === 0 ? 'text-red-600 font-medium' : ''}>
                      {p.inventoryCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {badge(p.status, statusColors[p.status] ?? 'bg-gray-100 text-gray-700')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Orders tab
// ---------------------------------------------------------------------------

function OrdersTab({ provider }: ShopPageProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    resolveShopProvider(provider).listOrders({ limit: 50 }).then(setOrders).finally(() => setLoading(false))
  }, [provider])

  return (
    <div>
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : orders.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Nenhum pedido ainda.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Pedido</th>
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-left px-4 py-3 font-medium">Pagamento</th>
                <th className="text-left px-4 py-3 font-medium">Entrega</th>
                <th className="text-left px-4 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">#{o.orderNumber}</td>
                  <td className="px-4 py-3">{o.customerName ?? o.customerEmail ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">{currency(o.total, o.currency)}</td>
                  <td className="px-4 py-3">{badge(o.financialStatus, statusColors[o.financialStatus] ?? 'bg-gray-100 text-gray-700')}</td>
                  <td className="px-4 py-3">{badge(o.fulfillmentStatus, statusColors[o.fulfillmentStatus] ?? 'bg-gray-100 text-gray-700')}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Customers tab
// ---------------------------------------------------------------------------

function CustomersTab({ provider }: ShopPageProps) {
  const [customers, setCustomers] = useState<ShopCustomer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    resolveShopProvider(provider).listCustomers({ limit: 50 }).then(setCustomers).finally(() => setLoading(false))
  }, [provider])

  return (
    <div>
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : customers.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Nenhum cliente ainda.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Telefone</th>
                <th className="text-right px-4 py-3 font-medium">Pedidos</th>
                <th className="text-right px-4 py-3 font-medium">Total Gasto</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{c.firstName} {c.lastName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{c.ordersCount}</td>
                  <td className="px-4 py-3 text-right">{currency(c.totalSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Discounts tab
// ---------------------------------------------------------------------------

function DiscountsTab({ provider }: ShopPageProps) {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    resolveShopProvider(provider).listDiscounts({ limit: 50 }).then(setDiscounts).finally(() => setLoading(false))
  }, [provider])

  return (
    <div>
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : discounts.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Nenhum desconto cadastrado.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Título</th>
                <th className="text-left px-4 py-3 font-medium">Código</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-right px-4 py-3 font-medium">Valor</th>
                <th className="text-right px-4 py-3 font-medium">Usos</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {discounts.map(d => (
                <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{d.title}</td>
                  <td className="px-4 py-3 font-mono text-sm">{d.code ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.type}</td>
                  <td className="px-4 py-3 text-right">
                    {d.type === 'percentage' ? `${d.value}%` : currency(d.value)}
                  </td>
                  <td className="px-4 py-3 text-right">{d.timesUsed}{d.usageLimit ? ` / ${d.usageLimit}` : ''}</td>
                  <td className="px-4 py-3">{badge(d.status, statusColors[d.status] ?? 'bg-gray-100 text-gray-700')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'products',  label: 'Produtos' },
  { id: 'orders',    label: 'Pedidos' },
  { id: 'customers', label: 'Clientes' },
  { id: 'discounts', label: 'Descontos' },
] as const

type TabId = typeof TABS[number]['id']

export const ShopPage: React.FC<ShopPageProps> = ({ provider }) => {
  const [tab, setTab] = useState<TabId>('products')

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Loja</h1>
        <p className="text-muted-foreground mt-1">Gerencie produtos, pedidos, clientes e descontos.</p>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'products'  && <ProductsTab provider={provider} />}
      {tab === 'orders'    && <OrdersTab provider={provider} />}
      {tab === 'customers' && <CustomersTab provider={provider} />}
      {tab === 'discounts' && <DiscountsTab provider={provider} />}
    </div>
  )
}

ShopPage.displayName = 'ShopPage'
