import React, { useEffect, useState } from 'react'
import { MapPin, Star } from 'lucide-react'
import { Card, CardContent, Badge } from '@fayz-ai/ui'
import { getSupabaseClientOptional } from '@fayz-ai/core'

// ---------------------------------------------------------------------------
// Addresses tab — generic on purpose. public.addresses is a CORE table, so any
// app with a person record gets this: a client's delivery addresses, a supplier's
// pickup point, a staff member's home address. Nothing here is shop-specific.
//
// `owner_type` is matched loosely because a person can be reached from two
// sides today: a core `people` row, or a module's own customer row that mirrors
// it (the shop's plg_shop_customers keeps the same id). Both resolve to the same
// address book, so both are queried.
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
  const record = item as { id?: string } | undefined
  const [rows, setRows] = useState<AddressRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const ownerId = record?.id

  useEffect(() => {
    let cancelled = false
    // getSupabaseClientOptional is loosely typed at this layer; the query
    // shape is asserted here rather than pulling supabase-js into the UI package.
    const db = getSupabaseClientOptional() as unknown as {
      from: (t: string) => any
    } | null
    if (!db || !ownerId) { setLoading(false); return }

    setLoading(true)
    setError(null)
    db.from('addresses')
      .select('*')
      .eq('owner_id', ownerId)
      .order('is_default', { ascending: false })
      .then(({ data, error: err }: { data: AddressRow[] | null; error: { message: string } | null }) => {
        if (cancelled) return
        if (err) setError(err.message)
        else setRows(data ?? [])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [ownerId])

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
        <p className="font-medium">Não foi possível carregar os endereços.</p>
        <p className="mt-1 text-red-700">{error}</p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <MapPin className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Nenhum endereço cadastrado</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Endereços são salvos automaticamente na primeira compra com entrega.
        </p>
      </CardContent></Card>
    )
  }

  return (
    <div className="space-y-2">
      {rows.map((a) => (
        <Card key={a.id}>
          <CardContent className="flex items-start gap-3 py-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{a.label ?? 'Endereço'}</span>
                {a.is_default && (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <Star className="h-2.5 w-2.5" /> Padrão
                  </Badge>
                )}
                {a.kind !== 'shipping' && (
                  <Badge variant="secondary" className="text-[10px]">{a.kind}</Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{formatLine(a)}</p>
              {(a.recipient || a.phone) && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[a.recipient, a.phone].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
