import React, { useCallback, useEffect, useState } from 'react'
import { MapPin, Star, Pencil, Trash2, Plus } from 'lucide-react'
import {
  Card, CardContent, Badge, Button, Input, ConfirmDialog,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@fayz-ai/ui'
import { getSupabaseClientOptional, getActiveTenantId, useTranslation } from '@fayz-ai/core'
import { toast } from '../../shell/components/notifications/ToastProvider'

// ---------------------------------------------------------------------------
// Addresses tab — generic on purpose. public.addresses is a CORE table (spine
// migration @fayz-ai/db 017_core_addresses), so any app with a person record
// gets this: a client's delivery addresses, a supplier's pickup point, a staff
// member's home address. Nothing here is shop-specific.
//
// Rows are read by owner_id alone, without an owner_type filter, because a
// person can be reached from two sides today: a core `people` row, or a
// module's own customer row that mirrors it (the shop's plg_shop_customers
// keeps the same id). Both resolve to the same address book. Rows WRITTEN here
// are stamped 'person' — the spine's canonical owner kind.
// ---------------------------------------------------------------------------

export interface AddressRow {
  id: string
  label: string | null
  recipient: string | null
  phone: string | null
  postal_code: string
  street: string
  number: string | null
  complement: string | null
  district: string | null
  city: string
  state: string
  country: string
  is_default: boolean
  kind: string
}

/** The editable shape. Separate from AddressRow: no id, every field a string. */
interface AddressForm {
  label: string
  kind: string
  recipient: string
  phone: string
  postal_code: string
  street: string
  number: string
  complement: string
  district: string
  city: string
  state: string
  is_default: boolean
}

const EMPTY_FORM: AddressForm = {
  label: '', kind: 'both', recipient: '', phone: '', postal_code: '', street: '',
  number: '', complement: '', district: '', city: '', state: '', is_default: false,
}

function toForm(a: AddressRow): AddressForm {
  return {
    label: a.label ?? '', kind: a.kind, recipient: a.recipient ?? '', phone: a.phone ?? '',
    postal_code: a.postal_code, street: a.street, number: a.number ?? '',
    complement: a.complement ?? '', district: a.district ?? '', city: a.city,
    state: a.state, is_default: a.is_default,
  }
}

const SPAN_CLASS: Record<number, string> = {
  1: 'sm:col-span-1', 2: 'sm:col-span-2', 3: 'sm:col-span-3',
  4: 'sm:col-span-4', 6: 'sm:col-span-6',
}

/** Label + control, wired by htmlFor/id so the label is actually clickable and
 *  the control is reachable by its accessible name. */
function Field({ id, label, required, span, children }: {
  id: string
  label: string
  required?: boolean
  span: number
  children: React.ReactNode
}) {
  return (
    <div className={SPAN_CLASS[span]}>
      <label htmlFor={`address-${id}`} className="text-xs text-muted-foreground">
        {label}{required ? ' *' : ''}
      </label>
      {children}
    </div>
  )
}

function formatLine(a: AddressRow): string {
  // Rua, número — complemento · bairro · cidade/UF · CEP, skipping whatever is
  // missing so a partial address never renders stray commas.
  const streetLine = [a.street, a.number].filter(Boolean).join(', ')
  const withComplement = a.complement ? `${streetLine} — ${a.complement}` : streetLine
  return [withComplement, a.district, `${a.city}/${a.state}`, a.postal_code]
    .filter((part) => part && part !== '—' && part !== '/')
    .join(' · ')
}

export function AddressesTab({ item }: { item?: unknown }) {
  const t = useTranslation()
  const record = item as { id?: string } | undefined
  const [rows, setRows] = useState<AddressRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState<AddressRow | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<AddressRow | null>(null)

  const ownerId = record?.id

  // getSupabaseClientOptional is loosely typed at this layer; the query shape is
  // asserted here rather than pulling supabase-js into the UI package.
  const db = () => getSupabaseClientOptional() as unknown as { from: (t: string) => any } | null

  const load = useCallback(async () => {
    const client = db()
    if (!client || !ownerId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    const { data, error: err } = await client
      .from('addresses')
      .select('*')
      .eq('owner_id', ownerId)
      .order('is_default', { ascending: false })
    if (err) setError(err.message)
    else setRows((data ?? []) as AddressRow[])
    setLoading(false)
  }, [ownerId])

  useEffect(() => { void load() }, [load])

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setFormOpen(true) }
  const openEdit = (a: AddressRow) => { setEditing(a); setForm(toForm(a)); setFormOpen(true) }

  const set = <K extends keyof AddressForm>(key: K, value: AddressForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  // CEP, street and city are what make an address findable; the rest is optional.
  const canSave = form.postal_code.trim() !== '' && form.street.trim() !== '' && form.city.trim() !== ''

  const handleSave = async () => {
    const client = db()
    if (!client || !ownerId || !canSave) return
    const tenantId = getActiveTenantId()
    if (!tenantId) { toast.error(t('crud.archetype.addresses.noTenant')); return }

    setSaving(true)
    try {
      const values = {
        label: form.label.trim() || null,
        kind: form.kind,
        recipient: form.recipient.trim() || null,
        phone: form.phone.trim() || null,
        postal_code: form.postal_code.trim(),
        street: form.street.trim(),
        number: form.number.trim() || null,
        complement: form.complement.trim() || null,
        district: form.district.trim() || null,
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        is_default: form.is_default,
      }

      // addresses_one_default_idx is a UNIQUE partial index on
      // (owner_type, owner_id, kind) WHERE is_default — the previous default
      // must be cleared BEFORE this row claims the flag, or the write fails.
      if (form.is_default) {
        let q = client.from('addresses').update({ is_default: false })
          .eq('owner_id', ownerId).eq('kind', form.kind).eq('is_default', true)
        if (editing) q = q.neq('id', editing.id)
        const { error: clearErr } = await q
        if (clearErr) throw clearErr
      }

      const { error: err } = editing
        ? await client.from('addresses').update(values).eq('id', editing.id)
        : await client.from('addresses').insert({
            ...values,
            tenant_id: tenantId,
            owner_type: 'person',
            owner_id: ownerId,
          })
      if (err) throw err

      setFormOpen(false)
      await load()
      toast.success(editing ? t('crud.archetype.addresses.updated') : t('crud.archetype.addresses.created'))
    } catch (e: any) {
      toast.error(t('crud.archetype.addresses.saveFailed'), { description: e?.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const client = db()
    if (!client || !deleting) return
    const { error: err } = await client.from('addresses').delete().eq('id', deleting.id)
    setDeleting(null)
    if (err) { toast.error(t('crud.archetype.addresses.deleteFailed'), { description: err.message }); return }
    await load()
    toast.success(t('crud.archetype.addresses.deleted'))
  }

  if (loading) {
    return (
      <Card><CardContent className="space-y-2 py-6">
        <div className="h-4 w-56 animate-pulse rounded bg-muted/40" />
        <div className="h-4 w-40 animate-pulse rounded bg-muted/30" />
      </CardContent></Card>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <p className="font-medium">{t('crud.archetype.addresses.loadFailed')}</p>
        <p className="mt-1 text-red-700">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> {t('crud.archetype.addresses.add')}
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <MapPin className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">{t('crud.archetype.addresses.emptyTitle')}</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            {t('crud.archetype.addresses.emptyDescription')}
          </p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-start gap-3 py-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {a.label ?? t('crud.archetype.addresses.fallbackLabel')}
                    </span>
                    {a.is_default && (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <Star className="h-2.5 w-2.5" /> {t('crud.archetype.addresses.default')}
                      </Badge>
                    )}
                    {a.kind !== 'both' && (
                      <Badge variant="secondary" className="text-[10px]">
                        {t(`crud.archetype.addresses.kind.${a.kind}`)}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{formatLine(a)}</p>
                  {(a.recipient || a.phone) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[a.recipient, a.phone].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  {/* Named for the ADDRESS, not just "Editar": the person
                      detail header already owns a plain Editar/Excluir pair,
                      and two identical accessible names on one screen is a
                      coin flip for a screen reader user. */}
                  <Button variant="ghost" size="sm" onClick={() => openEdit(a)}
                    aria-label={t('crud.archetype.addresses.editTitle')}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(a)}
                    aria-label={t('crud.archetype.addresses.deleteTitle')}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={formOpen} onOpenChange={setFormOpen}>
        <ModalContent size="lg">
          <ModalHeader>
            <ModalTitle>
              {editing ? t('crud.archetype.addresses.editTitle') : t('crud.archetype.addresses.addTitle')}
            </ModalTitle>
            <ModalDescription>{t('crud.archetype.addresses.formDescription')}</ModalDescription>
          </ModalHeader>

          <div className="grid grid-cols-1 gap-3 px-6 sm:grid-cols-6">
            <Field id="label" span={3} label={t('crud.archetype.addresses.field.label')}>
              <Input id="address-label" value={form.label} onChange={(e) => set('label', e.target.value)}
                placeholder={t('crud.archetype.addresses.labelPlaceholder')} />
            </Field>
            <Field id="kind" span={3} label={t('crud.archetype.addresses.field.kind')}>
              <Select value={form.kind} onValueChange={(v: string) => set('kind', v)}>
                <SelectTrigger id="address-kind"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">{t('crud.archetype.addresses.kind.both')}</SelectItem>
                  <SelectItem value="shipping">{t('crud.archetype.addresses.kind.shipping')}</SelectItem>
                  <SelectItem value="billing">{t('crud.archetype.addresses.kind.billing')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field id="postal_code" span={2} required label={t('crud.archetype.addresses.field.postalCode')}>
              <Input id="address-postal_code" value={form.postal_code}
                onChange={(e) => set('postal_code', e.target.value)} placeholder="00000-000" />
            </Field>
            <Field id="street" span={4} required label={t('crud.archetype.addresses.field.street')}>
              <Input id="address-street" value={form.street} onChange={(e) => set('street', e.target.value)} />
            </Field>

            <Field id="number" span={2} label={t('crud.archetype.addresses.field.number')}>
              <Input id="address-number" value={form.number} onChange={(e) => set('number', e.target.value)} />
            </Field>
            <Field id="complement" span={4} label={t('crud.archetype.addresses.field.complement')}>
              <Input id="address-complement" value={form.complement} onChange={(e) => set('complement', e.target.value)} />
            </Field>

            <Field id="district" span={3} label={t('crud.archetype.addresses.field.district')}>
              <Input id="address-district" value={form.district} onChange={(e) => set('district', e.target.value)} />
            </Field>
            <Field id="city" span={2} required label={t('crud.archetype.addresses.field.city')}>
              <Input id="address-city" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </Field>
            <Field id="state" span={1} label={t('crud.archetype.addresses.field.state')}>
              <Input id="address-state" value={form.state} onChange={(e) => set('state', e.target.value)}
                maxLength={2} placeholder="UF" />
            </Field>

            <Field id="recipient" span={3} label={t('crud.archetype.addresses.field.recipient')}>
              <Input id="address-recipient" value={form.recipient} onChange={(e) => set('recipient', e.target.value)} />
            </Field>
            <Field id="phone" span={3} label={t('crud.archetype.addresses.field.phone')}>
              <Input id="address-phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>

            <label className="flex items-center gap-2 text-sm sm:col-span-6">
              <input type="checkbox" checked={form.is_default}
                onChange={(e) => set('is_default', e.target.checked)} className="h-4 w-4" />
              {t('crud.archetype.addresses.setDefault')}
            </label>
          </div>

          <ModalFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleSave()} disabled={!canSave || saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        variant="destructive"
        title={t('crud.archetype.addresses.deleteTitle')}
        description={deleting ? formatLine(deleting) : ''}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
