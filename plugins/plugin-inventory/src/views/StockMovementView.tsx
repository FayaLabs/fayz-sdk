import React, { useState, useEffect, useMemo } from 'react'
import { Save, Plus, ArrowUpRight, ArrowDownRight, RefreshCw, ArrowRightLeft, Trash2, Package, Check, Eye } from 'lucide-react'
import { useInventoryConfig, useInventoryStore, useInventoryProvider, formatCurrency } from '../InventoryContext'
import { cn } from '@fayz-ai/ui'
import { SubpageHeader } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { SearchSelect, type SearchSelectOption } from '@fayz-ai/ui'
import { DatePicker } from '@fayz-ai/ui'
import type { MovementType, StockMovement, StockPosition } from '../types'

// ---------------------------------------------------------------------------
// Movement type config
// ---------------------------------------------------------------------------

const MOVEMENT_TYPES: { value: MovementType; labelKey: string; icon: React.ElementType; color: string; activeColor: string; descKey: string }[] = [
  { value: 'entry', labelKey: 'inventory.stock.entryLabel', icon: ArrowDownRight, color: 'text-success', activeColor: 'border-success bg-success/10 text-success dark:bg-success/10', descKey: 'inventory.stock.entryDesc' },
  { value: 'exit', labelKey: 'inventory.stock.exitLabel', icon: ArrowUpRight, color: 'text-destructive', activeColor: 'border-destructive bg-destructive/10 text-destructive dark:bg-destructive/10', descKey: 'inventory.stock.exitDesc' },
  { value: 'adjustment', labelKey: 'inventory.stock.adjustmentLabel', icon: RefreshCw, color: 'text-info', activeColor: 'border-info bg-info/10 text-info dark:bg-info/10', descKey: 'inventory.stock.adjustmentDesc' },
  { value: 'transfer', labelKey: 'inventory.stock.transferLabel', icon: ArrowRightLeft, color: 'text-magic', activeColor: 'border-magic bg-magic/10 text-magic dark:bg-magic/10', descKey: 'inventory.stock.transferDesc' },
  { value: 'loss', labelKey: 'inventory.stock.lossLabel', icon: Trash2, color: 'text-warning', activeColor: 'border-warning bg-warning/10 text-warning dark:bg-warning/10', descKey: 'inventory.stock.lossDesc' },
]

// ---------------------------------------------------------------------------
// Movement detail card (for viewing a recorded movement)
// ---------------------------------------------------------------------------

