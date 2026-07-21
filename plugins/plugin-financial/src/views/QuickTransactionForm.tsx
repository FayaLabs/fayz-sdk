import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, Check, ChevronDown,
  Tag, Wallet, Repeat, Paperclip, CalendarDays, X, Camera,
} from 'lucide-react'
import {
  Modal, ModalContent, Button, DatePicker, toast,
} from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { useLimitGuard, invalidateLimit } from '@fayz-ai/saas'
import { useFinancialConfig, useFinancialProvider, useFinancialStore, formatCurrency } from '../FinancialContext'
import type { QuickTransactionType } from '../types'
import type { ChartOfAccountsNode, BankAccount } from '../types'

// ---------------------------------------------------------------------------
// Type theme — the header is context-colored so the user always knows what
// kind of money they're logging (Mobills: red expense / green income / neutral
// transfer).
// ---------------------------------------------------------------------------

interface TypeTheme {
  header: string   // header band background + text
  ring: string     // focus/selected accent
  icon: React.ElementType
}

function typeTheme(type: QuickTransactionType): TypeTheme {
  switch (type) {
    case 'income':
      return { header: 'bg-success text-success-foreground', ring: 'ring-success', icon: ArrowDownCircle }
    case 'transfer':
      return { header: 'bg-muted text-foreground', ring: 'ring-ring', icon: ArrowLeftRight }
    case 'expense':
    default:
      return { header: 'bg-destructive text-destructive-foreground', ring: 'ring-destructive', icon: ArrowUpCircle }
  }
}

// ---------------------------------------------------------------------------
// Small popover-chip select (category / account). Thumb-friendly rows.
// ---------------------------------------------------------------------------

