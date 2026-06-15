import React, { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { ListView } from '@fayz-ai/ui'
import { useInventoryConfig, useInventoryStore, formatCurrency } from '../InventoryContext'
import { SubpageHeader } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import type { ProductType, Product } from '../types'

const useColumns = (currency: { code: string; locale: string; symbol: string }, t: (key: string) => string): ColumnDef<Product, any>[] => [
  {
    accessorKey: 'name',
    header: t('inventory.productList.product'),
    enableSorting: true,
    cell: ({ row }: any) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        {row.original.sku && <p className="text-xs text-muted-foreground">{row.original.sku}</p>}
      </div>
    ),
  },
  {
    accessorKey: 'productType',
    header: t('inventory.productList.type'),
    cell: ({ getValue }: any) => (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground capitalize">
        {getValue() as string}
      </span>
    ),
  },
  {
    accessorKey: 'currentQuantity',
    header: t('inventory.productList.stock'),
    enableSorting: true,
    meta: { align: 'right' },
    cell: ({ row }: any) => (
      <span className={`text-right block ${row.original.currentQuantity <= row.original.minQuantity ? 'text-destructive font-medium' : ''}`}>
        {row.original.currentQuantity}
      </span>
    ),
  },
  {
    accessorKey: 'costPrice',
    header: t('inventory.productList.cost'),
    meta: { align: 'right' },
    cell: ({ getValue }: any) => (
      <span className="text-right block text-muted-foreground">{formatCurrency(getValue() as number, currency)}</span>
    ),
  },
  {
    id: 'value',
    header: t('inventory.productList.value'),
    meta: { align: 'right' },
    cell: ({ row }: any) => (
      <span className="text-right block font-medium">
        {formatCurrency(row.original.currentQuantity * row.original.costPrice, currency)}
      </span>
    ),
  },
]

export function ProductListView({ onNew, onEdit }: {
  onNew?: () => void
  onEdit?: (id: string) => void
}) {
  const t = useTranslation()
  const { currency, productTypes } = useInventoryConfig()
  const products = useInventoryStore((s) => s.products)
  const productsTotal = useInventoryStore((s) => s.productsTotal)
  const productsLoading = useInventoryStore((s) => s.productsLoading)
  const fetchProducts = useInventoryStore((s) => s.fetchProducts)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | undefined>()

  useEffect(() => {
    fetchProducts({ productType: typeFilter as ProductType | undefined, search: search || undefined })
  }, [typeFilter, search])

  const columns = useColumns(currency, t)

  return (
    <div className="space-y-4">
      <SubpageHeader title={t('inventory.productList.title')} subtitle={t('inventory.productList.subtitle', { count: String(productsTotal) })} />

      <ListView<Product>
        columns={columns}
        data={products}
        loading={productsLoading}
        searchPlaceholder={t('inventory.productList.searchPlaceholder')}
        search={search}
        onSearchChange={setSearch}
        searchDebounce={0}
        tags={productTypes.map((t) => ({ value: t.value, label: t.label }))}
        activeTag={typeFilter}
        onTagChange={setTypeFilter}
        newLabel={t('inventory.productList.newProduct')}
        onNew={onNew}
        onRowClick={(row) => onEdit?.(row.id)}
        emptyIcon={Package}
        emptyMessage={t('inventory.productList.empty')}
        emptyActionLabel={onNew ? t('inventory.productList.createFirst') : undefined}
        onEmptyAction={onNew}
      />
    </div>
  )
}
