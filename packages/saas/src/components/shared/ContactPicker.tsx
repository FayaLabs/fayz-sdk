import React, { useState, useEffect, useMemo, useRef } from 'react'
import { X } from 'lucide-react'
import { SearchCombobox, cn, toast, type ComboboxOption } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { createArchetypeLookup, type EntityLookup } from '../../archetype-lookup'
import { createPerson } from './create-person'
import { PersonLink } from './PersonLink'

// ---------------------------------------------------------------------------
// ContactPicker — "find the person, or create them" as ONE component.
//
// The agenda invented this flow inline (search a client → no match → quick-add
// with name/phone/email → keep going without leaving the modal). It's the same
// need anywhere a plugin starts something FOR someone: a booking, a
// conversation, an invoice. This is that flow, extracted, so the behaviour and
// the rows written stay identical across surfaces (see `createPerson`).
//
// Three states, one component:
//   • empty     → SearchCombobox over the person lookup, with "+ Create <text>"
//   • selected  → a compact chip (PersonLink + phone) with an optional clear
//   • creating  → inline name / phone / email form → `createPerson` → selected
//
// Uncontrolled-friendly: pass `value`/`onChange` and the parent owns the id.
// ---------------------------------------------------------------------------

export interface ContactPickerValue {
  /** Person id — undefined while the user has only typed a name. */
  id?: string
  name: string
  phone?: string
  email?: string
}

export interface ContactPickerProps {
  value: ContactPickerValue | null
  onChange: (value: ContactPickerValue | null) => void
  /**
   * `people.kind` for records created here (e.g. 'client', 'lead', 'contact').
   * Also narrows the default lookup, so a vertical only searches its own people.
   */
  kind?: string
  /** Per-vertical extension table linked by `person_id` — skipped when absent from the pool. */
  extensionTable?: string
  /** Search source. Defaults to the `person` archetype lookup narrowed by `kind`. */
  lookup?: EntityLookup
  /**
   * Allow committing a typed name with NO person record (`{ name }` and no id).
   * Off by default: the point of the picker is to end up with a real contact.
   * Conversations turns it on so an ad-hoc handle can still start a thread.
   */
  allowFreeText?: boolean
  /** Hide the clear button (agenda locks the client on a paid booking). */
  clearable?: boolean
  disabled?: boolean
  autoFocus?: boolean
  placeholder?: string
  /** Collapsed inline label (SearchCombobox `inlineLabel`). Omit for an always-open input. */
  inlineLabel?: string
  /**
   * Copy for the "+ Create …" row. Defaults to the shared "New contact"; a
   * plugin whose vertical calls them something else (the agenda says "client")
   * passes its own label so the wording doesn't regress into generic SDK copy.
   */
  createLabel?: string
  className?: string
  /** Extra hint under the input while a name is typed but nothing is selected. */
  hint?: React.ReactNode
}

