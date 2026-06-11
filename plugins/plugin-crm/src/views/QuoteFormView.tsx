import React, { useState, useEffect } from 'react'
import { Save, Plus, Trash2, X, Check, ChevronDown } from 'lucide-react'
import { useCrmConfig, useCrmStore, useCrmProvider, formatCurrency } from '../CrmContext'
import { useTranslation } from '@fayz/core'
import type { EntityLookupMap } from '@fayz/saas'
import { SubpageHeader } from '@fayz/ui'
import { SearchSelect, type SearchSelectOption } from '@fayz/ui'
import { CurrencyInput } from '@fayz/ui'
import { DatePicker } from '@fayz/ui'

// ---------------------------------------------------------------------------
// Status indicator pills
// ---------------------------------------------------------------------------

const STATUSES = [
  { value: 'draft', labelKey: 'crm.quoteForm.statusDraft', color: 'bg-primary text-primary-foreground' },
  { value: 'sent', labelKey: 'crm.quoteForm.statusSent', color: 'bg-info-soft text-info-soft-foreground border border-info/30 dark:border-info/30' },
  { value: 'approved', labelKey: 'crm.quoteForm.statusApproved', color: 'bg-success-soft text-success-soft-foreground border border-success/30 dark:border-success/30' },
  { value: 'rejected', labelKey: 'crm.quoteForm.statusRejected', color: 'bg-destructive-soft text-destructive-soft-foreground border border-destructive/30 dark:border-destructive/30' },
  { value: 'expired', labelKey: 'crm.quoteForm.statusExpired', color: 'bg-muted text-muted-foreground border' },
]

// ---------------------------------------------------------------------------
// Quote item
// ---------------------------------------------------------------------------

interface FormQuoteItem {
  _id: string
  itemKind: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
}

let fid = 1
function nextId() { return `qi${fid++}` }

// ---------------------------------------------------------------------------
// Item row — compact collapsed, expandable for edit
// ---------------------------------------------------------------------------

