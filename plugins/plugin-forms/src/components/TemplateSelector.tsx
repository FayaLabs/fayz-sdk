import React, { useEffect, useState } from 'react'
import { FileText, Search } from 'lucide-react'
import { Input } from '@fayz/ui'
import { Badge } from '@fayz/ui'
import { useTranslation } from '@fayz/core'
import type { CustomFormsDataProvider } from '../data/types'
import type { FormTemplate } from '../types'

interface TemplateSelectorProps {
  provider: CustomFormsDataProvider
  onSelect: (template: FormTemplate) => void
  onClose: () => void
}

export function TemplateSelector({ provider, onSelect, onClose }: TemplateSelectorProps) {
  const t = useTranslation()
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    provider
      .getTemplates({ search: search || undefined })
      .then((result) => setTemplates(result.data))
      .finally(() => setLoading(false))
  }, [provider, search])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card rounded-xl border shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm mb-3">{t('customForms.selectTemplate')}</h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search')}
              className="h-9 pl-8 text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 border-2 border-primary border-t-transparent animate-spin rounded-full" />
            </div>
          )}

          {!loading && templates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">{t('customForms.noTemplates')}</p>
            </div>
          )}

          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => onSelect(tpl)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tpl.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-[10px]">
                    {t(`customForms.category.${tpl.category}`)}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {tpl.schema.fields.length} {t('customForms.builder.fields').toLowerCase()}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
