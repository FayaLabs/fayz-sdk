import React, { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Button, useSaveBar } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import type { CustomFormsDataProvider } from '../data/types'
import type { CustomFormsStore } from '../store'
import type { FormTemplate, FormDocument } from '../types'
import { FormRenderer } from './FormRenderer'

function generateTitle(templateName: string, personName?: string): string {
  const date = new Date().toLocaleDateString()
  return personName
    ? `${templateName} — ${personName} — ${date}`
    : `${templateName} — ${date}`
}

interface DocumentFormDialogProps {
  template: FormTemplate | null
  existingDocument?: FormDocument
  personId: string
  personName?: string
  provider: CustomFormsDataProvider
  store: CustomFormsStore
  onSaved: () => void
  onBack: () => void
}

export function DocumentFormDialog({
  template: initialTemplate,
  existingDocument,
  personId,
  personName,
  provider,
  store,
  onSaved,
  onBack,
}: DocumentFormDialogProps) {
  const t = useTranslation()
  const [template, setTemplate] = useState<FormTemplate | null>(initialTemplate)
  const [data, setData] = useState<Record<string, unknown>>(existingDocument?.data ?? {})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (existingDocument && !template) {
      provider.getTemplateById(existingDocument.templateId).then(setTemplate)
    }
  }, [existingDocument, template, provider])

  const handleSave = useCallback(
    async (status: 'draft' | 'completed') => {
      if (!template) return
      setSaving(true)
      try {
        const autoTitle = generateTitle(template.name, personName)
        if (existingDocument) {
          await store.getState().updateDocument(existingDocument.id, { data, status })
        } else {
          await store.getState().createDocument({
            templateId: template.id,
            personId,
            title: autoTitle,
            data,
            status,
          })
        }
        onSaved()
      } finally {
        setSaving(false)
      }
    },
    [template, existingDocument, data, personId, personName, store, onSaved],
  )

  // Dirty detection — snapshot editable field values once template is ready
  const snapshot = React.useRef<string | null>(null)
  useEffect(() => {
    if (template && snapshot.current === null) snapshot.current = JSON.stringify(data)
  }, [template])
  const dirty = snapshot.current !== null && JSON.stringify(data) !== snapshot.current

  useSaveBar({
    dirty,
    saving,
    onSave: () => { void handleSave('completed') },
    onDiscard: () => onBack(),
    saveLabel: t('customForms.saveAndComplete'),
  })

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
          <h3 className="font-semibold text-sm">{template.name}</h3>
          <p className="text-xs text-muted-foreground">
            {personName && <span>{personName} &middot; </span>}
            {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Form fields */}
      <div className="rounded-xl border p-4">
        <FormRenderer
          schema={template.schema}
          data={data}
          onChange={setData}
        />
      </div>

      {/* Secondary action — primary "Save & Complete" lives in the floating SaveBar */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => handleSave('draft')} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          {t('customForms.saveAsDraft')}
        </Button>
      </div>
    </div>
  )
}
