import React, { useState, useEffect } from 'react'
import { Save, ImagePlus, X } from 'lucide-react'
import { useInventoryConfig, useInventoryStore, useInventoryProvider, formatCurrency } from '../InventoryContext'
import { SubpageHeader } from '@fayz-ai/ui'
import { CurrencyInput } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import type { ProductType } from '../types'

// ---------------------------------------------------------------------------
// Product type descriptions — parametrizable via config
// ---------------------------------------------------------------------------

const TYPE_DESCRIPTION_KEYS: Record<string, string> = {
  ingredient: 'inventory.productForm.typeIngredient',
  sale: 'inventory.productForm.typeSale',
  intermediate: 'inventory.productForm.typeIntermediate',
  asset: 'inventory.productForm.typeAsset',
}

// ---------------------------------------------------------------------------
// Section component for grouping form fields
// ---------------------------------------------------------------------------

function FormSection({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="px-5 py-3 border-b">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5 space-y-4">
        {children}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Product form
// ---------------------------------------------------------------------------

export function ProductFormView({ editId, onSaved }: { editId?: string; onSaved?: () => void }) {
  const t = useTranslation()
  const { productTypes, currency } = useInventoryConfig()
  const provider = useInventoryProvider()
  const createProduct = useInventoryStore((s) => s.createProduct)
  const isEdit = !!editId

  const [loaded, setLoaded] = useState(false)
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [brand, setBrand] = useState('')
  const [productType, setProductType] = useState<ProductType>(productTypes[0]?.value as ProductType ?? 'ingredient')
  const [costPrice, setCostPrice] = useState(0)
  const [salePrice, setSalePrice] = useState(0)
  const [minQuantity, setMinQuantity] = useState(0)
  const [maxQuantity, setMaxQuantity] = useState(0)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Load existing product for edit
  useEffect(() => {
    if (!editId || loaded) return
    ;(async () => {
      const product = await provider.getProductById(editId)
      if (!product) return
      setName(product.name)
      setSku(product.sku ?? '')
      setBarcode(product.barcode ?? '')
      setBrand(product.brand ?? '')
      setProductType(product.productType)
      setCostPrice(product.costPrice)
      setSalePrice(product.salePrice ?? 0)
      setMinQuantity(product.minQuantity)
      setMaxQuantity(product.maxQuantity ?? 0)
      setDescription(product.description ?? '')
      setLoaded(true)
    })()
  }, [editId])

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (isEdit && editId) {
        await provider.updateProduct(editId, {
          name, sku: sku || undefined, barcode: barcode || undefined, brand: brand || undefined,
          productType, costPrice, salePrice: salePrice || undefined,
          minQuantity, maxQuantity: maxQuantity || undefined, description: description || undefined,
        })
      } else {
        await createProduct({
          name, sku: sku || undefined, barcode: barcode || undefined, brand: brand || undefined,
          productType, costPrice, salePrice: salePrice || undefined,
          minQuantity, maxQuantity: maxQuantity || undefined, description: description || undefined,
        })
      }
      onSaved?.()
    } finally {
      setSaving(false)
    }
  }

  const title = isEdit ? (name || t('inventory.productForm.editProduct')) : t('inventory.productForm.newProduct')
  const subtitle = isEdit ? undefined : t('inventory.productForm.addToCatalog')
  const margin = salePrice > 0 && costPrice > 0 ? ((salePrice - costPrice) / costPrice * 100).toFixed(1) : null

  return (
    <div className="space-y-5">
      <SubpageHeader
        title={title}
        subtitle={subtitle}
        onBack={onSaved}
        parentLabel={t('inventory.nav.products')}
        actions={
          <div className="flex items-center gap-2">
            {onSaved && (
              <button onClick={onSaved} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors">
                {t('inventory.productForm.cancel')}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary border border-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-colors disabled:opacity-50"
            >
              <Save className="h-3 w-3" /> {saving ? t('inventory.productForm.saving') : t('inventory.productForm.save')}
            </button>
          </div>
        }
      />

      {/* Section 1: General Info */}
      <FormSection title={t('inventory.productForm.generalInfo')}>
        <div className="flex gap-4">
          {/* Image placeholder */}
          <div className="shrink-0">
            <div className="w-20 h-20 rounded-lg border-2 border-dashed border-muted flex items-center justify-center text-muted-foreground hover:border-primary/30 hover:text-primary/50 transition-colors cursor-pointer">
              <ImagePlus className="h-5 w-5" />
            </div>
          </div>

          <div className="flex-1 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">{t('inventory.productForm.name')} *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('inventory.productForm.namePlaceholder')}
                autoFocus
                className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('inventory.productForm.brand')}</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder={t('inventory.productForm.brandPlaceholder')}
                className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('inventory.productForm.sku')}</label>
            <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder={t('inventory.productForm.skuPlaceholder')} className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('inventory.productForm.barcode')}</label>
            <input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder={t('inventory.productForm.barcodePlaceholder')} className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">{t('inventory.productForm.description')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder={t('inventory.productForm.descriptionPlaceholder')}
            className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
      </FormSection>

      {/* Section 2: Classification */}
      <FormSection title={t('inventory.productForm.classification')} subtitle={t('inventory.productForm.classificationDesc')}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {productTypes.map((pt) => {
            const active = productType === pt.value
            const descKey = TYPE_DESCRIPTION_KEYS[pt.value]
            const desc = descKey ? t(descKey) : ''
            return (
              <button
                key={pt.value}
                onClick={() => setProductType(pt.value as ProductType)}
                className={`rounded-lg border-2 p-3 text-left transition-all ${
                  active
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent bg-muted/20 hover:bg-muted/40'
                }`}
              >
                <p className={`text-sm font-medium ${active ? 'text-primary' : ''}`}>{pt.label}</p>
                {desc && <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{desc}</p>}
              </button>
            )
          })}
        </div>
      </FormSection>

      {/* Section 3: Pricing */}
      <FormSection title={t('inventory.productForm.pricing')}>
        <div className="grid gap-4 sm:grid-cols-3">
          <CurrencyInput
            label={t('inventory.productForm.costPrice')}
            value={costPrice}
            onChange={setCostPrice}
            symbol={currency.symbol}
            locale={currency.locale}
            currencyCode={currency.code}
          />
          <CurrencyInput
            label={t('inventory.productForm.salePrice')}
            value={salePrice}
            onChange={setSalePrice}
            symbol={currency.symbol}
            locale={currency.locale}
            currencyCode={currency.code}
          />
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('inventory.productForm.margin')}</label>
            <div className="mt-1 rounded-lg border bg-muted/20 px-3 py-2 text-sm tabular-nums text-right">
              {margin !== null ? (
                <span className={Number(margin) >= 0 ? 'text-success' : 'text-destructive'}>
                  {margin}%
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </div>
      </FormSection>

      {/* Section 4: Stock Levels */}
      <FormSection title={t('inventory.productForm.stockLevels')} subtitle={t('inventory.productForm.stockLevelsDesc')}>
        <div className="grid gap-4 sm:grid-cols-2 max-w-md">
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('inventory.productForm.minQuantity')}</label>
            <input
              type="number"
              min={0}
              value={minQuantity}
              onChange={(e) => setMinQuantity(Number(e.target.value) || 0)}
              placeholder="0"
              className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-[10px] text-muted-foreground mt-1">{t('inventory.productForm.minQuantityHint')}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('inventory.productForm.maxQuantity')}</label>
            <input
              type="number"
              min={0}
              value={maxQuantity}
              onChange={(e) => setMaxQuantity(Number(e.target.value) || 0)}
              placeholder={t('inventory.productForm.optional')}
              className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-[10px] text-muted-foreground mt-1">{t('inventory.productForm.maxQuantityHint')}</p>
          </div>
        </div>
      </FormSection>
    </div>
  )
}
