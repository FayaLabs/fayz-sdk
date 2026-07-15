import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Plus, X, User, Loader2, Check } from 'lucide-react'
import { Input } from '@fayz-ai/ui'
import { Button } from '@fayz-ai/ui'
import { getSupabaseClientOptional } from '@fayz-ai/core'
import { useOrganizationStore } from '../../org'

interface Person {
  id: string
  name: string
  email?: string
  phone?: string
  kind: string
}

interface PersonPickerProps {
  value?: string | null
  onChange: (personId: string | null, person?: Person) => void
  personKind?: string
  label?: string
  placeholder?: string
  onPersonData?: (data: { name: string; phone?: string; email?: string }) => void
}

export function PersonPicker({
  value,
  onChange,
  personKind = 'customer',
  label = 'Person',
  placeholder = 'Search or type a name to add...',
  onPersonData,
}: PersonPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Person[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Person | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // New person form
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')

  const tenantId = useOrganizationStore((s) => s.currentOrg?.id)

  // Load selected person on mount
  useEffect(() => {
    if (value && !selected) {
      const supabase = getSupabaseClientOptional() as any
      if (!supabase) return
      supabase
        .from('people')
        .select('id, name, email, phone, kind')
        .eq('id', value)
        .single()
        .then(({ data }: any) => {
          if (data) setSelected(data as Person)
        })
    }
  }, [value])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowCreate(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const doSearch = useCallback(async (term: string) => {
    if (!term.trim() || !tenantId) { setResults([]); return }
    setSearching(true)
    try {
      const supabase = getSupabaseClientOptional() as any
      if (!supabase) return
      const { data } = await supabase
        .from('people')
        .select('id, name, email, phone, kind')
        .eq('tenant_id', tenantId)
        .ilike('name', `%${term}%`)
        .limit(6)
      setResults((data ?? []) as Person[])
    } finally {
      setSearching(false)
    }
  }, [tenantId])

  const handleInput = (val: string) => {
    setQuery(val)
    setShowCreate(false)
    if (!open) setOpen(true)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => doSearch(val), 250)
  }

  const handleSelect = (person: Person) => {
    setSelected(person)
    onChange(person.id, person)
    onPersonData?.({ name: person.name, phone: person.phone, email: person.email })
    setOpen(false)
    setQuery('')
    setResults([])
    setShowCreate(false)
  }

  const handleStartCreate = () => {
    setShowCreate(true)
    setNewPhone('')
    setNewEmail('')
  }

  const handleCreate = async () => {
    if (!query.trim() || !tenantId) return
    setCreating(true)
    try {
      const supabase = getSupabaseClientOptional() as any
      if (!supabase) return
      const { data, error } = await supabase
        .from('people')
        .insert({
          tenant_id: tenantId,
          kind: personKind,
          name: query.trim(),
          phone: newPhone.trim() || null,
          email: newEmail.trim() || null,
          is_active: true,
        })
        .select('id, name, email, phone, kind')
        .single()
      if (error) throw error
      handleSelect(data as Person)
    } finally {
      setCreating(false)
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelected(null)
    setQuery('')
    onChange(null)
    onPersonData?.({ name: '', phone: '', email: '' })
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const noResults = query.trim().length > 1 && !searching && results.length === 0

  return (
    <div ref={containerRef} className="relative">
      {/* Selected state */}
      {selected && !open ? (
        <button
          type="button"
          onClick={() => { setOpen(true); setQuery(''); setTimeout(() => inputRef.current?.focus(), 50) }}
          className="flex items-center gap-3 w-full rounded-lg border px-3 py-2.5 text-left hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selected.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {[selected.phone, selected.email].filter(Boolean).join(' · ') || 'No contact info'}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="text-[10px] text-muted-foreground">Change</span>
            <button type="button" onClick={handleClear} className="p-1 text-muted-foreground hover:text-destructive rounded">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </button>
      ) : (
        /* Search input */
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => { if (query) setOpen(true) }}
            placeholder={placeholder}
            className="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      )}

      {/* Dropdown */}
      {open && (query.trim().length > 0 || showCreate) && (
        <div className="fayz-glass-surface absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg overflow-hidden">
          {/* Results */}
          {results.length > 0 && (
            <div className="max-h-52 overflow-y-auto">
              {results.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => handleSelect(person)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{person.name}</p>
                      <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground capitalize shrink-0">
                        {person.kind}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {[person.phone, person.email].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {person.id === value && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* No results — prompt to create */}
          {noResults && !showCreate && (
            <button
              type="button"
              onClick={handleStartCreate}
              className="flex items-center gap-3 w-full px-3 py-3 text-left hover:bg-muted/50 transition-colors border-t border-dashed"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Plus className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Add "<span className="text-primary">{query.trim()}</span>"</p>
                <p className="text-xs text-muted-foreground">Create a new {label.toLowerCase()} with this name</p>
              </div>
            </button>
          )}

          {/* Also show create option when there ARE results */}
          {results.length > 0 && !showCreate && (
            <button
              type="button"
              onClick={handleStartCreate}
              className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors border-t text-xs text-muted-foreground"
            >
              <Plus className="h-3 w-3" />
              Add "<span className="font-medium text-foreground">{query.trim()}</span>" as new {label.toLowerCase()}
            </button>
          )}

          {/* Inline create form */}
          {showCreate && (
            <div className="p-3 border-t space-y-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Plus className="h-3 w-3" />
                </div>
                <p className="text-xs font-medium">New {label}: <span className="text-primary">{query.trim()}</span></p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Phone"
                  className="h-8 text-xs"
                />
                <Input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Email"
                  type="email"
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="button" size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={creating}>
                  {creating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                  {creating ? 'Saving...' : 'Save & Select'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
