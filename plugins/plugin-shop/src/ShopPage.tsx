import React, { useEffect, useState, useCallback, useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@fayz-ai/ui'
import { getShopProvider } from '@fayz-ai/shop'
import { useAdminPath, adminNavigateTo } from '@fayz-ai/saas'
import { PersonLink } from '@fayz-ai/saas'
import { shopCustomerLookup } from './views/customerLookup'
import { OrderDetailView } from './views/OrderDetailView'
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

/**
 * Every tab used to load with `.then(setState).finally(stopLoading)` and no
 * catch. Against a pool where the shop provider reads as `anon`, listOrders and
 * listCustomers reject with "permission denied" — the rejection escaped React
 * and blanked the whole admin, so a permissions problem looked like a crash.
 * The tab now reports what actually failed and the rest of the shell survives.
 */
function useShopList<T>(load: () => Promise<T[]>, deps: React.DependencyList) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    load()
      .then((data) => { if (!cancelled) setItems(data) })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { items, loading, error }
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p className="font-medium">Não foi possível carregar estes dados.</p>
      <p className="mt-1 text-red-700">{message}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Products tab
// ---------------------------------------------------------------------------

function ProductsTab({ provider }: ShopPageProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (opts?: ListProductsOptions) => {
    setLoading(true)
    setError(null)
    try {
      const data = await resolveShopProvider(provider).listProducts(opts)
      setProducts(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
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

  const columns = useMemo<ColumnDef<Product, any>[]>(() => [
    { accessorKey: 'name', header: 'Produto', cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
    { accessorKey: 'sku', header: 'SKU', cell: ({ getValue }) => <span className="text-muted-foreground">{(getValue() as string | undefined) ?? '—'}</span> },
    {
      accessorKey: 'price', header: () => <span className="block text-right">Preço</span>,
      cell: ({ getValue, row }) => <div className="text-right">{currency(getValue() as number, row.original.currency)}</div>,
    },
    {
      accessorKey: 'inventoryCount', header: () => <span className="block text-right">Estoque</span>,
      cell: ({ getValue }) => {
        const count = getValue() as number
        return <div className="text-right"><span className={count === 0 ? 'text-red-600 font-medium' : ''}>{count}</span></div>
      },
    },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue() as string
        return badge(status, statusColors[status] ?? 'bg-gray-100 text-gray-700')
      },
    },
  ], [])

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

      {error ? (
        <ErrorState message={error} />
      ) : (
        <DataTable
          loading={loading}
          columns={columns}
          data={products}
          variant="card"
          emptyMessage="Nenhum produto encontrado."
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Orders tab
// ---------------------------------------------------------------------------

function OrdersTab({ provider }: ShopPageProps) {
  const { items: orders, loading, error } = useShopList<Order>(
    () => resolveShopProvider(provider).listOrders({ limit: 50 }),
    [provider],
  )

  const columns = useMemo<ColumnDef<Order, any>[]>(() => [
    { accessorKey: 'orderNumber', header: 'Pedido', cell: ({ getValue }) => <span className="font-medium">#{getValue() as string}</span> },
    {
      id: 'customer', accessorFn: (o) => o.customerName ?? o.customerEmail ?? '—', header: 'Cliente',
      // Links to the customer record. stopPropagation because the row itself
      // opens the order — without it the click would do both.
      cell: ({ getValue, row }) => {
        const label = getValue() as string
        const id = row.original.customerId
        if (!id) return <span>{label}</span>
        return (
          <PersonLink
            personId={id}
            name={label}
            lookup={shopCustomerLookup(() => resolveShopProvider(provider))}
            profileHref={`#/shop/customers/${id}`}
          />
        )
      },
    },
    {
      accessorKey: 'total', header: () => <span className="block text-right">Total</span>,
      cell: ({ getValue, row }) => <div className="text-right font-medium">{currency(getValue() as number, row.original.currency)}</div>,
    },
    {
      accessorKey: 'financialStatus', header: 'Pagamento',
      cell: ({ getValue }) => {
        const status = getValue() as string
        return badge(status, statusColors[status] ?? 'bg-gray-100 text-gray-700')
      },
    },
    {
      accessorKey: 'fulfillmentStatus', header: 'Entrega',
      cell: ({ getValue }) => {
        const status = getValue() as string
        return badge(status, statusColors[status] ?? 'bg-gray-100 text-gray-700')
      },
    },
    {
      accessorKey: 'createdAt', header: 'Data',
      cell: ({ getValue }) => {
        // Time matters operationally: two orders on the same day are picked,
        // packed and settled in the order they arrived.
        const d = new Date(getValue() as string)
        return (
          <span className="whitespace-nowrap text-muted-foreground">
            {d.toLocaleDateString('pt-BR')}
            <span className="ml-1.5 text-xs opacity-70">{d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
        )
      },
    },
  ], [])

  return (
    <div>
      {error ? (
        <ErrorState message={error} />
      ) : (
        <DataTable
          loading={loading}
          columns={columns}
          data={orders}
          variant="card"
          emptyMessage="Nenhum pedido ainda."
          onRowClick={(row: Order) => adminNavigateTo(`/shop/orders/${row.id}`)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Customers tab
// ---------------------------------------------------------------------------

function CustomersTab({ provider }: ShopPageProps) {
  const { items: customers, loading, error } = useShopList<ShopCustomer>(
    () => resolveShopProvider(provider).listCustomers({ limit: 50 }),
    [provider],
  )

  const columns = useMemo<ColumnDef<ShopCustomer, any>[]>(() => [
    {
      id: 'name', accessorFn: (c) => `${c.firstName} ${c.lastName}`, header: 'Nome',
      cell: ({ row }) => <span className="font-medium">{row.original.firstName} {row.original.lastName}</span>,
    },
    { accessorKey: 'email', header: 'Email', cell: ({ getValue }) => <span className="text-muted-foreground">{(getValue() as string | undefined) ?? '—'}</span> },
    { accessorKey: 'phone', header: 'Telefone', cell: ({ getValue }) => <span className="text-muted-foreground">{(getValue() as string | undefined) ?? '—'}</span> },
    {
      accessorKey: 'ordersCount', header: () => <span className="block text-right">Pedidos</span>,
      cell: ({ getValue }) => <div className="text-right">{getValue() as number}</div>,
    },
    {
      accessorKey: 'totalSpent', header: () => <span className="block text-right">Total Gasto</span>,
      cell: ({ getValue }) => <div className="text-right">{currency(getValue() as number)}</div>,
    },
  ], [])

  return (
    <div>
      {error ? (
        <ErrorState message={error} />
      ) : (
        <DataTable
          loading={loading}
          columns={columns}
          data={customers}
          variant="card"
          emptyMessage="Nenhum cliente ainda."
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Discounts tab
// ---------------------------------------------------------------------------

function DiscountsTab({ provider }: ShopPageProps) {
  const { items: discounts, loading, error } = useShopList<Discount>(
    () => resolveShopProvider(provider).listDiscounts({ limit: 50 }),
    [provider],
  )

  const columns = useMemo<ColumnDef<Discount, any>[]>(() => [
    { accessorKey: 'title', header: 'Título', cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
    { accessorKey: 'code', header: 'Código', cell: ({ getValue }) => <span className="font-mono text-sm">{(getValue() as string | undefined) ?? '—'}</span> },
    { accessorKey: 'type', header: 'Tipo', cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() as string}</span> },
    {
      accessorKey: 'value', header: () => <span className="block text-right">Valor</span>,
      cell: ({ row }) => <div className="text-right">{row.original.type === 'percentage' ? `${row.original.value}%` : currency(row.original.value)}</div>,
    },
    {
      id: 'usos', accessorKey: 'timesUsed', header: () => <span className="block text-right">Usos</span>,
      cell: ({ row }) => <div className="text-right">{row.original.timesUsed}{row.original.usageLimit ? ` / ${row.original.usageLimit}` : ''}</div>,
    },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue() as string
        return badge(status, statusColors[status] ?? 'bg-gray-100 text-gray-700')
      },
    },
  ], [])

  return (
    <div>
      {error ? (
        <ErrorState message={error} />
      ) : (
        <DataTable
          loading={loading}
          columns={columns}
          data={discounts}
          variant="card"
          emptyMessage="Nenhum desconto cadastrado."
        />
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

const TAB_COPY: Record<TabId, { title: string; subtitle: string }> = {
  products:  { title: 'Produtos',  subtitle: 'Catálogo da loja: preço, estoque e status.' },
  orders:    { title: 'Pedidos',   subtitle: 'Pedidos recebidos, pagamento e entrega.' },
  customers: { title: 'Clientes',  subtitle: 'Quem comprou, quanto e com que frequência.' },
  discounts: { title: 'Descontos', subtitle: 'Cupons, regras de uso e desempenho.' },
}

/**
 * `section` pins the page to one area, which is how the sidebar routes
 * /shop/products, /shop/orders, … as separate entries. Without it the page
 * keeps its own tab bar — the single-route behaviour, still used by /shop.
 */
export const ShopPage: React.FC<ShopPageProps & { section?: TabId }> = ({ provider, section }) => {
  const [tab, setTab] = useState<TabId>(section ?? 'products')
  const active = section ?? tab

  // /shop/orders/<id> renders the detail. Orders deliberately do not go through
  // createCrudPage: an order is not an editable record, it is a document with
  // items, money and a shipment attached.
  const path = useAdminPath()
  const orderId = section === 'orders' ? path.match(/^\/shop\/orders\/([^/]+)$/)?.[1] : undefined
  if (orderId) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <OrderDetailView
          orderId={orderId}
          provider={() => resolveShopProvider(provider)}
          onBack={() => adminNavigateTo('/shop/orders')}
        />
      </div>
    )
  }
  const copy = section ? TAB_COPY[section] : { title: 'Loja', subtitle: 'Gerencie produtos, pedidos, clientes e descontos.' }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{copy.title}</h1>
        <p className="text-muted-foreground mt-1">{copy.subtitle}</p>
      </div>

      {!section && (
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
      )}

      {active === 'products'  && <ProductsTab provider={provider} />}
      {active === 'orders'    && <OrdersTab provider={provider} />}
      {active === 'customers' && <CustomersTab provider={provider} />}
      {active === 'discounts' && <DiscountsTab provider={provider} />}
    </div>
  )
}

ShopPage.displayName = 'ShopPage'
