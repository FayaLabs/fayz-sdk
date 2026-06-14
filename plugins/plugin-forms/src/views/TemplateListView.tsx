import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, FileText, Search } from 'lucide-react'
import { Button } from '@fayz-ai/ui'
import { Card, CardContent } from '@fayz-ai/ui'
import { Badge } from '@fayz-ai/ui'
import { Input } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { getFormsTenantId } from '../lib/tenant'
import type { CustomFormsStore } from '../store'
import type { CustomFormsConfig } from '../config'
import type { FormTemplate, TemplateCategory } from '../types'

interface TemplateListViewProps {
  store: CustomFormsStore
  config: CustomFormsConfig
  onEdit: (template: FormTemplate) => void
  onNew: () => void
}

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  anamnesis: 'bg-info-soft text-info-soft-foreground',
  evolution: 'bg-success-soft text-success-soft-foreground',
  report: 'bg-magic-soft text-magic-soft-foreground',
  contract: 'bg-warning-soft text-warning-soft-foreground',
  general: 'bg-muted text-muted-foreground',
}

export function TemplateListView({ store, config, onEdit, onNew }: TemplateListViewProps) {
  const t = useTranslation()
  const [search, setSearch] = useState('')

  // Subscribe to zustand store reactively
  const templates = store((s) => s.templates)
  const loading = store((s) => s.templatesLoading)

  const orgId = getFormsTenantId()

  // Fetch when org is ready or search changes — debounce to avoid Strict Mode double-fire
  useEffect(() => {
    if (!orgId) return
    const timer = setTimeout(() => {
      store.getState().fetchTemplates({ search: search || undefined })
    }, 50)
    return () => clearTimeout(timer)
  }, [orgId, search])

  const handleDelete = useCallback(async (template: FormTemplate) => {
    if (!window.confirm(t('customForms.deleteTemplateConfirm'))) return
    await store.getState().deleteTemplate(template.id)
  }, [store, t])

  const categoryLabel = (cat: TemplateCategory) =>
    t(`customForms.category.${cat}`)

  return (
    <div className="space-y-4">
      {/* Search + New */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search')}
            className="h-9 pl-8 text-sm"
          />
        </div>
        <Button onClick={onNew} size="sm" className="h-9">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          {t('customForms.newTemplate')}
        </Button>
      </div>

      {/* Empty state */}
      {!loading && templates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="font-medium">{t('customForms.noTemplates')}</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {t('customForms.noTemplatesDescription')}
            </p>
            <Button onClick={onNew} size="sm" className="mt-4">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {t('customForms.newTemplate')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Template list */}
      {templates.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="group cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onEdit(template)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm truncate">{template.name}</h3>
                    {template.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(template) }}
                      className="p-1.5 rounded-md hover:bg-muted"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(template) }}
                      className="p-1.5 rounded-md hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="secondary" className={`text-[10px] ${CATEGORY_COLORS[template.category]}`}>
                    {categoryLabel(template.category)}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {template.schema.fields.length} {t('customForms.builder.fields').toLowerCase()}
                  </span>
                  {template.version > 1 && (
                    <span className="text-[10px] text-muted-foreground">v{template.version}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                <div className="h-3 w-full bg-muted animate-pulse rounded" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
                  <div className="h-5 w-12 bg-muted animate-pulse rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
