import { create } from 'zustand'
import type { CustomFormsDataProvider } from './data/types'
import type {
  FormTemplate,
  FormDocument,
  TemplateQuery,
  DocumentQuery,
  CreateTemplateInput,
  UpdateTemplateInput,
  CreateDocumentInput,
  UpdateDocumentInput,
} from './types'

export interface CustomFormsState {
  // Templates
  templates: FormTemplate[]
  templatesTotal: number
  templatesLoading: boolean
  templatesError: string | null

  // Documents
  documents: FormDocument[]
  documentsTotal: number
  documentsLoading: boolean
  documentsError: string | null

  // Active template (for builder)
  activeTemplate: FormTemplate | null
  activeTemplateLoading: boolean

  // Active document (for viewer/editor)
  activeDocument: FormDocument | null
  activeDocumentLoading: boolean

  // Actions
  fetchTemplates(query?: TemplateQuery): Promise<void>
  fetchTemplateById(id: string): Promise<FormTemplate | null>
  createTemplate(input: CreateTemplateInput): Promise<FormTemplate>
  updateTemplate(id: string, input: UpdateTemplateInput): Promise<FormTemplate>
  deleteTemplate(id: string): Promise<void>

  fetchDocuments(query?: DocumentQuery): Promise<void>
  fetchDocumentById(id: string): Promise<FormDocument | null>
  createDocument(input: CreateDocumentInput): Promise<FormDocument>
  updateDocument(id: string, input: UpdateDocumentInput): Promise<FormDocument>
  deleteDocument(id: string): Promise<void>
}

export function createCustomFormsStore(provider: CustomFormsDataProvider) {
  return create<CustomFormsState>((set) => ({
    templates: [],
    templatesTotal: 0,
    templatesLoading: false,
    templatesError: null,

    documents: [],
    documentsTotal: 0,
    documentsLoading: false,
    documentsError: null,

    activeTemplate: null,
    activeTemplateLoading: false,

    activeDocument: null,
    activeDocumentLoading: false,

    async fetchTemplates(query?: TemplateQuery) {
      set({ templatesLoading: true, templatesError: null })
      try {
        const result = await provider.getTemplates(query ?? {})
        set({ templates: result.data, templatesTotal: result.total })
      } catch (e: any) {
        set({ templatesError: e.message ?? 'Failed to fetch templates' })
      } finally {
        set({ templatesLoading: false })
      }
    },

    async fetchTemplateById(id: string) {
      set({ activeTemplateLoading: true })
      try {
        const template = await provider.getTemplateById(id)
        set({ activeTemplate: template })
        return template
      } catch {
        set({ activeTemplate: null })
        return null
      } finally {
        set({ activeTemplateLoading: false })
      }
    },

    async createTemplate(input: CreateTemplateInput) {
      const template = await provider.createTemplate(input)
      set((s) => ({ templates: [template, ...s.templates], templatesTotal: s.templatesTotal + 1 }))
      return template
    },

    async updateTemplate(id: string, input: UpdateTemplateInput) {
      const template = await provider.updateTemplate(id, input)
      set((s) => ({
        templates: s.templates.map((t) => (t.id === id ? template : t)),
        activeTemplate: s.activeTemplate?.id === id ? template : s.activeTemplate,
      }))
      return template
    },

    async deleteTemplate(id: string) {
      await provider.deleteTemplate(id)
      set((s) => ({
        templates: s.templates.filter((t) => t.id !== id),
        templatesTotal: s.templatesTotal - 1,
      }))
    },

    async fetchDocuments(query?: DocumentQuery) {
      set({ documentsLoading: true, documentsError: null })
      try {
        const result = await provider.getDocuments(query ?? {})
        set({ documents: result.data, documentsTotal: result.total })
      } catch (e: any) {
        set({ documentsError: e.message ?? 'Failed to fetch documents' })
      } finally {
        set({ documentsLoading: false })
      }
    },

    async fetchDocumentById(id: string) {
      set({ activeDocumentLoading: true })
      try {
        const doc = await provider.getDocumentById(id)
        set({ activeDocument: doc })
        return doc
      } catch {
        set({ activeDocument: null })
        return null
      } finally {
        set({ activeDocumentLoading: false })
      }
    },

    async createDocument(input: CreateDocumentInput) {
      const doc = await provider.createDocument(input)
      set((s) => ({ documents: [doc, ...s.documents], documentsTotal: s.documentsTotal + 1 }))
      return doc
    },

    async updateDocument(id: string, input: UpdateDocumentInput) {
      const doc = await provider.updateDocument(id, input)
      set((s) => ({
        documents: s.documents.map((d) => (d.id === id ? doc : d)),
        activeDocument: s.activeDocument?.id === id ? doc : s.activeDocument,
      }))
      return doc
    },

    async deleteDocument(id: string) {
      await provider.deleteDocument(id)
      set((s) => ({
        documents: s.documents.filter((d) => d.id !== id),
        documentsTotal: s.documentsTotal - 1,
      }))
    },
  }))
}

export type CustomFormsStore = ReturnType<typeof createCustomFormsStore>
