import React, { useEffect, useMemo, useState } from 'react'
import { CrudListView } from '@fayz-ai/saas'
import { useInventoryConfig, useInventoryStore } from '../InventoryContext'
import { useTranslation } from '@fayz-ai/core'
import type { ProductType } from '../types'
import { buildProductEntity } from './productEntity'

// Product list, rendered through the generic CrudListView (header · search ·
// facet pills · table). One shared EntityDef (buildProductEntity) drives both
// this list and the create/edit form. Data + routing stay in the inventory
// store / module nav.
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
  const [loadedOnce, setLoadedOnce] = useState(false)

  useEffect(() => {
    let active = true
    Promise.resolve(fetchProducts({ productType: typeFilter as ProductType | undefined, search: search || undefined }))
      .finally(() => { if (active) setLoadedOnce(true) })
    return () => { active = false }
  }, [typeFilter, search])

  const entity = useMemo(() => buildProductEntity(t, productTypes, currency), [t, productTypes, currency])
  const facets = useMemo(() => [{
    field: 'productType',
    allLabel: t('crud.list.allFacet'),
    options: productTypes.map((p) => ({ value: p.value, label: p.label })),
  }], [productTypes, t])

  return (
    <CrudListView
      entityDef={entity}
      items={loadedOnce ? products : null}
      total={productsTotal}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder={t('inventory.productList.searchPlaceholder')}
      facets={facets}
      activeFilters={{ productType: typeFilter }}
      onFacetChange={(_field, value) => setTypeFilter(value)}
      onNew={onNew}
      addLabel={t('inventory.productList.newProduct')}
      onRowClick={(row) => onEdit?.((row as { id: string }).id)}
    />
  )
}