function MovementDetail({ movement, currency, onClose }: {
  movement: StockMovement
  currency: { code: string; locale: string; symbol: string }
  onClose: () => void
}) {
  const t = useTranslation()
  const typeConfig = MOVEMENT_TYPES.find((mt) => mt.value === movement.movementType)
  const TypeIcon = typeConfig?.icon ?? Package

  return (
    <div className="space-y-4">
      <SubpageHeader title={movement.productName ?? `#${movement.id.slice(0, 8)}`} onBack={onClose} parentLabel={t('inventory.nav.stock')} />

      <div className="rounded-lg border bg-card shadow-sm p-5 space-y-4">
        {/* Type + Product hero */}
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${typeConfig?.activeColor ?? 'bg-muted'}`}>
            <TypeIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-bold">{movement.productName ?? t('inventory.stock.unknownProduct')}</p>
            <p className="text-xs text-muted-foreground capitalize">{movement.movementType} &middot; {movement.movementDate}</p>
          </div>
        </div>

        {/* Key details grid */}
        <div className="grid gap-3 sm:grid-cols-3 pt-2 border-t">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">{t('inventory.stock.quantityLabel')}</p>
            <p className="text-sm font-semibold">{movement.movementType === 'entry' ? '+' : '-'}{movement.quantity}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">{t('inventory.stock.unitCostLabel')}</p>
            <p className="text-sm font-semibold">{formatCurrency(movement.unitCost, currency)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">{t('inventory.stock.totalCost')}</p>
            <p className="text-sm font-semibold">{formatCurrency(movement.totalCost, currency)}</p>
          </div>
        </div>

        {/* Optional details */}
        <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t">
          {movement.stockLocationName && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">{t('inventory.stock.locationLabel')}</p>
              <p className="text-sm">{movement.stockLocationName}</p>
            </div>
          )}
          {movement.destinationLocationName && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">{t('inventory.stock.destination')}</p>
              <p className="text-sm">{movement.destinationLocationName}</p>
            </div>
          )}
          {movement.supplierName && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">{t('inventory.stock.supplier')}</p>
              <p className="text-sm">{movement.supplierName}</p>
            </div>
          )}
          {movement.documentNumber && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">{t('inventory.stock.document')}</p>
              <p className="text-sm">{movement.documentNumber}</p>
            </div>
          )}
          {movement.reason && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">{t('inventory.stock.reasonLabel')}</p>
              <p className="text-sm">{movement.reason}</p>
            </div>
          )}
        </div>

        {movement.notes && (
          <div className="pt-2 border-t">
            <p className="text-[10px] text-muted-foreground uppercase">{t('inventory.stock.notes')}</p>
            <p className="text-sm mt-0.5">{movement.notes}</p>
          </div>
        )}

        <div className="pt-2 border-t">
          <p className="text-[10px] text-muted-foreground">{t('inventory.stock.recorded')} {new Date(movement.createdAt).toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stock movement form
// ---------------------------------------------------------------------------

export function StockMovementView({ defaultType, onSaved, viewMovement }: {
  defaultType: MovementType
  onSaved?: () => void
  viewMovement?: StockMovement
}) {
  const t = useTranslation()
  const { currency, modules } = useInventoryConfig()
  const provider = useInventoryProvider()
  const products = useInventoryStore((s) => s.products)
  const locations = useInventoryStore((s) => s.locations)
  const fetchProducts = useInventoryStore((s) => s.fetchProducts)
  const fetchLocations = useInventoryStore((s) => s.fetchLocations)
  const createMovement = useInventoryStore((s) => s.createMovement)

  const [step, setStep] = useState(1)
  const [positions, setPositions] = useState<StockPosition[]>([])
  const [movementType, setMovementType] = useState<MovementType>(defaultType)
  const [productId, setProductId] = useState('')
  const [productLabel, setProductLabel] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unitCost, setUnitCost] = useState(0)
  const [locationId, setLocationId] = useState('')
  const [destLocationId, setDestLocationId] = useState('')
  const [reason, setReason] = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMovement, setSavedMovement] = useState<StockMovement | null>(null)

  useEffect(() => { fetchProducts({}); fetchLocations() }, [])

  // If viewing a movement detail
  if (viewMovement) {
    return <MovementDetail movement={viewMovement} currency={currency} onClose={() => onSaved?.()} />
  }

  // If just saved — show success with details
  if (savedMovement) {
    return <MovementDetail movement={savedMovement} currency={currency} onClose={() => onSaved?.()} />
  }

  const selectedProduct = products.find((p) => p.id === productId)
  const totalCost = quantity * unitCost
  const typeConfig = MOVEMENT_TYPES.find((t) => t.value === movementType)!
  const needsReason = movementType === 'adjustment' || movementType === 'loss'
  const needsDest = movementType === 'transfer'

  // Product search
  function searchProducts(query: string): SearchSelectOption[] {
    const q = query.toLowerCase()
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.includes(q))
      .slice(0, 20)
      .map((p) => ({
        id: p.id,
        label: p.name,
        subtitle: [p.sku, `${t('inventory.stock.currentStock')} ${p.currentQuantity}`].filter(Boolean).join(' · '),
        group: p.productType,
        icon: <Package className="h-4 w-4 text-muted-foreground shrink-0" />,
        data: p,
      }))
  }

  // Auto-fill cost when product selected + fetch positions
  function handleProductSelect(id: string, option: SearchSelectOption | null) {
    setProductId(id)
    setProductLabel(option?.label ?? '')
    if (option?.data?.costPrice && unitCost === 0) {
      setUnitCost(option.data.costPrice)
    }
    // Fetch stock positions per location for this product
    if (id) {
      provider.getPositions(id).then(setPositions).catch(() => setPositions([]))
    } else {
      setPositions([])
    }
  }

  // Build a map of locationId → total quantity from positions
  const positionByLocation = useMemo(() => {
    const map: Record<string, number> = {}
    for (const pos of positions) {
      if (pos.stockLocationId) {
        map[pos.stockLocationId] = (map[pos.stockLocationId] ?? 0) + pos.quantity
      }
    }
    return map
  }, [positions])

  // Sort locations by stock position (highest first)
  const sortedLocations = useMemo(() => {
    return [...locations].sort((a, b) => (positionByLocation[b.id] ?? 0) - (positionByLocation[a.id] ?? 0))
  }, [locations, positionByLocation])

  const canProceedStep1 = !!productId
  const canProceedStep2 = quantity > 0 && (!needsReason || reason.trim()) && (!needsDest || destLocationId)
  const title = defaultType === 'entry' ? t('inventory.stock.entry') : defaultType === 'exit' ? t('inventory.stock.exit') : t('inventory.stock.movement')

  async function handleSave() {
    if (!productId || quantity <= 0) return
    setSaving(true)
    try {
      const movement = await createMovement({
        productId,
        quantity,
        movementType,
        unitCost: unitCost || undefined,
        stockLocationId: locationId || undefined,
        destinationLocationId: destLocationId || undefined,
        reason: reason || undefined,
        documentNumber: documentNumber || undefined,
        notes: notes || undefined,
        batchNumber: batchNumber || undefined,
        expirationDate: expirationDate || undefined,
      })
      setSavedMovement(movement)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <SubpageHeader
        title={title}
        subtitle={t('inventory.stock.stepOf', { step: String(step) })}
        onBack={step > 1 ? () => setStep(step - 1) : onSaved}
        parentLabel={t('inventory.nav.stock')}
      />

      {/* Progress bar */}
      <div className="flex gap-1">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>

      {/* Step 1: What — Type + Product */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Movement type selector */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">{t('inventory.stock.movementType')}</p>
            <div className="grid gap-2 sm:grid-cols-5">
              {MOVEMENT_TYPES.map((mt) => {
                const Icon = mt.icon
                const active = movementType === mt.value
                return (
                  <button
                    key={mt.value}
                    onClick={() => setMovementType(mt.value)}
                    className={`rounded-lg border-2 p-3 text-left transition-all ${active ? mt.activeColor : 'border-transparent bg-card hover:bg-muted/30'}`}
                  >
                    <Icon className="h-4 w-4 mb-1" />
                    <p className="text-xs font-medium">{t(mt.labelKey)}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 hidden sm:block">{t(mt.descKey)}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Product search */}
          <SearchSelect
            value={productId}
            displayValue={productLabel}
            onChange={handleProductSelect}
            onSearch={searchProducts}
            label={t('inventory.stock.product')}
            required
            placeholder={t('inventory.stock.searchProduct')}
            minChars={1}
            debounce={150}
            renderOption={(opt) => (
              <>
                {opt.icon}
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{opt.label}</p>
                  {opt.subtitle && <p className="text-[10px] text-muted-foreground">{opt.subtitle}</p>}
                </div>
              </>
            )}
          />

          {selectedProduct && (
            <div className="rounded-lg bg-muted/30 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{selectedProduct.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t('inventory.stock.currentStock')} <span className="font-medium">{selectedProduct.currentQuantity}</span>
                  {selectedProduct.minQuantity > 0 && <> &middot; Min: {selectedProduct.minQuantity}</>}
                  {selectedProduct.costPrice > 0 && <> &middot; Cost: {formatCurrency(selectedProduct.costPrice, currency)}</>}
                </p>
              </div>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium bg-muted text-muted-foreground capitalize">{selectedProduct.productType}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary border border-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-colors disabled:opacity-50"
            >
              {t('inventory.stock.next')}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: How much — Quantity + Cost + Location */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="rounded-lg border bg-card shadow-sm p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t('inventory.stock.quantity')}</label>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                  autoFocus
                  className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t('inventory.stock.unitCost')}</label>
                <div className="flex items-center mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] focus-within:ring-2 focus-within:ring-primary/20">
                  <span className="pl-2.5 text-xs text-muted-foreground">{currency.symbol}</span>
                  <input type="number" min={0} step={0.01} value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value) || 0)} className="flex-1 bg-transparent px-2 py-2 text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t('inventory.stock.total')}</label>
                <p className="mt-1 px-3 py-2 text-lg font-bold">{formatCurrency(totalCost, currency)}</p>
              </div>
            </div>

            {/* Location — radio-style selector with stock positions */}
            {modules.stockLocations && locations.length > 0 && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{needsDest ? t('inventory.stock.fromLocation') : t('inventory.stock.locationLabel')}</label>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {sortedLocations.map((l) => {
                      const qty = positionByLocation[l.id] ?? 0
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setLocationId(l.id)}
                          className={cn(
                            'rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all flex items-center gap-2',
                            locationId === l.id
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50',
                          )}
                        >
                          <span>{l.name}</span>
                          {productId && (
                            <span className={cn(
                              'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                              qty > 0
                                ? 'bg-success/10 text-success'
                                : 'bg-muted text-muted-foreground',
                            )}>
                              {qty}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {needsDest && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t('inventory.stock.toLocation')}</label>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {sortedLocations.filter((l) => l.id !== locationId).map((l) => {
                        const qty = positionByLocation[l.id] ?? 0
                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => setDestLocationId(l.id)}
                            className={cn(
                              'rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all flex items-center gap-2',
                              destLocationId === l.id
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50',
                            )}
                          >
                            <span>{l.name}</span>
                            {productId && (
                              <span className={cn(
                                'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                                qty > 0
                                  ? 'bg-success/10 text-success'
                                  : 'bg-muted text-muted-foreground',
                              )}>
                                {qty}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reason (required for adjustment/loss) */}
            {needsReason && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t('inventory.stock.reason')}</label>
                <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={movementType === 'loss' ? t('inventory.stock.reasonLossPlaceholder') : t('inventory.stock.reasonAdjustPlaceholder')} className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors">{t('inventory.stock.back')}</button>
            <button onClick={() => setStep(3)} disabled={!canProceedStep2} className="inline-flex items-center gap-1.5 rounded-lg bg-primary border border-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-colors disabled:opacity-50">{t('inventory.stock.next')}</button>
          </div>
        </div>
      )}

      {/* Step 3: Review + Optional details + Save */}
      {step === 3 && (
        <div className="space-y-5">
          {/* Summary card */}
          <div className="rounded-lg border bg-card shadow-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${typeConfig.activeColor}`}>
                <typeConfig.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{productLabel}</p>
                <p className="text-xs text-muted-foreground capitalize">{movementType} &middot; {quantity} units &middot; {formatCurrency(totalCost, currency)}</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 text-xs border-t pt-3">
              <div><span className="text-muted-foreground">{t('inventory.stock.quantityLabel')}:</span> <span className="font-medium">{quantity}</span></div>
              <div><span className="text-muted-foreground">{t('inventory.stock.unitCostLabel')}:</span> <span className="font-medium">{formatCurrency(unitCost, currency)}</span></div>
              <div><span className="text-muted-foreground">{t('inventory.stock.total')}:</span> <span className="font-bold">{formatCurrency(totalCost, currency)}</span></div>
            </div>
          </div>

          {/* Optional details */}
          <div className="rounded-lg border bg-card shadow-sm p-5 space-y-4">
            <p className="text-xs font-medium text-muted-foreground">{t('inventory.stock.additionalDetails')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t('inventory.stock.documentNumber')}</label>
                <input type="text" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder={t('inventory.stock.documentPlaceholder')} className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              {modules.batchTracking && (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t('inventory.stock.batchNumber')}</label>
                    <input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder={t('inventory.stock.batchPlaceholder')} className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t('inventory.stock.expirationDate')}</label>
                    <DatePicker value={expirationDate} onChange={setExpirationDate} className="mt-1" />
                  </div>
                </>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('inventory.stock.notes')}</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={t('inventory.stock.notesPlaceholder')} className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors">{t('inventory.stock.back')}</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary border border-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-colors disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> {saving ? t('inventory.stock.recording') : t('inventory.stock.recordMovement')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
