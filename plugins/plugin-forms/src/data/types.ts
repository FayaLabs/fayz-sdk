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

export interface CustomFormsDataProvider {
  // Templates
  getTemplates(query: TemplateQuery): Promise<PaginatedResult<FormTemplate>>
  getTemplateById(id: string): Promise<FormTemplate | null>
  createTemplate(input: CreateTemplateInput): Promise<FormTemplate>
  updateTemplate(id: string, input: UpdateTemplateInput): Promise<FormTemplate>
  deleteTemplate(id: string): Promise<void>

  // Documents
  getDocuments(query: DocumentQuery): Promise<PaginatedResult<FormDocument>>
  getDocumentById(id: string): Promise<FormDocument | null>
  createDocument(input: CreateDocumentInput): Promise<FormDocument>
  updateDocument(id: string, input: UpdateDocumentInput): Promise<FormDocument>
  deleteDocument(id: string): Promise<void>

  // Files
  getDocumentFiles(documentId: string): Promise<DocumentFile[]>
  uploadFile(documentId: string, fieldKey: string, file: File): Promise<DocumentFile>
  deleteFile(fileId: string): Promise<void>
}