export function ContactPicker({
  value,
  onChange,
  kind,
  extensionTable,
  lookup,
  allowFreeText = false,
  clearable = true,
  disabled,
  autoFocus,
  placeholder,
  inlineLabel,
  createLabel,
  className,
  hint,
}: ContactPickerProps) {
  const t = useTranslation()
  const resolvedLookup = useMemo(
    () => lookup ?? createArchetypeLookup({ archetype: 'person', kind }),
    [lookup, kind],
  )

  const [search, setSearch] = useState(value?.id ? value.name : (value?.name ?? ''))
  const [options, setOptions] = useState<ComboboxOption[]>([])
  const [searching, setSearching] = useState(false)

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [saving, setSaving] = useState(false)

  // Keep the visible text in sync with the parent — but ONLY on an id
  // transition. Parents build `value` as a fresh object literal every render, so
  // reacting to the object itself would re-run each keystroke and wipe the text
  // the user is typing (there is no id yet while they type).
  const selectedId = value?.id
  const selectedName = value?.id ? value.name : undefined
  const lastSelectedId = useRef(selectedId)
  useEffect(() => {
    if (selectedId === lastSelectedId.current) return
    lastSelectedId.current = selectedId
    if (selectedId) {
      setSearch(selectedName ?? '')
      setCreating(false)
    } else {
      // Parent dropped the selection (form reset, "change contact", …).
      setSearch('')
    }
  }, [selectedId, selectedName])

  // Debounced search — skipped once a person is selected.
  useEffect(() => {
    if (value?.id || creating || search.trim().length < 1) {
      setOptions([])
      setSearching(false)
      return
    }
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const results = await resolvedLookup.search(search)
        setOptions(results.map((r) => ({ id: r.id, label: r.label, subtitle: r.subtitle, data: r.data })))
      } catch {
        setOptions([])
      }
      setSearching(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [search, value?.id, creating, resolvedLookup])

  // Free-text mode: a typed name with no match is still a usable value, so the
  // parent sees every keystroke. Without it the text would be lost on submit.
  function handleSearchChange(next: string) {
    setSearch(next)
    if (value?.id) onChange(null)
    if (allowFreeText) onChange(next.trim() ? { name: next } : null)
  }

  function handleSelect(opt: ComboboxOption) {
    const data = (opt.data ?? {}) as Record<string, unknown>
    setSearch(opt.label)
    setOptions([])
    onChange({
      id: opt.id,
      name: opt.label,
      phone: (data.phone as string) || undefined,
      email: (data.email as string) || undefined,
    })
  }

  function startCreate(prefillName: string) {
    setCreating(true)
    setNewName(prefillName)
    setNewPhone('')
    setNewEmail('')
  }

  async function handleCreate() {
    if (!newName.trim() || saving) return
    setSaving(true)
    try {
      const person = await createPerson({
        name: newName,
        phone: newPhone,
        email: newEmail,
        kind: kind ?? 'contact',
        extensionTable,
      })
      setSearch(person.name)
      setCreating(false)
      onChange(person)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.error(t('contactPicker.createFailed'), { description: message })
    }
    setSaving(false)
  }

  function handleClear() {
    setSearch('')
    setOptions([])
    onChange(null)
  }

  const inputClass =
    'w-full rounded-input border border-input bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  // ---- Selected -----------------------------------------------------------
  if (value?.id && !creating) {
    return (
      <div className={cn('flex items-center gap-2 rounded-md bg-muted/30 px-2.5 py-1.5 text-sm', className)}>
        <PersonLink personId={value.id} name={value.name} size="default" className="flex-1 min-w-0" />
        {value.phone && <span className="text-[10px] text-muted-foreground shrink-0">{value.phone}</span>}
        {clearable && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            aria-label={t('contactPicker.clear')}
            className="p-0.5 text-muted-foreground hover:text-destructive shrink-0"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    )
  }

  // ---- Creating -----------------------------------------------------------
  if (creating) {
    return (
      <div className={cn('rounded-input border border-input bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] p-2.5 space-y-2', className)}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('contactPicker.name')}
            className={cn(inputClass, 'flex-1 font-medium')}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setCreating(false)}
            aria-label={t('contactPicker.cancel')}
            className="p-1 text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="tel"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder={t('contactPicker.phone')}
            className={inputClass}
          />
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder={t('contactPicker.emailOptional')}
            className={inputClass}
          />
        </div>
        <button
          type="button"
          disabled={saving || !newName.trim()}
          onClick={handleCreate}
          className="w-full rounded-md bg-primary border border-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset disabled:opacity-40 transition-colors"
        >
          {saving ? t('contactPicker.creating') : t('contactPicker.create')}
        </button>
      </div>
    )
  }

  // ---- Empty / searching --------------------------------------------------
  return (
    <div className={className}>
      <SearchCombobox
        value={search}
        onChange={handleSearchChange}
        onSelect={handleSelect}
        options={options}
        loading={searching}
        placeholder={placeholder ?? t('contactPicker.search')}
        allowCreate
        createLabel={createLabel ?? t('contactPicker.newContact')}
        onCreateNew={startCreate}
        autoFocus={autoFocus}
        minimal={!!inlineLabel}
        inlineLabel={inlineLabel}
      />
      {hint && search.trim() && !searching && <div className="mt-1">{hint}</div>}
    </div>
  )
}
