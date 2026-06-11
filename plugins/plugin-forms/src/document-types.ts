import type React from 'react'

// ============================================================
// Document Type Registry — extensible pattern for plugins
// to contribute document types to the "Add Document" dropdown
// ============================================================

export interface DocumentTypeOption {
  /** Unique id, e.g. 'custom_forms:template:abc123' or 'core:image' */
  id: string
  label: string
  icon: React.ElementType
  /** Group label for dropdown sections (e.g. 'Formulários', 'Arquivos') */
  group: string
  /** Group sort order — lower groups appear first */
  groupOrder?: number
  /** Sort order within group */
  order?: number
  /** Description shown below label */
  description?: string
}

export interface DocumentTypeProvider {
  /** Unique provider id, e.g. 'custom_forms', 'core_files' */
  id: string
  /** Returns available document types for a given person */
  getTypes(personId: string): DocumentTypeOption[] | Promise<DocumentTypeOption[]>
}

// ── Global registry ────────────────────────────────────────

const providers: DocumentTypeProvider[] = []

export function registerDocumentTypeProvider(provider: DocumentTypeProvider) {
  if (providers.find((p) => p.id === provider.id)) return
  providers.push(provider)
}

export function getDocumentTypeProviders(): DocumentTypeProvider[] {
  return providers
}

export async function getAllDocumentTypes(personId: string): Promise<DocumentTypeOption[]> {
  const results = await Promise.all(
    providers.map((p) => Promise.resolve(p.getTypes(personId))),
  )
  const all = results.flat()
  // Sort by groupOrder then order within group
  all.sort((a, b) => (a.groupOrder ?? 50) - (b.groupOrder ?? 50) || (a.order ?? 0) - (b.order ?? 0))
  return all
}
