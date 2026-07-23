import { getSupabaseClientOptional } from '@fayz-ai/core'
import { useOrganizationStore } from '../../org/store'

// ---------------------------------------------------------------------------
// createPerson — the ONE way a plugin turns "a name someone typed" into a real
// person record. Extracted from the agenda's inline quick-create so every
// surface that needs "find the contact, or create it" writes the SAME rows:
// `public.people` (the archetype base) plus, when the pool ships it, a
// per-vertical extension table (`clients`, `leads`, …).
//
// Pool tolerance is the whole reason this is shared: beauty-style pools have
// `public.clients`, school/agency pools live off `public.people` alone. A
// MISSING extension table is not an error (PostgREST reports PGRST205 /
// "Could not find the table"); any other failure rolls the person back so a
// half-written contact never survives.
// ---------------------------------------------------------------------------

export interface CreatePersonInput {
  name: string
  phone?: string
  email?: string
  /** `people.kind` discriminator for this vertical (e.g. 'client', 'lead'). */
  kind: string
  /**
   * Optional per-vertical extension table linked by `person_id`. Absent in the
   * pool → silently skipped (see above).
   */
  extensionTable?: string
}

export interface CreatedPerson {
  id: string
  name: string
  phone?: string
  email?: string
}

export async function createPerson(input: CreatePersonInput): Promise<CreatedPerson> {
  const supabase = getSupabaseClientOptional() as any
  const tenantId = useOrganizationStore.getState().currentOrg?.id
  if (!supabase) throw new Error('[createPerson] Supabase client not registered.')
  if (!tenantId) throw new Error('[createPerson] Active tenant not resolved — try again in a moment.')

  const name = input.name.trim()
  const phone = input.phone?.trim() || null
  const email = input.email?.trim() || null

  const { data: personRow, error: personError } = await supabase
    .from('people')
    .insert({ tenant_id: tenantId, kind: input.kind, name, phone, email })
    .select('id, name, phone, email')
    .single()
  if (personError) throw personError

  if (input.extensionTable) {
    const { error: extError } = await supabase
      .from(input.extensionTable)
      .insert({ person_id: personRow.id, tenant_id: tenantId })
    const missingExtensionTable =
      extError?.code === 'PGRST205' || extError?.message?.includes('Could not find the table')
    if (extError && !missingExtensionTable) {
      // Roll the person back so the failure leaves nothing behind.
      await supabase.from('people').delete().eq('id', personRow.id)
      throw extError
    }
  }

  return {
    id: String(personRow.id),
    name: String(personRow.name ?? name),
    phone: personRow.phone ?? undefined,
    email: personRow.email ?? undefined,
  }
}
