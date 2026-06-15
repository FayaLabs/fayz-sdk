import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, Save, Search, LayoutList, X, ChevronDown, Percent, Tag, Building2, Check, MoreVertical, Ban } from 'lucide-react'
import { useFinancialConfig, useFinancialStore, useFinancialProvider, formatCurrency } from '../FinancialContext'
import { SearchSelect } from '@fayz-ai/ui'
import { CurrencyInput } from '@fayz-ai/ui'
import { DatePicker } from '@fayz-ai/ui'
import { Button } from '@fayz-ai/ui'
import type { EntityLookupMap } from '@fayz-ai/saas'
import { SubpageHeader } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import type { TransactionDirection, CreateInvoiceItemInput, CreateMovementInput } from '../types'

// ---------------------------------------------------------------------------
// Location / unit selector
// ---------------------------------------------------------------------------

export interface LocationOption {
  id: string
  name: string
  isHQ?: boolean
}

function LocationSelector({ locations, value, onChange }: {
  locations: LocationOption[]
  value: string
  onChange: (id: string) => void
}) {
  const t = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = locations.find((l) => l.id === value)
  const filtered = locations.filter((l) =>
    !search.trim() || l.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div ref={ref} className="relative">
      <label className="text-xs font-medium text-muted-foreground">{t('financial.invoiceForm.unit')}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full mt-1 flex items-center gap-2 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm text-left hover:bg-muted/30  transition-colors"
      >
        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="flex-1 truncate">{selected?.name ?? t('financial.invoiceForm.selectUnit')}</span>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="fayz-glass-surface absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-popover shadow-lg overflow-hidden min-w-[260px]">
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{t('financial.invoiceForm.selectUnitTitle')}</span>
            <button onClick={() => setOpen(false)} className="ml-auto text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-2 border-b">
            <div className="flex items-center gap-2 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('financial.invoiceForm.searchUnit')}
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-auto py-1">
            {filtered.map((loc) => (
              <button
                key={loc.id}
                onClick={() => { onChange(loc.id); setOpen(false); setSearch('') }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors ${
                  loc.id === value ? 'bg-muted/30' : ''
                }`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{loc.name}</p>
                  {loc.isHQ && <p className="text-[10px] text-muted-foreground">{t('financial.invoiceForm.headquarters')}</p>}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">{t('financial.invoiceForm.noUnitsFound')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ID helper
// ---------------------------------------------------------------------------

let formId = 1
function fid(): string { return `f${formId++}` }

// ---------------------------------------------------------------------------
// Item row — compact by default, expandable for details
// ---------------------------------------------------------------------------

interface FormItem extends CreateInvoiceItemInput {
  _id: string
}

function ItemRow({ item, index, itemTypes, currency, expanded, onToggle, onUpdate, onRemove, entityLookups }: {
  item: FormItem
  index: number
  itemTypes: Array<{ value: string; label: string; icon?: string }>
  currency: { code: string; locale: string; symbol: string }
  expanded: boolean
  onToggle: () => void
  onUpdate: (data: Partial<FormItem>) => void
  onRemove: () => void
  entityLookups: EntityLookupMap
}) {
  const t = useTranslation()
  const total = item.quantity * item.unitPrice - (item.discount ?? 0) + (item.surcharge ?? 0)
  const kindLabel = itemTypes.find((tp) => tp.value === item.itemKind)?.label ?? item.itemKind
  const hasAdjustments = (item.discount ?? 0) > 0 || (item.surcharge ?? 0) > 0
  const [showAdjustments, setShowAdjustments] = useState(hasAdjustments)

  return (
    <div className="border-b last:border-0">
      {/* Compact row — always visible */}
      <div
        className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors group"
        onClick={onToggle}
      >
        <ChevronDown className={`h-3 w-3 text-muted-foreground shrink-0 transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`} />
        <span className="text-[10px] font-medium text-muted-foreground w-5 shrink-0">{index + 1}.</span>
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium bg-muted text-muted-foreground shrink-0">
          {kindLabel}
        </span>
        <span className="text-sm truncate flex-1 min-w-0">{item.description || <span className="text-muted-foreground italic">{t('financial.invoiceForm.noDescription')}</span>}</span>
        <span className="text-xs text-muted-foreground shrink-0">{item.quantity} x {formatCurrency(item.unitPrice, currency)}</span>
        {hasAdjustments && <Tag className="h-3 w-3 text-warning shrink-0" />}
        <span className="text-sm font-semibold shrink-0 min-w-[80px] text-right">{formatCurrency(total, currency)}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all shrink-0"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Expanded detail — edit fields */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 ml-8 space-y-3 bg-muted/10">
          {/* Type selector */}
          <div className="flex gap-1.5">
            {itemTypes.map((tp) => (
              <button
                key={tp.value}
                onClick={() => onUpdate({ itemKind: tp.value })}
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  item.itemKind === tp.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {tp.label}
              </button>
            ))}
          </div>

          {/* Main fields */}
          <div className="grid gap-3 grid-cols-12">
            <div className="col-span-6 sm:col-span-7">
              {entityLookups[item.itemKind] ? (
                <SearchSelect
                  label={t('financial.invoiceForm.item')}
                  value={item.referenceId ?? ''}
                  displayValue={item.description}
                  loadOnOpen
                  onChange={(id, opt) => {
                    const price = (opt?.data as any)?.price
                    onUpdate({
                      referenceId: id || undefined,
                      description: opt?.label ?? '',
                      ...(price != null ? { unitPrice: price } : {}),
                    })
                  }}
                  onSearch={async (q) => {
                    const results = await entityLookups[item.itemKind].search(q)
                    return results.map((r) => ({
                      id: r.id,
                      label: r.label,
                      subtitle: r.subtitle,
                      group: r.group,
                      data: r,
                    }))
                  }}
                  placeholder={`Search ${itemTypes.find((tp) => tp.value === item.itemKind)?.label?.toLowerCase() ?? 'item'}...`}
                  renderOption={(opt) => (
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{opt.label}</p>
                      {opt.subtitle && <p className="text-[10px] text-muted-foreground">{opt.subtitle}</p>}
                    </div>
                  )}
                />
              ) : (
                <>
                  <label className="text-[10px] font-medium text-muted-foreground">{t('financial.invoiceForm.description')}</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => onUpdate({ description: e.target.value })}
                    placeholder={t('financial.invoiceForm.itemDescription')}
                    autoFocus
                    className="w-full mt-0.5 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </>
              )}
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="text-[10px] font-medium text-muted-foreground">{t('financial.invoiceForm.qty')}</label>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => onUpdate({ quantity: Number(e.target.value) || 1 })}
                className="w-full mt-0.5 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="col-span-4">
              <CurrencyInput
                label={t('financial.invoiceForm.unitPrice')}
                value={item.unitPrice}
                onChange={(v) => onUpdate({ unitPrice: v })}
                symbol={currency.symbol}
                locale={currency.locale}
                currencyCode={currency.code}
              />
            </div>
          </div>

          {/* Optional adjustments toggle */}
          {!showAdjustments ? (
            <button
              onClick={() => setShowAdjustments(true)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-3 w-3" /> {t('financial.invoiceForm.discountSurcharge')}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-medium text-muted-foreground">{t('financial.invoiceForm.discount')}</label>
                <div className="flex items-center mt-0.5 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] focus-within:ring-2 focus-within:ring-primary/20">
                  <span className="pl-2 text-xs text-muted-foreground">{currency.symbol}</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.discount ?? 0}
                    onChange={(e) => onUpdate({ discount: Number(e.target.value) || 0 })}
                    className="flex-1 bg-transparent px-2 py-1 text-xs outline-none"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-medium text-muted-foreground">{t('financial.invoiceForm.surcharge')}</label>
                <div className="flex items-center mt-0.5 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] focus-within:ring-2 focus-within:ring-primary/20">
                  <span className="pl-2 text-xs text-muted-foreground">{currency.symbol}</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.surcharge ?? 0}
                    onChange={(e) => onUpdate({ surcharge: Number(e.target.value) || 0 })}
                    className="flex-1 bg-transparent px-2 py-1 text-xs outline-none"
                  />
                </div>
              </div>
              <button
                onClick={() => { onUpdate({ discount: 0, surcharge: 0 }); setShowAdjustments(false) }}
                className="mt-3 p-1 text-muted-foreground hover:text-destructive transition-colors"
                title={t('financial.invoiceForm.removeAdjustments')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Done — collapse row */}
          <div className="flex justify-end pt-1">
            <button
              onClick={onToggle}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Check className="h-3 w-3" /> {t('financial.invoiceForm.done')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Type selector step — shown when adding a new item
// ---------------------------------------------------------------------------

function AddItemStep({ itemTypes, onSelect, onCancel }: {
  itemTypes: Array<{ value: string; label: string; icon?: string }>
  onSelect: (kind: string) => void
  onCancel: () => void
}) {
  const t = useTranslation()
  return (
    <div className="border-b px-4 py-3 bg-primary/5 animate-in fade-in-0 slide-in-from-top-1">
      <p className="text-xs font-medium text-muted-foreground mb-2">{t('financial.invoiceForm.selectItemType')}</p>
      <div className="flex gap-2 flex-wrap">
        {itemTypes.map((t) => (
          <button
            key={t.value}
            onClick={() => onSelect(t.value)}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-transparent bg-card px-4 py-2 text-sm font-medium shadow-sm hover:border-primary hover:shadow-md transition-all"
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={onCancel}
          className="inline-flex items-center rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('financial.invoiceForm.cancel')}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Installment form
// ---------------------------------------------------------------------------

interface FormInstallment {
  _id: string
  amount: number
  dueDate: string
}

// ---------------------------------------------------------------------------
// Invoice form view
// ---------------------------------------------------------------------------

export function InvoiceFormView({ direction, editId, onSaved }: {
  direction: TransactionDirection
  editId?: string
  onSaved?: (id?: string) => void
}) {
  const t = useTranslation()
  const config = useFinancialConfig()
  const { currency, itemTypes, locations } = config
  const provider = useFinancialProvider()
  const createInvoice = useFinancialStore((s) => s.createInvoice)
  const hasLocations = locations.length > 0
  const isEdit = !!editId

  const [loaded, setLoaded] = useState(!editId)
  const [loading, setLoading] = useState(!!editId)
  const [contactName, setContactName] = useState('')
  const [contactId, setContactId] = useState<string | undefined>()
  const [unitId, setUnitId] = useState(locations[0]?.id ?? '')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10))
  const [fiscalNumber, setFiscalNumber] = useState('')
  const [observations, setObservations] = useState('')
  const [items, setItems] = useState<FormItem[]>([])
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  const [addingItem, setAddingItem] = useState(false)
  const [installments, setInstallments] = useState<FormInstallment[]>([])
  const [saving, setSaving] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const cancelInvoice = useFinancialStore((s) => s.cancelInvoice)

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  async function handleCancelInvoice() {
    if (!editId) return
    setCancelling(true)
    try {
      await cancelInvoice(editId)
      onSaved?.()
    } catch {
      // toast handled by store
    } finally {
      setCancelling(false)
    }
  }

  // Load existing invoice for edit mode
  useEffect(() => {
    if (!editId || loaded) return
    setLoading(true)
    ;(async () => {
      const invoice = await provider.getInvoiceById(editId)
      if (!invoice) return
      setContactName(invoice.contactName ?? '')
      setContactId(invoice.contactId)
      setUnitId(invoice.unitId ?? locations[0]?.id ?? '')
      setInvoiceDate(invoice.invoiceDate)
      setFiscalNumber(invoice.fiscalNumber ?? '')
      setObservations(invoice.observations ?? '')

      const invoiceItems = await provider.getInvoiceItems(editId)
      setItems(invoiceItems.map((it) => ({
        _id: fid(),
        itemKind: it.itemKind,
        referenceId: it.referenceId,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
        surcharge: it.surcharge,
      })))

      const movements = await provider.getMovements({ direction: invoice.direction })
      const invoiceMovements = movements.data
        .filter((m) => m.invoiceId === editId && m.movementKind === 'bill')
        .sort((a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0))
      setInstallments(invoiceMovements.map((m) => ({
        _id: fid(),
        amount: m.amount,
        dueDate: m.dueDate,
      })))

      setLoaded(true)
      setLoading(false)
    })()
  }, [editId])

  const totalAmount = items.reduce((sum, it) => {
    return sum + it.quantity * it.unitPrice - (it.discount ?? 0) + (it.surcharge ?? 0)
  }, 0)

  // Auto-generate 1x installment when first item is added
  const prevItemCount = useRef(items.length)
  useEffect(() => {
    if (items.length > 0 && prevItemCount.current === 0 && installments.length === 0 && !isEdit) {
      // First item added — generate 1x installment
      const total = items.reduce((sum, it) => sum + it.quantity * it.unitPrice - (it.discount ?? 0) + (it.surcharge ?? 0), 0)
      if (total > 0) {
        setInstallments([{ _id: fid(), amount: total, dueDate: invoiceDate }])
      }
    }
    prevItemCount.current = items.length
  }, [items.length])

  // Recalculate installment amounts when total changes
  useEffect(() => {
    if (installments.length > 0 && totalAmount > 0 && !isEdit) {
      const count = installments.length
      const perInstallment = Math.floor(totalAmount * 100 / count) / 100
      const remainder = Math.round((totalAmount - perInstallment * count) * 100) / 100
      setInstallments((prev) => prev.map((inst, i) => ({
        ...inst,
        amount: i === 0 ? perInstallment + remainder : perInstallment,
      })))
    }
  }, [totalAmount])

  function addItemOfKind(kind: string) {
    const newItem: FormItem = {
      _id: fid(),
      itemKind: kind,
      description: '',
      quantity: 1,
      unitPrice: 0,
    }
    setItems([...items, newItem])
    setExpandedItemId(newItem._id)
    setAddingItem(false)
  }

  function updateItem(id: string, data: Partial<FormItem>) {
    setItems(items.map((it) => it._id === id ? { ...it, ...data } : it))
  }

  function removeItem(id: string) {
    setItems(items.filter((it) => it._id !== id))
  }

  function generateInstallments(count: number) {
    if (count < 1 || totalAmount <= 0) return
    const perInstallment = Math.floor(totalAmount * 100 / count) / 100
    const remainder = Math.round((totalAmount - perInstallment * count) * 100) / 100
    const base = new Date(invoiceDate)
    const inst: FormInstallment[] = []
    for (let i = 0; i < count; i++) {
      const due = new Date(base)
      due.setMonth(due.getMonth() + i + 1)
      inst.push({
        _id: fid(),
        amount: i === 0 ? perInstallment + remainder : perInstallment,
        dueDate: due.toISOString().slice(0, 10),
      })
    }
    setInstallments(inst)
  }

  async function handleSave() {
    if (items.length === 0) return
    setSaving(true)
    try {
      const movInputs: CreateMovementInput[] = installments.map((inst, i) => ({
        direction,
        movementKind: 'bill' as const,
        amount: inst.amount,
        dueDate: inst.dueDate,
        installmentNumber: i + 1,
      }))

      if (movInputs.length === 0) {
        movInputs.push({
          direction,
          movementKind: 'bill',
          amount: totalAmount,
          dueDate: invoiceDate,
          installmentNumber: 1,
        })
      }

      if (isEdit && editId) {
        await provider.updateInvoice(editId, {
          invoiceDate,
          contactId,
          contactName: contactName || undefined,
          unitId: unitId || undefined,
          fiscalNumber: fiscalNumber || undefined,
          observations: observations || undefined,
          totalAmount,
        })
        onSaved?.(editId)
      } else {
        const invoice = await createInvoice({
          direction,
          invoiceDate,
          contactId,
          contactName: contactName || undefined,
          unitId: unitId || undefined,
          fiscalNumber: fiscalNumber || undefined,
          observations: observations || undefined,
          items: items.map(({ _id, ...rest }) => rest),
          installments: movInputs,
        })
        onSaved?.(invoice.id)
      }
    } finally {
      setSaving(false)
    }
  }

  const title = direction === 'debit' ? t('financial.invoice.accountsPayable') : t('financial.invoice.accountsReceivable')
  const subtitle = isEdit ? t('financial.invoiceForm.editing') : t('financial.invoiceForm.creating')

  return (
    <div className="space-y-6">
      <SubpageHeader
        title={title}
        subtitle={subtitle}
        onBack={onSaved}
        parentLabel={direction === 'debit' ? t('financial.nav.payables') : t('financial.nav.receivables')}
        actions={
          <div className="flex items-center gap-2">
            {onSaved && (
              <Button variant="outline" size="sm" onClick={() => onSaved?.()}>
                <X className="h-3.5 w-3.5" />
                {t('financial.invoiceForm.close')}
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={items.length === 0 || saving}
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? t('financial.invoiceForm.saving') : t('financial.invoiceForm.save')}
            </Button>
            {isEdit && (
              <div className="relative" ref={menuRef}>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label="More actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
                {menuOpen && (
                  <div className="fayz-glass-surface absolute right-0 top-full mt-1 w-44 rounded-lg border bg-popover shadow-md z-20 py-1" style={{ animation: 'field-slide-in 150ms ease-out' }}>
                    <button
                      onClick={() => { setConfirmCancel(true); setMenuOpen(false) }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Ban className="h-3.5 w-3.5" /> {t('financial.invoiceForm.cancelInvoice')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        }
      />

      {/* Top fields: Pay to + Unit + Date + Fiscal Number */}
      <div className="rounded-lg border bg-card shadow-sm p-5">
        <div className={`grid gap-4 ${hasLocations ? 'sm:grid-cols-12' : 'sm:grid-cols-10'}`}>
          <div className={hasLocations ? 'sm:col-span-4' : 'sm:col-span-4'}>
            <SearchSelect
              label={direction === 'debit' ? t('financial.invoiceForm.payTo') : t('financial.invoiceForm.receiveFrom')}
              required
              value={contactId ?? ''}
              displayValue={contactName}
              onChange={(id, opt) => { setContactId(id || undefined); setContactName(opt?.label ?? '') }}
              onSearch={async (q) => {
                if (!config.contactLookup) return []
                const results = await config.contactLookup.search(q)
                return results.map((r) => ({ id: r.id, label: r.label, subtitle: r.subtitle, group: r.group, data: r }))
              }}
              placeholder={t('financial.invoiceForm.searchType')}
            />
          </div>
          {hasLocations && (
            <div className="sm:col-span-3">
              <LocationSelector
                locations={locations}
                value={unitId}
                onChange={setUnitId}
              />
            </div>
          )}
          <div className={hasLocations ? 'sm:col-span-2' : 'sm:col-span-3'}>
            <label className="text-xs font-medium text-muted-foreground">{t('financial.invoiceForm.date')}</label>
            <DatePicker value={invoiceDate} onChange={setInvoiceDate} className="mt-1" />
          </div>
          <div className={hasLocations ? 'sm:col-span-3' : 'sm:col-span-3'}>
            <label className="text-xs font-medium text-muted-foreground">{t('financial.invoiceForm.fiscalNumber')}</label>
            <input
              type="text"
              value={fiscalNumber}
              onChange={(e) => setFiscalNumber(e.target.value)}
              placeholder={t('financial.invoiceForm.fiscalNumber')}
              className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Items + Installments side by side */}
      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <LayoutList className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">{t('financial.invoiceForm.items')}</h3>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-3">
                  <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-8 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                  <div className="h-4 flex-1 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border bg-card shadow-sm">
            <div className="px-5 py-3 border-b">
              <h3 className="text-sm font-semibold">{t('financial.invoiceForm.installments')}</h3>
            </div>
            <div className="p-4 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="rounded border p-2.5 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 w-6 rounded bg-muted animate-pulse" />
                    <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                  </div>
                  <div className="h-7 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Items (left 2/3) */}
        <div className="lg:col-span-2 rounded-lg border bg-card shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <LayoutList className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">{t('financial.invoiceForm.items')}</h3>
            </div>
            <button
              onClick={() => setAddingItem(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary border border-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-colors"
            >
              <Plus className="h-3 w-3" /> {t('financial.invoiceForm.addItem')}
            </button>
          </div>

          {/* Content area — grows to push footer down */}
          <div className="flex-1">
            {/* Type selector step */}
            {addingItem && (
              <AddItemStep
                itemTypes={itemTypes}
                onSelect={addItemOfKind}
                onCancel={() => setAddingItem(false)}
              />
            )}

            {/* Item rows */}
            {items.length === 0 && !addingItem ? (
              <div className="py-10 text-center">
                <LayoutList className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t('financial.invoiceForm.noItems')}</p>
                <button onClick={() => setAddingItem(true)} className="text-xs text-primary hover:underline mt-1">
                  {t('financial.invoiceForm.addFirstItem')}
                </button>
              </div>
            ) : (
              items.map((item, i) => (
                <ItemRow
                  key={item._id}
                  item={item}
                  index={i}
                  itemTypes={itemTypes}
                  currency={currency}
                  expanded={expandedItemId === item._id}
                  onToggle={() => setExpandedItemId(expandedItemId === item._id ? null : item._id)}
                  onUpdate={(data) => updateItem(item._id, data)}
                  onRemove={() => { removeItem(item._id); if (expandedItemId === item._id) setExpandedItemId(null) }}
                  entityLookups={config.entityLookups}
                />
              ))
            )}
          </div>

          {/* Footer total — sticks to bottom */}
          {items.length > 0 && (
            <div className="px-4 py-3 border-t bg-muted/20 flex justify-between items-center mt-auto">
              <span className="text-xs text-muted-foreground">{t('financial.invoiceForm.itemCount', { count: items.length, plural: items.length !== 1 ? 's' : '' })}</span>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">{t('financial.invoiceForm.total')} </span>
                <span className="text-lg font-bold">{formatCurrency(totalAmount, currency)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Installments (right 1/3) */}
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b">
            <h3 className="text-sm font-semibold">Installments</h3>
          </div>
          <div className="p-4 space-y-3">
            {/* Quick split buttons */}
            <div className="flex gap-1.5 flex-wrap">
              {[1, 2, 3, 6, 12].map((n) => (
                <button
                  key={n}
                  onClick={() => generateInstallments(n)}
                  disabled={totalAmount <= 0}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors disabled:opacity-30 ${
                    installments.length === n
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {n}x
                </button>
              ))}
            </div>

            {installments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                {totalAmount <= 0 ? t('financial.invoiceForm.addItemsFirst') : t('financial.invoiceForm.selectInstallments')}
              </p>
            ) : (
              <div className="space-y-2">
                {installments.map((inst, i) => (
                  <div key={inst._id} className="rounded border p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-muted-foreground">#{i + 1}</span>
                      <span className="text-sm font-semibold">{formatCurrency(inst.amount, currency)}</span>
                    </div>
                    <DatePicker
                      value={inst.dueDate}
                      onChange={(v) => {
                        const updated = [...installments]
                        updated[i] = { ...inst, dueDate: v }
                        setInstallments(updated)
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Observations */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">{t('financial.invoiceForm.observations')}</label>
        <textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          placeholder={t('financial.invoiceForm.additionalNotes')}
          rows={2}
          className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {/* Cancel confirmation */}
      {confirmCancel && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfirmCancel(false)}>
          <div className="w-full max-w-sm rounded-modal border bg-card shadow-lg mx-4 p-5" onClick={(e) => e.stopPropagation()} style={{ animation: 'field-slide-in 200ms ease-out' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 shrink-0">
                <Ban className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t('financial.invoiceForm.cancelInvoice')}</h3>
                <p className="text-xs text-muted-foreground">{t('financial.invoiceForm.cancelConfirm')}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {t('financial.invoiceForm.cancelDesc')}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmCancel(false)}>
                {t('financial.invoiceForm.keepInvoice')}
              </Button>
              <Button variant="destructive" size="sm" onClick={handleCancelInvoice} disabled={cancelling}>
                <Ban className="h-3.5 w-3.5" />
                {cancelling ? t('financial.invoiceForm.cancelling') : t('financial.invoiceForm.yesCancel')}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes field-slide-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
