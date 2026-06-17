import React from 'react'
import { SubpageHeader, toast } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { CrudFormPage } from '@fayz-ai/saas'
import { useInventoryConfig, useInventoryStore, useInventoryProvider } from '../InventoryContext'
import type { ProductType } from '../types'
import { buildProductEntity } from './productEntity'

// ---------------------------------------------------------------------------
// Product create/edit, rendered through the generic CRUD form. The sectioned
// layout (General Information · Classification · Pricing+Margin · Stock Levels)
// comes from the shared buildProductEntity (segmented/computed/currency field
// types). Persistence still flows through the inventory provider/store, so the
// metadata-JSON column mapping is unchanged.
// ---------------------------------------------------------------------------

export function ProductCrudForm({ editId, onSaved }: { editId?: string; onSaved?: () => void }) {
  const t = useTranslation()
  const { productTypes, currency } = useInventoryConfig()
  const provider = useInventoryProvider()
  const createProduct = useInventoryStore((s) => s.createProduct)
  const isEdit = !!editId

  const [initialData, setInitialData] = React.useState<Record<string, any> | null>(isEdit ? null : {})
  const [headerName, setHeaderName] = React.useState('')

  // Load the existing product for edit and map it to flat form values.
  React.useEffect(() => {
    if (!editId) return
    let cancelled = false
    ;(async () => {
      const p = await provider.getProductById(editId)
      if (cancelled) return
      setHeaderName(p?.name ?? '')
      setInitialData(
        p
          ? {
              name: p.name,
              brand: p.brand ?? '',
              sku: p.sku ?? '',
              barcode: p.barcode ?? '',
              description: p.description ?? '',
              productType: p.productType,
              costPrice: p.costPrice,
              salePrice: p.salePrice ?? 0,
              minQuantity: p.minQuantity,
              maxQuantity: p.maxQuantity ?? 0,
            }
          : {},
      )
    })()
    return () => { cancelled = true }
  }, [editId])

  const entity = React.useMemo(() => buildProductEntity(t, productTypes, currency), [t, productTypes, currency])

  async function save(values: Record<string, any>) {
    const name = String(values.name ?? '').trim()
    if (!name) { toast.error(t('common.formIncomplete')); throw new Error('name required') }
    const payload = {
      name,
      sku: values.sku || undefined,
      barcode: values.barcode || undefined,
      brand: values.brand || undefined,
      productType: (values.productType ?? productTypes[0]?.value) as ProductType,
      costPrice: Number(values.costPrice) || 0,
      salePrice: Number(values.salePrice) || undefined,
      minQuantity: Number(values.minQuantity) || 0,
      maxQuantity: Number(values.maxQuantity) || undefined,
      description: values.description || undefined,
    }
    if (isEdit && editId) {
      await provider.updateProduct(editId, payload)
    } else {
      await createProduct(payload)
    }
    onSaved?.()
  }

  const title = isEdit ? (headerName || t('inventory.productForm.editProduct')) : t('inventory.productForm.newProduct')
  const subtitle = isEdit ? undefined : t('inventory.productForm.addToCatalog')

  return (
    <div className="space-y-5">
      <SubpageHeader title={title} subtitle={subtitle} onBack={onSaved} parentLabel={t('inventory.nav.products')} />
      {initialData && (
        <CrudFormPage
          entityDef={entity}
          mode={isEdit ? 'edit' : 'create'}
          initialData={initialData}
          onSubmit={save}
          onCancel={() => onSaved?.()}
          namePlural={t('inventory.nav.products')}
          hideBreadcrumb
        />
      )}
    </div>
  )
}
