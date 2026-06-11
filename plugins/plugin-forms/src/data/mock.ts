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

function uuid() {
  return crypto.randomUUID()
}

function now() {
  return new Date().toISOString()
}

export function createMockFormsProvider(): CustomFormsDataProvider {
  const templates: FormTemplate[] = []
  const documents: FormDocument[] = []
  const files: DocumentFile[] = []

  return {
    // ── Templates ──────────────────────────────────────────
    async getTemplates(query: TemplateQuery): Promise<PaginatedResult<FormTemplate>> {
      let filtered = templates.filter((t) => !t.isDeleted && t.isCurrent)
      if (query.category) {
        filtered = filtered.filter((t) => t.category === query.category)
      }
      if (query.search) {
        const s = query.search.toLowerCase()
        filtered = filtered.filter((t) => t.name.toLowerCase().includes(s))
      }
      const page = query.page ?? 1
      const pageSize = query.pageSize ?? 25
      const start = (page - 1) * pageSize
      return { data: filtered.slice(start, start + pageSize), total: filtered.length }
    },

    async getTemplateById(id: string): Promise<FormTemplate | null> {
      return templates.find((t) => t.id === id && !t.isDeleted) ?? null
    },

    async createTemplate(input: CreateTemplateInput): Promise<FormTemplate> {
      const template: FormTemplate = {
        id: uuid(),
        tenantId: 'mock-tenant',
        name: input.name,
        description: input.description,
        category: input.category,
        version: 1,
        isCurrent: true,
        schema: input.schema,
        specialty: input.specialty,
        tags: input.tags ?? [],
        metadata: input.metadata ?? {},
        isActive: true,
        isDeleted: false,
        createdAt: now(),
        updatedAt: now(),
      }
      templates.push(template)
      return template
    },

    async updateTemplate(id: string, input: UpdateTemplateInput): Promise<FormTemplate> {
      const idx = templates.findIndex((t) => t.id === id)
      if (idx === -1) throw new Error('Template not found')
      const existing = templates[idx]
      const updated: FormTemplate = {
        ...existing,
        ...input,
        tags: input.tags ?? existing.tags,
        metadata: input.metadata ?? existing.metadata,
        schema: input.schema ?? existing.schema,
        updatedAt: now(),
      }
      templates[idx] = updated
      return updated
    },

    async deleteTemplate(id: string): Promise<void> {
      const idx = templates.findIndex((t) => t.id === id)
      if (idx !== -1) templates[idx] = { ...templates[idx], isDeleted: true }
    },

    // ── Documents ──────────────────────────────────────────
    async getDocuments(query: DocumentQuery): Promise<PaginatedResult<FormDocument>> {
      let filtered = documents.filter((d) => !d.isDeleted)
      if (query.personId) {
        filtered = filtered.filter((d) => d.personId === query.personId)
      }
      if (query.templateId) {
        filtered = filtered.filter((d) => d.templateId === query.templateId)
      }
      if (query.status) {
        const statuses = Array.isArray(query.status) ? query.status : [query.status]
        filtered = filtered.filter((d) => statuses.includes(d.status))
      }
      if (query.search) {
        const s = query.search.toLowerCase()
        filtered = filtered.filter(
          (d) =>
            d.title?.toLowerCase().includes(s) ||
            d.templateName?.toLowerCase().includes(s),
        )
      }
      filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      const page = query.page ?? 1
      const pageSize = query.pageSize ?? 25
      const start = (page - 1) * pageSize
      return { data: filtered.slice(start, start + pageSize), total: filtered.length }
    },

    async getDocumentById(id: string): Promise<FormDocument | null> {
      return documents.find((d) => d.id === id && !d.isDeleted) ?? null
    },

    async createDocument(input: CreateDocumentInput): Promise<FormDocument> {
      const template = templates.find((t) => t.id === input.templateId)
      const doc: FormDocument = {
        id: uuid(),
        tenantId: 'mock-tenant',
        templateId: input.templateId ?? '',
        templateName: template?.name,
        templateCategory: template?.category,
        personId: input.personId,
        title: input.title,
        data: input.data ?? {},
        kind: input.kind ?? (input.templateId ? 'form' : 'attachment'),
        status: input.status ?? 'draft',
        metadata: {},
        isDeleted: false,
        createdAt: now(),
        updatedAt: now(),
      }
      documents.push(doc)
      return doc
    },

    async updateDocument(id: string, input: UpdateDocumentInput): Promise<FormDocument> {
      const idx = documents.findIndex((d) => d.id === id)
      if (idx === -1) throw new Error('Document not found')
      const existing = documents[idx]
      const updated: FormDocument = {
        ...existing,
        ...input,
        data: input.data ?? existing.data,
        updatedAt: now(),
      }
      documents[idx] = updated
      return updated
    },

    async deleteDocument(id: string): Promise<void> {
      const idx = documents.findIndex((d) => d.id === id)
      if (idx !== -1) documents[idx] = { ...documents[idx], isDeleted: true }
    },

    // ── Files ──────────────────────────────────────────────
    async getDocumentFiles(documentId: string): Promise<DocumentFile[]> {
      return files.filter((f) => f.documentId === documentId)
    },

    async uploadFile(documentId: string, fieldKey: string, file: File): Promise<DocumentFile> {
      const docFile: DocumentFile = {
        id: uuid(),
        tenantId: 'mock-tenant',
        documentId,
        fieldKey,
        fileUrl: URL.createObjectURL(file),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        sortOrder: files.filter((f) => f.documentId === documentId && f.fieldKey === fieldKey).length,
        metadata: {},
        createdAt: now(),
      }
      files.push(docFile)
      return docFile
    },

    async deleteFile(fileId: string): Promise<void> {
      const idx = files.findIndex((f) => f.id === fileId)
      if (idx !== -1) files.splice(idx, 1)
    },
  }
}
