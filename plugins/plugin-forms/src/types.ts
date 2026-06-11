// ============================================================
// FORM FIELD TYPES (builder palette)
// ============================================================

export type FormFieldType =
  | 'title'      // Section heading (no input)
  | 'text'       // Texto Simples
  | 'memo'       // Memorando (multiline plain text)
  | 'richtext'   // Texto Rico
  | 'date'       // Data
  | 'select'     // Seleção
  | 'radio'      // Radio
  | 'tags'       // Tags (multiselect chips)
  | 'checkbox'   // Checkbox
  | 'image'      // Imagem / Desenho
  | 'gallery'    // Galeria
  | 'budget'     // Orçamento (line items + prices)

// ============================================================
// FORM FIELD DEFINITION (stored in template.schema.fields[])
// ============================================================

export interface FormFieldDef {
  id: string
  type: FormFieldType
  label: string
  placeholder?: string
  required?: boolean
  /** Start column (0-based) */
  col: number
  /** Row index */
  row: number
  /** Column span (1–12) */
  colSpan: number
  /** Row span (default: 1) */
  rowSpan?: number
  /** Options for select / radio / tags */
  options?: Array<{ label: string; value: string }>
  /** Type-specific configuration */
  config?: Record<string, unknown>
}

export interface FormSchema {
  fields: FormFieldDef[]
  layout: { columns: 12 }
}

// ============================================================
// TEMPLATE (maps to frm_templates)
// ============================================================

export type TemplateCategory =
  | 'anamnesis'
  | 'evolution'
  | 'report'
  | 'contract'
  | 'general'

export interface FormTemplate {
  id: string
  tenantId: string
  name: string
  description?: string
  category: TemplateCategory
  version: number
  isCurrent: boolean
  parentId?: string
  schema: FormSchema
  specialty?: string
  tags: string[]
  metadata: Record<string, unknown>
  isActive: boolean
  isDeleted: boolean
  createdBy?: string
  updatedBy?: string
  createdAt: string
  updatedAt: string
}

// ============================================================
// DOCUMENT (maps to frm_documents)
// ============================================================

export type DocumentStatus = 'draft' | 'completed' | 'signed' | 'archived'

export interface FormDocument {
  id: string
  tenantId: string
  templateId: string
  templateName?: string
  templateCategory?: TemplateCategory
  personId?: string
  personName?: string
  title?: string
  data: Record<string, unknown>
  status: DocumentStatus
  signedAt?: string
  signedBy?: string
  notes?: string
  metadata: Record<string, unknown>
  isDeleted: boolean
  createdBy?: string
  updatedBy?: string
  createdAt: string
  updatedAt: string
  /** Document kind from saas_core.documents */
  kind?: string
  /** File URL for image/attachment documents */
  fileUrl?: string
  fileName?: string
  fileSize?: number
  mimeType?: string
}

// ============================================================
// DOCUMENT FILE (maps to frm_document_files)
// ============================================================

export interface DocumentFile {
  id: string
  tenantId: string
  documentId: string
  fieldKey: string
  fileUrl: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  sortOrder: number
  metadata: Record<string, unknown>
  createdAt: string
}

// ============================================================
// QUERIES
// ============================================================

export interface TemplateQuery {
  category?: TemplateCategory
  search?: string
  page?: number
  pageSize?: number
}

export interface DocumentQuery {
  personId?: string
  templateId?: string
  status?: DocumentStatus | DocumentStatus[]
  search?: string
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
}

// ============================================================
// INPUTS
// ============================================================

export interface CreateTemplateInput {
  name: string
  description?: string
  category: TemplateCategory
  schema: FormSchema
  specialty?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface UpdateTemplateInput {
  name?: string
  description?: string
  category?: TemplateCategory
  schema?: FormSchema
  specialty?: string
  tags?: string[]
  metadata?: Record<string, unknown>
  isActive?: boolean
}

export interface CreateDocumentInput {
  templateId?: string
  personId?: string
  title?: string
  data?: Record<string, unknown>
  status?: DocumentStatus
  /** Document kind: 'form', 'image', 'attachment', etc. */
  kind?: string
  /** File fields for non-form documents */
  fileUrl?: string
  fileName?: string
  fileSize?: number
  mimeType?: string
}

export interface UpdateDocumentInput {
  data?: Record<string, unknown>
  status?: DocumentStatus
  title?: string
  notes?: string
}