function QuoteItemRow({ item, index, itemTypes, currency, expanded, onToggle, onUpdate, onRemove, showDiscount, onShowDiscount, onHideDiscount, entityLookups }: {
  item: FormQuoteItem
  index: number
  itemTypes: Array<{ value: string; label: string }>
  currency: { code: string; locale: string; symbol: string }
  expanded: boolean
  onToggle: () => void
  onUpdate: (data: Partial<FormQuoteItem>) => void
  onRemove: () => void
  showDiscount: boolean
  onShowDiscount: () => void
  onHideDiscount: () => void
  entityLookups: EntityLookupMap
}) {
  const t = useTranslation()
  const total = item.quantity * item.unitPrice - item.discount
  const kindLabel = itemTypes.find((ty) => ty.value === item.itemKind)?.label ?? item.itemKind

  return (
    <div className="border-b last:border-0">
      {/* Collapsed row */}
      <div className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors group" onClick={onToggle}>
        <ChevronDown className={`h-3 w-3 text-muted-foreground shrink-0 transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`} />
        <span className="text-[10px] font-medium text-muted-foreground w-5 shrink-0">{index + 1}.</span>
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium bg-muted text-muted-foreground shrink-0">{kindLabel}</span>
        <span className="text-sm truncate flex-1 min-w-0">{item.description || <span className="text-muted-foreground italic">{t('crm.quoteForm.noDescription')}</span>}</span>
        <span className="text-xs text-muted-foreground shrink-0">{item.quantity} x {formatCurrency(item.unitPrice, currency)}</span>
        <span className="text-sm font-semibold shrink-0 min-w-[80px] text-right">{formatCurrency(total, currency)}</span>
        <button onClick={(e) => { e.stopPropagation(); onRemove() }} className="p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all shrink-0">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Expanded edit */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 ml-8 space-y-3 bg-muted/10">
          {/* Type selector */}
          <div className="flex gap-1.5">
            {itemTypes.map((t) => (
              <button key={t.value} onClick={() => onUpdate({ itemKind: t.value })}
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${item.itemKind === t.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div className="grid gap-3 grid-cols-12">
            <div className="col-span-6 sm:col-span-7">
              {entityLookups[item.itemKind] ? (
                <SearchSelect
                  label="Item"
                  value={item._id}
                  displayValue={item.description}
                  loadOnOpen
                  onChange={(id, opt) => {
                    onUpdate({
                      description: opt?.label ?? '',
                      unitPrice: (opt?.data as any)?.price ?? item.unitPrice,
                    })
                  }}
                  onSearch={async (q) => {
                    const results = await entityLookups[item.itemKind].search(q)
                    return results.map((r) => ({ id: r.id, label: r.label, subtitle: r.subtitle, group: r.group, data: r }))
                  }}
                  placeholder={`Search ${itemTypes.find((t) => t.value === item.itemKind)?.label?.toLowerCase() ?? 'item'}...`}
                  renderOption={(opt) => (
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{opt.label}</p>
                      {opt.subtitle && <p className="text-[10px] text-muted-foreground">{opt.subtitle}</p>}
                    </div>
                  )}
                />
              ) : (
                <>
                  <label className="text-[10px] font-medium text-muted-foreground">{t('crm.quoteForm.description')}</label>
                  <input type="text" value={item.description} onChange={(e) => onUpdate({ description: e.target.value })} placeholder={t('crm.quoteForm.itemDescriptionPlaceholder')} autoFocus className="w-full mt-0.5 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </>
              )}
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="text-[10px] font-medium text-muted-foreground">{t('crm.quoteForm.qty')}</label>
              <input type="number" min={1} value={item.quantity} onChange={(e) => onUpdate({ quantity: Number(e.target.value) || 1 })} className="w-full mt-0.5 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="col-span-4">
              <CurrencyInput label={t('crm.quoteForm.unitPrice')} value={item.unitPrice} onChange={(v) => onUpdate({ unitPrice: v })} symbol={currency.symbol} locale={currency.locale} currencyCode={currency.code} />
            </div>
          </div>

          {/* Discount (optional) */}
          {!showDiscount ? (
            <button onClick={onShowDiscount} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Plus className="h-3 w-3" /> {t('crm.quoteForm.discount')}
            </button>
          ) : (
            <div className="grid gap-3 grid-cols-12 items-end">
              <div className="col-span-4">
                <CurrencyInput label={t('crm.quoteForm.discount')} value={item.discount} onChange={(v) => onUpdate({ discount: v })} symbol={currency.symbol} locale={currency.locale} currencyCode={currency.code} />
              </div>
              <div className="col-span-1">
                <button onClick={() => { onUpdate({ discount: 0 }); onHideDiscount() }} className="mb-2 p-1 text-muted-foreground hover:text-destructive transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Done */}
          <div className="flex justify-end pt-1">
            <button onClick={onToggle} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <Check className="h-3 w-3" /> {t('crm.quoteForm.done')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add item step
// ---------------------------------------------------------------------------

function AddItemStep({ itemTypes, onSelect, onCancel }: {
  itemTypes: Array<{ value: string; label: string }>
  onSelect: (kind: string) => void
  onCancel: () => void
}) {
  const t = useTranslation()
  return (
    <div className="border-b px-4 py-3 bg-primary/5 animate-in fade-in-0 slide-in-from-top-1">
      <p className="text-xs font-medium text-muted-foreground mb-2">{t('crm.quoteForm.selectItemType')}</p>
      <div className="flex gap-2 flex-wrap">
        {itemTypes.map((t) => (
          <button key={t.value} onClick={() => onSelect(t.value)} className="inline-flex items-center gap-1.5 rounded-lg border-2 border-transparent bg-card px-4 py-2 text-sm font-medium shadow-sm hover:border-primary hover:shadow-md transition-all">
            {t.label}
          </button>
        ))}
        <button onClick={onCancel} className="inline-flex items-center rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">{t('crm.quoteForm.cancel')}</button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Quote form (create + edit)
// ---------------------------------------------------------------------------

export function QuoteFormView({ quoteId, leadId, onSaved }: { quoteId?: string; leadId?: string; onSaved?: (savedId?: string) => void }) {
  const t = useTranslation()
  const config = useCrmConfig()
  const provider = useCrmProvider()
  const { currency, itemTypes } = config
  const createQuote = useCrmStore((s) => s.createQuote)
  const updateQuote = useCrmStore((s) => s.updateQuote)

  const isEdit = !!quoteId
  const [loadingExisting, setLoadingExisting] = useState(isEdit || !!leadId)

  const [linkedLeadId, setLinkedLeadId] = useState(leadId ?? '')
  const [linkedDealId, setLinkedDealId] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactId, setContactId] = useState('')
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10))
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })
  const [currentStatus, setCurrentStatus] = useState('draft')
  const [paymentConditions, setPaymentConditions] = useState('')
  const [observations, setObservations] = useState('')
  const [items, setItems] = useState<FormQuoteItem[]>([])
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  const [discountVisible, setDiscountVisible] = useState<Set<string>>(new Set())
  const [addingItem, setAddingItem] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load existing quote for edit mode
  useEffect(() => {
    if (!quoteId) return
    provider.getQuoteById(quoteId).then((q) => {
      if (q) {
        setContactName(q.contactName ?? '')
        setContactId(q.contactId ?? '')
        setLinkedLeadId(q.leadId ?? '')
        setLinkedDealId(q.dealId ?? '')
        setQuoteDate(q.quoteDate)
        setValidUntil(q.validUntil)
        setCurrentStatus(q.status)
        setPaymentConditions(q.paymentConditions ?? '')
        setObservations(q.observations ?? '')
        setItems(q.items.map((it) => ({
          _id: nextId(),
          itemKind: it.itemKind,
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount,
        })))
        setDiscountVisible(new Set(q.items.filter((it) => it.discount > 0).map((_, i) => `qi${fid - q.items.length + i}`)))
      }
      setLoadingExisting(false)
    })
  }, [quoteId])

  // Pre-fill from lead
  useEffect(() => {
    if (!leadId || quoteId) return
    provider.getLeadById(leadId).then(async (lead) => {
      if (lead) {
        setContactName(lead.name)
        setContactId(lead.id)
        setLinkedLeadId(lead.id)
        // Find existing deal for this lead
        const deal = await provider.getDealByLeadId(lead.id)
        if (deal) setLinkedDealId(deal.id)
      }
      setLoadingExisting(false)
    })
  }, [leadId])

  const totalAmount = items.reduce((sum, it) => sum + (it.quantity * it.unitPrice - it.discount), 0)

  function addItemOfKind(kind: string) {
    const newItem: FormQuoteItem = { _id: nextId(), itemKind: kind, description: '', quantity: 1, unitPrice: 0, discount: 0 }
    setItems([...items, newItem])
    setExpandedItemId(newItem._id)
    setAddingItem(false)
  }

  function updateItem(id: string, data: Partial<FormQuoteItem>) {
    setItems(items.map((it) => it._id === id ? { ...it, ...data } : it))
  }

  function removeItem(id: string) {
    setItems(items.filter((it) => it._id !== id))
    if (expandedItemId === id) setExpandedItemId(null)
  }

  async function handleSave() {
    if (items.length === 0) return
    setSaving(true)
    try {
      const input = {
        contactId: contactId || undefined,
        contactName: contactName || undefined,
        leadId: linkedLeadId || undefined,
        dealId: linkedDealId || undefined,
        quoteDate,
        validUntil,
        paymentConditions: paymentConditions || undefined,
        observations: observations || undefined,
        items: items.map((it) => ({
          itemKind: it.itemKind,
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount,
          totalAmount: it.quantity * it.unitPrice - it.discount,
        })),
      }
      if (isEdit) {
        await updateQuote(quoteId!, input)
        onSaved?.(quoteId)
      } else {
        const created = await createQuote(input)
        onSaved?.(created?.id)
      }
    } finally { setSaving(false) }
  }

  if (loadingExisting) {
    return (
      <div className="space-y-5">
        <SubpageHeader title="" onBack={onSaved} parentLabel={t('crm.quotes.title')} />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border bg-card shadow-sm p-5 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-16 rounded bg-muted/30 animate-pulse" />
                <div className="h-9 w-full rounded-lg bg-muted/20 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="lg:col-span-2 rounded-lg border bg-card shadow-sm p-5 space-y-3">
            <div className="h-4 w-24 rounded bg-muted/30 animate-pulse" />
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="h-4 w-4 rounded bg-muted/30 animate-pulse" />
                <div className="h-4 flex-1 rounded bg-muted/20 animate-pulse" />
                <div className="h-4 w-20 rounded bg-muted/30 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <SubpageHeader
        title={isEdit ? t('crm.quoteForm.editTitle') : t('crm.quoteForm.newTitle')}
        subtitle={isEdit ? t('crm.quoteForm.editSubtitle') : t('crm.quoteForm.newSubtitle')}
        onBack={() => onSaved?.()}
        parentLabel={t('crm.quotes.title')}
        actions={
          <div className="flex items-center gap-2">
            {onSaved && (
              <button onClick={() => onSaved()} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors">
                <X className="h-3 w-3" /> {t('crm.quoteForm.cancel')}
              </button>
            )}
            <button onClick={handleSave} disabled={items.length === 0 || saving} className="inline-flex items-center gap-1.5 rounded-lg bg-primary border border-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-colors disabled:opacity-50">
              <Save className="h-3 w-3" /> {saving ? t('crm.quoteForm.saving') : isEdit ? t('crm.quoteForm.saveChanges') : t('crm.quoteForm.saveQuote')}
            </button>
          </div>
        }
      />

      {/* Status indicator */}
      <div className="flex gap-2">
        {STATUSES.map((s) => (
          <span key={s.value} className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${s.value === currentStatus ? s.color : 'bg-muted/30 text-muted-foreground/50'}`}>
            {t(s.labelKey)}
          </span>
        ))}
      </div>

      {/* Quote details + Items — side by side */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: Quote details */}
        <div className="rounded-lg border bg-card shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold">{t('crm.quoteForm.quoteDetails')}</h3>

          <SearchSelect
            value={contactId}
            displayValue={contactName}
            onChange={(id, opt) => { setContactId(id); setContactName(opt?.label ?? '') }}
            onSearch={async (q) => {
              if (!config.contactLookup) return []
              const results = await config.contactLookup.search(q)
              return results.map((r) => ({ id: r.id, label: r.label, subtitle: r.subtitle, group: r.group, data: r }))
            }}
            label={t('crm.quoteForm.client')}
            required
            placeholder={t('crm.quoteForm.searchClient')}
            allowCreate
            createLabel={t('crm.quoteForm.addAsLead')}
            onCreate={async (name) => {
              const lead = await provider.createLead({ name })
              setContactId(lead.id)
              setContactName(lead.name)
            }}
          />

          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('crm.quoteForm.quoteDate')}</label>
            <DatePicker value={quoteDate} onChange={setQuoteDate} className="mt-1" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('crm.quoteForm.validUntil')}</label>
            <DatePicker value={validUntil} onChange={setValidUntil} className="mt-1" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('crm.quoteForm.paymentConditions')}</label>
            <textarea value={paymentConditions} onChange={(e) => setPaymentConditions(e.target.value)} rows={2} placeholder={t('crm.quoteForm.paymentConditionsPlaceholder')} className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('crm.quoteForm.notes')}</label>
            <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={2} placeholder={t('crm.quoteForm.notesPlaceholder')} className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
        </div>

        {/* Right: Items */}
        <div className="lg:col-span-2 rounded-lg border bg-card shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-semibold">{t('crm.quoteForm.quoteItems')}</h3>
            <button onClick={() => setAddingItem(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary border border-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-colors">
              <Plus className="h-3 w-3" /> {t('crm.quoteForm.addItem')}
            </button>
          </div>

          <div className="flex-1">
            {addingItem && (
              <AddItemStep itemTypes={itemTypes} onSelect={addItemOfKind} onCancel={() => setAddingItem(false)} />
            )}

            {items.length === 0 && !addingItem ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">{t('crm.quoteForm.noItems')}</p>
                <button onClick={() => setAddingItem(true)} className="text-xs text-primary hover:underline mt-1">{t('crm.quoteForm.addFirstItem')}</button>
              </div>
            ) : (
              items.map((item, i) => (
                <QuoteItemRow
                  key={item._id}
                  item={item}
                  index={i}
                  itemTypes={itemTypes}
                  currency={currency}
                  expanded={expandedItemId === item._id}
                  onToggle={() => setExpandedItemId(expandedItemId === item._id ? null : item._id)}
                  onUpdate={(data) => updateItem(item._id, data)}
                  onRemove={() => removeItem(item._id)}
                  showDiscount={discountVisible.has(item._id) || item.discount > 0}
                  onShowDiscount={() => setDiscountVisible((prev) => new Set(prev).add(item._id))}
                  onHideDiscount={() => setDiscountVisible((prev) => { const next = new Set(prev); next.delete(item._id); return next })}
                  entityLookups={config.entityLookups}
                />
              ))
            )}
          </div>

          {/* Total footer */}
          {items.length > 0 && (
            <div className="px-4 py-3 border-t bg-muted/20 flex justify-between items-center mt-auto">
              <span className="text-xs text-muted-foreground">{t('crm.quoteForm.itemCount', { count: String(items.length) })}</span>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">{t('crm.quoteForm.total')}: </span>
                <span className="text-lg font-bold">{formatCurrency(totalAmount, currency)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
