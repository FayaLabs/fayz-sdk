import React, { useState, useCallback } from 'react'
import { TemplateListView } from './TemplateListView'
import { useTranslation } from '@fayz-ai/core'
import type { PluginRegistryDef } from '@fayz-ai/core'
import type { CustomFormsConfig } from '../config'
import type { CustomFormsDataProvider } from '../data/types'
import type { CustomFormsStore } from '../store'
import type { FormTemplate } from '../types'

interface CustomFormsSettingsTabProps {
  config: CustomFormsConfig
  provider: CustomFormsDataProvider
  store: CustomFormsStore
  registries?: PluginRegistryDef[]
}

export function CustomFormsSettingsTab({ config, provider, store, registries }: CustomFormsSettingsTabProps) {
  const t = useTranslation()
  const [builderTemplateId, setBuilderTemplateId] = useState<string | null>(null)

  const handleNew = useCallback(() => {
    setBuilderTemplateId('__new__')
  }, [])

  const handleEdit = useCallback((template: FormTemplate) => {
    setBuilderTemplateId(template.id)
  }, [])

  const handleBackFromBuilder = useCallback(() => {
    setBuilderTemplateId(null)
    // Re-fetch templates to reflect any saves
    store.getState().fetchTemplates()
  }, [store])

  // Sync from hash on mount
  React.useEffect(() => {
    function checkHash() {
      const hash = window.location.hash.slice(1) || '/'
      const builderMatch = hash.match(/\/settings\/custom_forms\/templates\/(.+)/)
      if (builderMatch && builderMatch[1] !== 'new') {
        setBuilderTemplateId(builderMatch[1])
      } else if (builderMatch && builderMatch[1] === 'new') {
        setBuilderTemplateId('__new__')
      }
    }
    checkHash()
  }, [])

  // Templates tab content — either list or builder
  const templatesContent = builderTemplateId ? (
    <BuilderWrapper
      templateId={builderTemplateId === '__new__' ? undefined : builderTemplateId}
      store={store}
      provider={provider}
      config={config}
      onBack={handleBackFromBuilder}
    />
  ) : (
    <TemplateListView
      store={store}
      config={config}
      onEdit={handleEdit}
      onNew={handleNew}
    />
  )

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>{t('customForms.settingsTitle')}</h1>
        <p style={{ color: 'var(--muted-foreground, #6b7280)', margin: '4px 0 0', fontSize: '14px' }}>
          {t('customForms.settingsSubtitle')}
        </p>
      </div>
      {templatesContent}
    </div>
  )
}

/** Lazy-loads the FormBuilder to avoid pulling @dnd-kit into the initial bundle */
function BuilderWrapper({
  templateId,
  store,
  provider,
  config,
  onBack,
}: {
  templateId?: string
  store: CustomFormsStore
  provider: CustomFormsDataProvider
  config: CustomFormsConfig
  onBack: () => void
}) {
  const FormBuilderLazy = React.lazy(() =>
    import('../components/FormBuilder').then((m) => ({ default: m.FormBuilder })),
  )

  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent animate-spin rounded-full" />
        </div>
      }
    >
      <FormBuilderLazy
        templateId={templateId}
        store={store}
        provider={provider}
        config={config}
        onBack={onBack}
      />
    </React.Suspense>
  )
}