function ChipSelect({ icon: Icon, label, value, options, onChange, emptyLabel }: {
  icon: React.ElementType
  label: string
  value?: string
  options: Array<{ id: string; name: string; hint?: string }>
  onChange: (id: string | undefined) => void
  emptyLabel: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const selected = options.find((o) => o.id === value)

  return (
    <div ref={ref} className="relative">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-1 flex w-full items-center gap-2 rounded-input border border-input bg-card px-3 py-2.5 text-left text-sm shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] transition-colors hover:bg-muted/30"
      >
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className={`flex-1 truncate ${selected ? '' : 'text-muted-foreground'}`}>
          {selected?.name ?? emptyLabel}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="fayz-glass-surface absolute bottom-full left-0 right-0 z-50 mb-1 max-h-56 overflow-auto rounded-lg border bg-popover py-1 shadow-lg">
          {options.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">{emptyLabel}</p>
          ) : (
            <>
              {value != null && (
                <button
                  onClick={() => { onChange(undefined); setOpen(false) }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-muted-foreground hover:bg-muted/50"
                >
                  <X className="h-3.5 w-3.5" /> {emptyLabel}
                </button>
              )}
              {options.map((o) => (
                <button
                  key={o.id}
                  onClick={() => { onChange(o.id); setOpen(false) }}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/50 ${o.id === value ? 'bg-muted/30' : ''}`}
                >
                  <span className="flex-1 truncate">{o.name}</span>
                  {o.hint && <span className="text-[10px] text-muted-foreground">{o.hint}</span>}
                  {o.id === value && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toggle pill
// ---------------------------------------------------------------------------

function TogglePill({ icon: Icon, label, checked, onChange, accent }: {
  icon: React.ElementType
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  accent?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
        checked
          ? `border-transparent ${accent ?? 'bg-primary text-primary-foreground'}`
          : 'border-input bg-card text-muted-foreground hover:bg-muted/40'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Quick transaction form — responsive (mobile fullscreen sheet / desktop modal)
// ---------------------------------------------------------------------------

export function QuickTransactionForm({ open, onOpenChange, defaultType = 'expense', defaultAccountId, focusReceipt = false }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultType?: QuickTransactionType
  /** Preselect an account (e.g. opening from a specific card tile → log an expense against it). */
  defaultAccountId?: string
  /**
   * FAY-1226 "snap a receipt": open with the attachment step foregrounded — a
   * prominent capture card at the top of the sheet + auto-open the image picker
   * (mobile offers the camera). Used by the "Enviar recibo" entry point.
   */
  focusReceipt?: boolean
}) {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const provider = useFinancialProvider()
  const createQuickTransaction = useFinancialStore((s) => s.createQuickTransaction)
  const guardMovements = useLimitGuard('movements_month')

  const [type, setType] = useState<QuickTransactionType>(defaultType)
  const [amount, setAmount] = useState(0)
  const [amountStr, setAmountStr] = useState('')
  const [paid, setPaid] = useState(true)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string | undefined>()
  const [accountId, setAccountId] = useState<string | undefined>()
  const [toAccountId, setToAccountId] = useState<string | undefined>()
  const [recurring, setRecurring] = useState(false)
  const [saving, setSaving] = useState(false)
  // FAY-1226: the snapped receipt image, held in-memory as a data URL.
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [categories, setCategories] = useState<ChartOfAccountsNode[]>([])

  // Reset to a clean slate each time the sheet opens.
  useEffect(() => {
    if (!open) return
    setType(defaultType)
    setAmount(0)
    setAmountStr('')
    setPaid(true)
    setDate(new Date().toISOString().slice(0, 10))
    setDescription('')
    setCategoryId(undefined)
    setAccountId(defaultAccountId)
    setToAccountId(undefined)
    setRecurring(false)
    setReceiptUrl(undefined)
  }, [open, defaultType, defaultAccountId])

  // "Enviar recibo" flow: auto-open the picker so the user goes straight to the
  // camera/gallery. Fires once per open; harmless if the browser needs a tap.
  useEffect(() => {
    if (open && focusReceipt) {
      const id = window.setTimeout(() => fileInputRef.current?.click(), 250)
      return () => window.clearTimeout(id)
    }
  }, [open, focusReceipt])

  // Read the selected image into a data URL (mock has no Supabase bucket).
  function onPickReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset the input so re-picking the same file still fires onChange.
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error(t('financial.quickTx.receiptInvalid'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setReceiptUrl(typeof reader.result === 'string' ? reader.result : undefined)
      // TODO(FAY-1230): Claude-vision OCR auto-fill from the receipt image —
      // prefill amount / merchant (description) / category from `reader.result`.
    }
    reader.onerror = () => toast.error(t('financial.quickTx.receiptInvalid'))
    reader.readAsDataURL(file)
  }

  // Load pickers once when opened.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      const [accs, coa] = await Promise.all([
        provider.getBankAccounts(),
        provider.getChartOfAccounts().catch(() => [] as ChartOfAccountsNode[]),
      ])
      if (cancelled) return
      setAccounts(accs)
      setCategories(coa)
      setAccountId((prev) => prev ?? accs[0]?.id)
    })()
    return () => { cancelled = true }
  }, [open, provider])

  const theme = typeTheme(type)
  const HeaderIcon = theme.icon

  const accountOptions = useMemo(
    () => accounts.map((a) => ({ id: a.id, name: a.name, hint: a.accountType === 'credit_card' ? t('financial.quickTx.card') : undefined })),
    [accounts, t],
  )
  const categoryOptions = useMemo(
    () => categories.filter((c) => c.isActive).map((c) => ({ id: c.id, name: c.name, hint: c.code })),
    [categories],
  )

  function onAmountChange(raw: string) {
    // Keep digits + a single separator; store the numeric value.
    const cleaned = raw.replace(/[^\d.,]/g, '').replace(',', '.')
    setAmountStr(raw.replace(/[^\d.,]/g, ''))
    const n = Number.parseFloat(cleaned)
    setAmount(Number.isFinite(n) ? n : 0)
  }

  const canSave =
    amount > 0 &&
    !saving &&
    (type === 'transfer'
      ? !!accountId && !!toAccountId && accountId !== toAccountId
      : true)

  async function handleSave() {
    if (!canSave) {
      if (type === 'transfer' && accountId && accountId === toAccountId) {
        toast.error(t('financial.transfer.sameAccount'))
      }
      return
    }
    // Plan quantity guard (client-side): a transfer writes two movements (from +
    // to), other kinds one. Guard that many against the monthly cap before the
    // store call — the guard opens the global UpgradeModal when it would exceed.
    if ((await guardMovements(type === 'transfer' ? 2 : 1)) === 'blocked') return
    setSaving(true)
    try {
      await createQuickTransaction({
        type,
        amount,
        date,
        paid: type === 'transfer' ? true : paid,
        description: description || undefined,
        categoryId: type === 'transfer' ? undefined : categoryId,
        bankAccountId: accountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        recurring: type === 'transfer' ? false : recurring,
        receiptUrl: type === 'transfer' ? undefined : receiptUrl,
      })
      invalidateLimit('movements_month')
      onOpenChange(false)
    } catch {
      // toast handled by store
    } finally {
      setSaving(false)
    }
  }

  const TYPES: Array<{ id: QuickTransactionType; label: string }> = [
    { id: 'expense', label: t('financial.quickTx.expense') },
    { id: 'income', label: t('financial.quickTx.income') },
    { id: 'transfer', label: t('financial.quickTx.transfer') },
  ]

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="md" noPadding hideClose className="overflow-hidden">
        {/* Context-colored header */}
        <div className={`${theme.header} shrink-0 px-5 pb-5 pt-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HeaderIcon className="h-5 w-5" />
              <h2 className="text-sm font-semibold">{t('financial.quickTx.title')}</h2>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full opacity-80 transition-colors hover:bg-black/10 hover:opacity-100"
              aria-label={t('financial.quickTx.close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Type segmented control */}
          <div className="mt-4 flex gap-1 rounded-full bg-black/15 p-1">
            {TYPES.map((ty) => (
              <button
                key={ty.id}
                onClick={() => setType(ty.id)}
                className={`flex-1 rounded-full px-2 py-1.5 text-xs font-medium transition-colors ${
                  type === ty.id ? 'bg-white/90 text-foreground shadow-sm' : 'opacity-90 hover:bg-white/10'
                }`}
              >
                {ty.label}
              </button>
            ))}
          </div>

          {/* Big amount input */}
          <div className="mt-5 flex items-baseline justify-center gap-2">
            <span className="text-xl font-medium opacity-90">{currency.symbol}</span>
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              value={amountStr}
              onChange={(e) => onAmountChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSave() }}
              placeholder="0,00"
              className="w-full max-w-[220px] bg-transparent text-center text-4xl font-bold tracking-tight outline-none placeholder:opacity-40"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {/* Paid / not paid (hidden for transfers — always settled) */}
          {type !== 'transfer' && (
            <div className="flex items-center justify-between rounded-input border border-input bg-card px-3 py-2.5 shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)]">
              <span className="text-sm font-medium">
                {type === 'income' ? t('financial.quickTx.received') : t('financial.quickTx.paid')}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPaid(true)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${paid ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  {t('financial.quickTx.yes')}
                </button>
                <button
                  onClick={() => setPaid(false)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${!paid ? 'bg-warning text-warning-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  {t('financial.quickTx.no')}
                </button>
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" /> {t('financial.invoiceForm.date')}
            </span>
            <DatePicker value={date} onChange={setDate} />
          </div>

          {/* Description */}
          <div>
            <span className="text-xs font-medium text-muted-foreground">{t('financial.invoiceForm.description')}</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSave() }}
              placeholder={t('financial.quickTx.descriptionPlaceholder')}
              className="mt-1 w-full rounded-input border border-input bg-card px-3 py-2.5 text-sm shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* FAY-1226 receipt attachment — snap/attach an image (data URL in mock).
              Hidden picker; `capture=environment` makes mobile offer the camera. */}
          {type !== 'transfer' && (
            <div>
              <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" /> {t('financial.quickTx.receipt')}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onPickReceipt}
              />
              {receiptUrl ? (
                <div className="flex items-center gap-3 rounded-input border border-input bg-card p-2 shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)]">
                  <img
                    src={receiptUrl}
                    alt={t('financial.quickTx.receipt')}
                    className="h-16 w-16 shrink-0 rounded-md border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t('financial.quickTx.receiptAttached')}</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-primary hover:underline"
                    >
                      {t('financial.quickTx.receiptReplace')}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReceiptUrl(undefined)}
                    aria-label={t('financial.quickTx.receiptRemove')}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex w-full items-center justify-center gap-2 rounded-input border border-dashed px-3 py-3 text-sm font-medium transition-colors hover:bg-muted/30 ${
                    focusReceipt ? 'border-primary text-primary ring-1 ring-primary/30' : 'border-input text-muted-foreground'
                  }`}
                >
                  <Camera className="h-4 w-4" /> {t('financial.quickTx.receiptCapture')}
                </button>
              )}
            </div>
          )}

          {type === 'transfer' ? (
            <div className="grid grid-cols-1 gap-3">
              <ChipSelect
                icon={Wallet}
                label={t('financial.quickTx.fromAccount')}
                value={accountId}
                options={accountOptions}
                onChange={setAccountId}
                emptyLabel={t('financial.quickTx.selectAccount')}
              />
              <ChipSelect
                icon={Wallet}
                label={t('financial.quickTx.toAccount')}
                value={toAccountId}
                options={accountOptions.filter((o) => o.id !== accountId)}
                onChange={setToAccountId}
                emptyLabel={t('financial.quickTx.selectAccount')}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <ChipSelect
                icon={Tag}
                label={t('financial.quickTx.category')}
                value={categoryId}
                options={categoryOptions}
                onChange={setCategoryId}
                emptyLabel={t('financial.quickTx.selectCategory')}
              />
              <ChipSelect
                icon={Wallet}
                label={t('financial.quickTx.account')}
                value={accountId}
                options={accountOptions}
                onChange={setAccountId}
                emptyLabel={t('financial.quickTx.selectAccount')}
              />
            </div>
          )}

          {/* Recurring + attachment (Anexo now opens the receipt picker — FAY-1226) */}
          {type !== 'transfer' && (
            <div className="flex flex-wrap gap-2">
              <TogglePill
                icon={Repeat}
                label={t('financial.quickTx.recurring')}
                checked={recurring}
                onChange={setRecurring}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title={t('financial.quickTx.attachment')}
                className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                  receiptUrl
                    ? 'border-transparent bg-primary text-primary-foreground'
                    : 'border-input bg-card text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <Paperclip className="h-3.5 w-3.5" /> {t('financial.quickTx.attachment')}
                {receiptUrl && <Check className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-3 border-t px-5 py-3">
          <span className="text-xs text-muted-foreground">
            {amount > 0 ? formatCurrency(amount, currency) : t('financial.quickTx.enterAmount')}
          </span>
          <Button
            className="ml-auto"
            onClick={() => void handleSave()}
            disabled={!canSave}
          >
            <Check className="h-4 w-4" />
            {saving ? t('financial.quickTx.saving') : t('financial.quickTx.save')}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  )
}
