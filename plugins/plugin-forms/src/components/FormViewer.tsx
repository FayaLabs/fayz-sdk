import React, { useEffect, useState } from 'react'
import { ArrowLeft, Pencil, Badge as BadgeIcon } from 'lucide-react'
import { Button } from '@fayz/ui'
import { Badge } from '@fayz/ui'
import { useTranslation } from '@fayz/core'
import type { CustomFormsDataProvider } from '../data/types'
import type { FormDocument, FormTemplate } from '../types'
import { FormRenderer } from './FormRenderer'

interface FormViewerProps {
  document: FormDocument
  provider: CustomFormsDataProvider
  onBack: () => void
  onEdit?: (doc: FormDocument) => void
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-warning-soft text-warning-soft-foreground',
  completed: 'bg-success-soft text-success-soft-foreground',
  signed: 'bg-info-soft text-info-soft-foreground',
  archived: 'bg-muted text-muted-foreground',
}

export function FormViewer({ document: doc, provider, onBack, onEdit }: FormViewerProps) {
  const t = useTranslation()
  const [template, setTemplate] = useState<FormTemplate | null>(null)

  useEffect(() => {
    if (!doc.templateId) return
    const timer = setTimeout(() => {
      provider.getTemplateById(doc.templateId).then(setTemplate)
    }, 50)
    return () => clearTimeout(timer)
  }, [doc.templateId, provider])

  if (!template) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent animate-spin rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">
            {doc.title ?? template.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {new Date(doc.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Badge variant="secondary" className={`text-[10px] ${STATUS_COLORS[doc.status] ?? ''}`}>
          {t(`customForms.status.${doc.status}`)}
        </Badge>
        {onEdit && doc.status === 'draft' && (
          <Button variant="outline" size="sm" className="h-8" onClick={() => onEdit(doc)}>
            <Pencil className="h-3 w-3 mr-1" />
            {t('common.edit')}
          </Button>
        )}
      </div>

      {/* Form content (read-only) */}
      <div className="rounded-xl border p-4">
        <FormRenderer
          schema={template.schema}
          data={doc.data}
          onChange={() => {}}
          readOnly
        />
      </div>
    </div>
  )
}
