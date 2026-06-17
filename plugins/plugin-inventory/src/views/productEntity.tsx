import React from 'react'
import type { EntityDef, FieldDef } from '@fayz-ai/core'
import { formatCurrency, type InventoryCurrency, type ProductTypeOption } from '../InventoryContext'

// ---------------------------------------------------------------------------
// The single source of truth for the Product entity — drives BOTH the generic
// list (CrudListView columns + facet) and the generic form (CrudFormPage
// sections). Persistence stays in the inventory provider/store; this only
// describes fields, columns and layout.
// ---------------------------------------------------------------------------

const TYPE_DESCRIPTION_KEYS: Record<string, string> = {
  ingredient: 'inventory.productForm.typeIngredient',
  sale: 'inventory.productForm.typeSale',
  intermediate: 'inventory.productForm.typeIntermediate',
  asset: 'inventory.productForm.typeAsset',
}

type T = (key: string, params?: Record<string, string | number>) => string

export function buildProductEntity(
  t: T,
  productTypes: ProductTypeOption[],
  currency: InventoryCurrency,
): EntityDef {
  const typeOptions = productTypes.map((pt) => ({
    label: pt.label,
    value: pt.value,
    description: TYPE_DESCRIPTION_KEYS[pt.value] ? t(TYPE_DESCRIPTION_KEYS[pt.value]) : undefined,
  }))
  const typeLabel = (v: unknown) => productTypes.find((p) => p.value === v)?.label ?? String(v ?? '')

  // Field order is chosen so the table columns come out as
  // Product · Type · Stock · Cost · Value while the form groups stay correct.
  const fields: FieldDef[] = [
    // — General Information (form) + Product column (table) —
    {
      key: 'name', label: t('inventory.productForm.name'), type: 'text', required: true,
      group: 'general', placeholder: t('inventory.productForm.namePlaceholder'),
      searchable: true, showInTable: true, sortable: true,
      renderCell: (_v, row: any) => (
        <div>
          <p className="font-medium">{row.name}</p>
          {row.sku && <p className="text-xs text-muted-foreground">{row.sku}</p>}
        </div>
      ),
    },
    { key: 'brand', label: t('inventory.productForm.brand'), type: 'text', group: 'general', placeholder: t('inventory.productForm.brandPlaceholder'), showInTable: false },
    { key: 'sku', label: t('inventory.productForm.sku'), type: 'text', group: 'general', placeholder: t('inventory.productForm.skuPlaceholder'), searchable: true, showInTable: false },
    { key: 'barcode', label: t('inventory.productForm.barcode'), type: 'text', group: 'general', placeholder: t('inventory.productForm.barcodePlaceholder'), searchable: true, showInTable: false },
    { key: 'description', label: t('inventory.productForm.description'), type: 'textarea', group: 'general', span: 2, placeholder: t('inventory.productForm.descriptionPlaceholder'), showInTable: false },

    // — Classification (form: segmented) + Type column (table: badge) —
    {
      key: 'productType', label: t('inventory.productForm.classification'), type: 'segmented',
      group: 'classification', span: 2, options: typeOptions,
      showInTable: true, sortable: false,
      renderCell: (v) => (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
          {typeLabel(v)}
        </span>
      ),
    },

    // — Stock column (list only) — placed before Cost for the desired column order
    {
      key: 'currentQuantity', label: t('inventory.productList.stock'), type: 'number',
      showInForm: false, showInTable: true, sortable: true,
      renderCell: (_v, row: any) => (
        <span className={`text-right block ${row.currentQuantity <= row.minQuantity ? 'text-destructive font-medium' : ''}`}>
          {row.currentQuantity}
        </span>
      ),
    },

    // — Pricing (form) + Cost column (table) —
    {
      key: 'costPrice', label: t('inventory.productForm.costPrice'), type: 'currency',
      group: 'pricing', currency: currency.code, currencySymbol: currency.symbol, currencyLocale: currency.locale,
      showInTable: true, sortable: false,
      renderCell: (v) => <span className="text-right block text-muted-foreground">{formatCurrency(Number(v) || 0, currency)}</span>,
    },

    // — Value column (list only): stock × cost —
    {
      key: 'value', label: t('inventory.productList.value'), type: 'number',
      showInForm: false, showInTable: true, sortable: false,
      renderCell: (_v, row: any) => (
        <span className="text-right block font-medium">{formatCurrency((row.currentQuantity || 0) * (row.costPrice || 0), currency)}</span>
      ),
    },

    { key: 'salePrice', label: t('inventory.productForm.salePrice'), type: 'currency', group: 'pricing', currency: currency.code, currencySymbol: currency.symbol, currencyLocale: currency.locale, showInTable: false },
    {
      key: 'margin', label: t('inventory.productForm.margin'), type: 'computed', group: 'pricing', showInTable: false,
      compute: (vals) => {
        const cost = Number(vals.costPrice) || 0
        const sale = Number(vals.salePrice) || 0
        if (sale <= 0 || cost <= 0) return null
        const m = ((sale - cost) / cost) * 100
        return { display: `${m.toFixed(1)}%`, tone: m >= 0 ? 'positive' : 'negative' }
      },
    },

    // — Stock Levels (form only) —
    { key: 'minQuantity', label: t('inventory.productForm.minQuantity'), type: 'number', group: 'stock', min: 0, placeholder: '0', hint: t('inventory.productForm.minQuantityHint'), showInTable: false },
    { key: 'maxQuantity', label: t('inventory.productForm.maxQuantity'), type: 'number', group: 'stock', min: 0, placeholder: t('inventory.productForm.optional'), hint: t('inventory.productForm.maxQuantityHint'), showInTable: false },
  ]

  return {
    name: t('inventory.stock.product'),
    namePlural: t('inventory.nav.products'),
    icon: 'Package',
    displayField: 'name',
    fields,
    fieldGroups: [
      { id: 'general', label: t('inventory.productForm.generalInfo'), columns: 2, imageSlot: true },
      { id: 'classification', label: t('inventory.productForm.classification'), description: t('inventory.productForm.classificationDesc'), columns: 1 },
      { id: 'pricing', label: t('inventory.productForm.pricing'), columns: 3 },
      { id: 'stock', label: t('inventory.productForm.stockLevels'), description: t('inventory.productForm.stockLevelsDesc'), columns: 2 },
    ],
    facets: [{ field: 'productType', allLabel: t('crud.list.allFacet') }],
  }
}
