import { getFormsTenantId } from '../lib/tenant'
import type { CustomFormsDataProvider } from './types'
import type {
  FormTemplate,
  FormDocument,
  DocumentFile,
  TemplateQuery,
  DocumentQuery,
  PaginatedResult,
  CreateTemplateInput,
  UpdateTemplateInput,
  CreateDocumentInput,
  UpdateDocumentInput,
} from '../types'
import { getSupabaseClientOptional } from '@fayz/core'

function getTenantId(): string {
  return getFormsTenantId() ?? ''
}

function getClient() {
  const supabase = getSupabaseClientOptional() as any
  if (!supabase) throw new Error('Supabase not initialized')
  return supabase
}


function mapTemplate(r: any): FormTemplate {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    description: r.description,
    category: r.category,
    version: r.version,
    isCurrent: r.is_current,
    parentId: r.parent_id,
    schema: r.schema,
    specialty: r.specialty,
    tags: r.tags ?? [],
    metadata: r.metadata ?? {},
    isActive: r.is_active,
    isDeleted: r.is_deleted,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function mapDocument(r: any): FormDocument {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    templateId: r.template_id ?? '',
    templateName: r.template_name,
    templateCategory: r.template_category,
    personId: r.person_id,
    personName: r.person_name,
    title: r.title,
    data: r.form_data ?? {},
    status: r.status,
    signedAt: r.signed_at,
    signedBy: r.signed_by,
    notes: r.notes,
    metadata: r.metadata ?? {},
    isDeleted: false,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    // Extra fields from core document
    kind: r.kind,
    fileUrl: r.file_url,
    fileName: r.file_name,
    fileSize: r.file_size,
    mimeType: r.mime_type,
  }
}

function mapFile(r: any): DocumentFile {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    documentId: r.document_id,
    fieldKey: r.field_key,
    fileUrl: r.file_url,
    fileName: r.file_name,
    fileSize: r.file_size,
    mimeType: r.mime_type,
    sortOrder: r.sort_order,
    metadata: r.metadata ?? {},
    createdAt: r.created_at,
  }
}

