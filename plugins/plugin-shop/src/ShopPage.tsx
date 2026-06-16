import React, { useEffect, useState, useCallback, useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@fayz-ai/ui'
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

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <DataTable
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
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    resolveShopProvider(provider).listOrders({ limit: 50 }).then(setOrders).finally(() => setLoading(false))
  }, [provider])

  const columns = useMemo<ColumnDef<Order, any>[]>(() => [
    { accessorKey: 'orderNumber', header: 'Pedido', cell: ({ getValue }) => <span className="font-medium">#{getValue() as string}</span> },
    {
      id: 'customer', accessorFn: (o) => o.customerName ?? o.customerEmail ?? '—', header: 'Cliente',
      cell: ({ getValue }) => <span>{getValue() as string}</span>,
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
      cell: ({ getValue }) => <span className="text-muted-foreground">{new Date(getValue() as string).toLocaleDateString('pt-BR')}</span>,
    },
  ], [])

  return (
    <div>
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <DataTable
          columns={columns}
          data={orders}
          variant="card"
          emptyMessage="Nenhum pedido ainda."
        />
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
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <DataTable
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
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    resolveShopProvider(provider).listDiscounts({ limit: 50 }).then(setDiscounts).finally(() => setLoading(false))
  }, [provider])

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
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <DataTable
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
