import React, { useState, useCallback, useRef } from 'react'
import { ArrowLeft, Image as ImageIcon, Paperclip } from 'lucide-react'
import { Badge } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import type { CustomFormsConfig } from '../config'
import type { CustomFormsDataProvider } from '../data/types'
import type { CustomFormsStore } from '../store'
import type { FormDocument, FormTemplate } from '../types'
import type { DocumentTypeOption } from '../document-types'
import { DocumentList } from './DocumentList'
import { DocumentFormDialog } from './DocumentFormDialog'
import { FormViewer } from './FormViewer'
import { AddDocumentDropdown } from './AddDocumentDropdown'

interface PersonDocumentsWidgetProps {
  item: { id: string; name?: string; [key: string]: any }
  config: CustomFormsConfig
  provider: CustomFormsDataProvider
  store: CustomFormsStore
}

type WidgetView =
  | { type: 'list' }
  | { type: 'fill'; template: FormTemplate }
  | { type: 'view'; document: FormDocument }
  | { type: 'edit'; document: FormDocument }

export function PersonDocumentsWidget({ item, config, provider, store }: PersonDocumentsWidgetProps) {
  const t = useTranslation()
  const [view, setView] = useState<WidgetView>({ type: 'list' })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFileAccept, setPendingFileAccept] = useState<string>('*/*')

  const handleDocTypeSelect = useCallback(async (option: DocumentTypeOption) => {
    // Form template
    if (option.id.startsWith('template:')) {
      const templateId = option.id.replace('template:', '')
      const template = await provider.getTemplateById(templateId)
      if (template) {
        setView({ type: 'fill', template })
      }
      return
    }

    // Image — open file picker for images
    if (option.id === 'core:image') {
      setPendingFileAccept('image/*')
      setTimeout(() => fileInputRef.current?.click(), 0)
      return
    }

    // Attachment — open file picker for any file
    if (option.id === 'core:attachment') {
      setPendingFileAccept('*/*')
      setTimeout(() => fileInputRef.current?.click(), 0)
      return
    }
  }, [provider])

  const handleFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      const isImage = file.type.startsWith('image/')
      await store.getState().createDocument({
        kind: isImage ? 'image' : 'attachment',
        personId: item.id,
        title: file.name,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: 'completed',
      })
    }
  }, [store, item.id])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) handleFiles(files)
    e.target.value = ''
  }, [handleFiles])

  const handleViewDoc = useCallback((doc: FormDocument) => {
    setView({ type: 'view', document: doc })
  }, [])

  const handleEditDoc = useCallback((doc: FormDocument) => {
    setView({ type: 'edit', document: doc })
  }, [])

  const handleBack = useCallback(() => {
    setView({ type: 'list' })
  }, [])

  const handleSaved = useCallback(() => {
    setView({ type: 'list' })
  }, [])

  // Fill form
  if (view.type === 'fill') {
    return (
      <DocumentFormDialog
        template={view.template}
        personId={item.id}
        personName={item.name}
        provider={provider}
        store={store}
        onSaved={handleSaved}
        onBack={handleBack}
      />
    )
  }

  // View document — route by kind
  if (view.type === 'view') {
    const doc = view.document
    const isForm = doc.kind === 'form' || (!doc.kind && doc.templateId)

    if (!isForm) {
      // File document (image/attachment) — simple preview
      return (
        <FileDocumentViewer document={doc} onBack={handleBack} />
      )
    }

    return (
      <FormViewer
        document={doc}
        provider={provider}
        onBack={handleBack}
        onEdit={handleEditDoc}
      />
    )
  }

  // Edit document — only for form docs
  if (view.type === 'edit') {
    return (
      <DocumentFormDialog
        template={null}
        existingDocument={view.document}
        personId={item.id}
        personName={item.name}
        provider={provider}
        store={store}
        onSaved={handleSaved}
        onBack={handleBack}
      />
    )
  }

  // Default: list with dropdown + drag zone
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t('customForms.documents')}</h3>
        <AddDocumentDropdown personId={item.id} onSelect={handleDocTypeSelect} />
      </div>
      <DocumentList
        personId={item.id}
        provider={provider}
        store={store}
        onView={handleViewDoc}
        onFileDrop={handleFiles}
      />
      {/* Hidden file input for image/attachment upload */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={pendingFileAccept}
        multiple
        onChange={handleFileInputChange}
      />
    </div>
  )
}

function FileDocumentViewer({ document: doc, onBack }: { document: FormDocument; onBack: () => void }) {
  const isImage = doc.kind === 'image' || doc.mimeType?.startsWith('image/')
  const Icon = isImage ? ImageIcon : Paperclip

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{doc.title ?? doc.fileName ?? 'Document'}</h3>
          <p className="text-xs text-muted-foreground">
            {new Date(doc.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px] bg-success/15 text-success">
          {doc.status === 'completed' ? 'Finalizado' : doc.status}
        </Badge>
      </div>

      <div className="rounded-xl border p-6 flex flex-col items-center gap-4">
        {isImage && doc.fileUrl ? (
          <img src={doc.fileUrl} alt={doc.fileName ?? ''} className="max-w-full max-h-[500px] rounded-lg object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Icon className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">{doc.fileName ?? doc.title ?? 'Arquivo'}</p>
            {doc.fileSize && (
              <p className="text-xs text-muted-foreground">
                {(doc.fileSize / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