export function createSupabaseFormsProvider(): CustomFormsDataProvider {
  return {
    // ── Templates ──────────────────────────────────────────

    async getTemplates(query: TemplateQuery): Promise<PaginatedResult<FormTemplate>> {
      const db = getClient()
      let qb = db
        .from('frm_templates')
        .select('*', { count: 'exact' })
        .eq('tenant_id', getTenantId())
        .eq('is_current', true)
        .eq('is_deleted', false)

      if (query.category) qb = qb.eq('category', query.category)
      if (query.search) qb = qb.ilike('name', `%${query.search}%`)

      const page = query.page ?? 1
      const pageSize = query.pageSize ?? 25
      qb = qb
        .order('updated_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      const { data, count, error } = await qb
      if (error) throw new Error(error.message)
      return { data: (data ?? []).map(mapTemplate), total: count ?? 0 }
    },

    async getTemplateById(id: string): Promise<FormTemplate | null> {
      const db = getClient()
      const { data, error } = await db
        .from('frm_templates')
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .single()
      if (error || !data) return null
      return mapTemplate(data)
    },

    async createTemplate(input: CreateTemplateInput): Promise<FormTemplate> {
      const db = getClient()
      const tenantId = getTenantId()
      const { data, error } = await db
        .from('frm_templates')
        .insert({
          tenant_id: tenantId,
          name: input.name,
          description: input.description,
          category: input.category,
          schema: input.schema,
          specialty: input.specialty,
          tags: input.tags ?? [],
          metadata: input.metadata ?? {},
        })
        .select()
        .single()
      if (error) throw new Error(error.message)
      return mapTemplate(data)
    },

    async updateTemplate(id: string, input: UpdateTemplateInput): Promise<FormTemplate> {
      const db = getClient()
      const tenantId = getTenantId()

      const { count } = await db
        .from('frm_documents')
        .select('document_id', { count: 'exact', head: true })
        .eq('template_id', id)

      const hasDocuments = (count ?? 0) > 0

      if (hasDocuments && input.schema) {
        const existing = await this.getTemplateById(id)
        if (!existing) throw new Error('Template not found')

        const { data: newRow, error: insertError } = await db
          .from('frm_templates')
          .insert({
            tenant_id: tenantId,
            name: input.name ?? existing.name,
            description: input.description ?? existing.description,
            category: input.category ?? existing.category,
            schema: input.schema,
            specialty: input.specialty ?? existing.specialty,
            tags: input.tags ?? existing.tags,
            metadata: input.metadata ?? existing.metadata,
            is_active: input.isActive ?? existing.isActive,
            version: existing.version + 1,
            is_current: true,
            parent_id: existing.parentId ?? existing.id,
          })
          .select()
          .single()
        if (insertError) throw new Error(insertError.message)

        await db
          .from('frm_templates')
          .update({ is_current: false, updated_at: new Date().toISOString() })
          .eq('id', id)

        return mapTemplate(newRow)
      }

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (input.name !== undefined) updates.name = input.name
      if (input.description !== undefined) updates.description = input.description
      if (input.category !== undefined) updates.category = input.category
      if (input.schema !== undefined) updates.schema = input.schema
      if (input.specialty !== undefined) updates.specialty = input.specialty
      if (input.tags !== undefined) updates.tags = input.tags
      if (input.metadata !== undefined) updates.metadata = input.metadata
      if (input.isActive !== undefined) updates.is_active = input.isActive

      const { data, error } = await db
        .from('frm_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return mapTemplate(data)
    },

    async deleteTemplate(id: string): Promise<void> {
      const db = getClient()
      const { error } = await db
        .from('frm_templates')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },

    // ── Documents (saas_core.documents + frm_documents extension) ──

    async getDocuments(query: DocumentQuery): Promise<PaginatedResult<FormDocument>> {
      const db = getClient()
      // Query through the v_documents view (joins core + form extension)
      let qb = db
        .from('v_documents')
        .select('*', { count: 'exact' })
        .eq('tenant_id', getTenantId())
        .eq('is_active', true)

      if (query.personId) qb = qb.eq('person_id', query.personId)
      if (query.templateId) qb = qb.eq('template_id', query.templateId)
      if (query.status) {
        const statuses = Array.isArray(query.status) ? query.status : [query.status]
        qb = qb.in('status', statuses)
      }
      if (query.search) qb = qb.or(`title.ilike.%${query.search}%,template_name.ilike.%${query.search}%`)

      const page = query.page ?? 1
      const pageSize = query.pageSize ?? 50
      qb = qb
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      const { data, count, error } = await qb
      if (error) throw new Error(error.message)
      return { data: (data ?? []).map(mapDocument), total: count ?? 0 }
    },

    async getDocumentById(id: string): Promise<FormDocument | null> {
      const db = getClient()
      const { data, error } = await db
        .from('v_documents')
        .select('*')
        .eq('id', id)
        .single()
      if (error || !data) return null
      return mapDocument(data)
    },

    async createDocument(input: CreateDocumentInput): Promise<FormDocument> {
      const tenantId = getTenantId()
      const isForm = !!input.templateId

      // Step 1: Insert into saas_core.documents
      const { data: coreDoc, error: coreError } = await getClient()
        .from('frm_core_documents')
        .insert({
          tenant_id: tenantId,
          kind: input.kind ?? (isForm ? 'form' : 'attachment'),
          person_id: input.personId,
          title: input.title,
          status: input.status ?? 'draft',
          file_url: input.fileUrl,
          file_name: input.fileName,
          file_size: input.fileSize,
          mime_type: input.mimeType,
          metadata: {},
        })
        .select()
        .single()
      if (coreError) throw new Error(coreError.message)

      // Step 2: For form documents, insert extension row
      if (isForm && input.templateId) {
        const db = getClient()
        const { error: extError } = await db
          .from('frm_documents')
          .insert({
            document_id: coreDoc.id,
            tenant_id: tenantId,
            template_id: input.templateId,
            data: input.data ?? {},
          })
        if (extError) {
          // Rollback core insert
          await getClient().from('frm_core_documents').delete().eq('id', coreDoc.id)
          throw new Error(extError.message)
        }
      }

      // Fetch via view to get joined data
      const doc = await this.getDocumentById(coreDoc.id)
      return doc!
    },

    async updateDocument(id: string, input: UpdateDocumentInput): Promise<FormDocument> {
      const now = new Date().toISOString()

      // Update core document fields
      const coreUpdates: Record<string, unknown> = { updated_at: now }
      if (input.status !== undefined) coreUpdates.status = input.status
      if (input.title !== undefined) coreUpdates.title = input.title
      if (input.notes !== undefined) coreUpdates.notes = input.notes

      const { error: coreError } = await getClient()
        .from('frm_core_documents')
        .update(coreUpdates)
        .eq('id', id)
      if (coreError) throw new Error(coreError.message)

      // Update form extension if data is provided
      if (input.data !== undefined) {
        const db = getClient()
        await db
          .from('frm_documents')
          .update({ data: input.data, updated_at: now })
          .eq('document_id', id)
      }

      const doc = await this.getDocumentById(id)
      return doc!
    },

    async deleteDocument(id: string): Promise<void> {
      const { error } = await getClient()
        .from('frm_core_documents')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },

    // ── Files ──────────────────────────────────────────────

    async getDocumentFiles(documentId: string): Promise<DocumentFile[]> {
      const db = getClient()
      const { data, error } = await db
        .from('frm_document_files')
        .select('*')
        .eq('document_id', documentId)
        .order('sort_order')
      if (error) throw new Error(error.message)
      return (data ?? []).map(mapFile)
    },

    async uploadFile(documentId: string, fieldKey: string, file: File): Promise<DocumentFile> {
      const db = getClient()
      const tenantId = getTenantId()
      const ext = file.name.split('.').pop() ?? 'bin'
      const storagePath = `${tenantId}/forms/${documentId}/${fieldKey}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await db.storage
        .from('documents')
        .upload(storagePath, file, { contentType: file.type })
      if (uploadError) throw new Error(uploadError.message)

      const { data: urlData } = db.storage.from('documents').getPublicUrl(storagePath)

      const { data, error } = await db
        .from('frm_document_files')
        .insert({
          tenant_id: tenantId,
          document_id: documentId,
          field_key: fieldKey,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
        })
        .select()
        .single()
      if (error) throw new Error(error.message)
      return mapFile(data)
    },

    async deleteFile(fileId: string): Promise<void> {
      const db = getClient()
      const { error } = await db
        .from('frm_document_files')
        .delete()
        .eq('id', fileId)
      if (error) throw new Error(error.message)
    },
  }
}
