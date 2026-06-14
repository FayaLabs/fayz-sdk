import React, { useEffect, useState, useCallback, useRef } from 'react'
import { FileText, Trash2, Eye, Upload, Image as ImageIcon, Paperclip } from 'lucide-react'
import { Badge } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import type { CustomFormsDataProvider } from '../data/types'
import type { CustomFormsStore } from '../store'
import type { FormDocument, DocumentStatus } from '../types'

interface DocumentListProps {
  personId: string
  provider: CustomFormsDataProvider
  store: CustomFormsStore
  onView: (doc: FormDocument) => void
  onFileDrop?: (files: File[]) => void
}

const STATUS_COLORS: Record<DocumentStatus, string> = {
  draft: 'bg-warning-soft text-warning-soft-foreground',
  completed: 'bg-success-soft text-success-soft-foreground',
  signed: 'bg-info-soft text-info-soft-foreground',
  archived: 'bg-muted text-muted-foreground',
}

const KIND_ICONS: Record<string, React.ElementType> = {
  form: FileText,
  image: ImageIcon,
  attachment: Paperclip,
  prescription: FileText,
  contract: FileText,
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const docDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((today.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return `${diffDays} dias atrás`
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

function groupByDate(docs: FormDocument[]): Array<{ date: string; label: string; items: FormDocument[] }> {
  const groups: Map<string, FormDocument[]> = new Map()
  for (const doc of docs) {
    const dateKey = doc.createdAt.slice(0, 10)
    if (!groups.has(dateKey)) groups.set(dateKey, [])
    groups.get(dateKey)!.push(doc)
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({
      date,
      label: formatDateLabel(date),
      items,
    }))
}

export function DocumentList({ personId, provider, store, onView, onFileDrop }: DocumentListProps) {
  const t = useTranslation()
  const [documents, setDocuments] = useState<FormDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [isDragOver, setIsDragOver] = useState(false)
  const dragCounter = useRef(0)

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await provider.getDocuments({ personId })
      setDocuments(result.data)
    } finally {
      setLoading(false)
    }
  }, [personId, provider])

  useEffect(() => {
    const timer = setTimeout(() => fetchDocs(), 50)
    return () => clearTimeout(timer)
  }, [fetchDocs])

  useEffect(() => {
    const unsub = store.subscribe(() => fetchDocs())
    return unsub
  }, [store, fetchDocs])

  const handleDelete = useCallback(async (doc: FormDocument) => {
    if (!window.confirm(t('customForms.deleteDocumentConfirm'))) return
    await provider.deleteDocument(doc.id)
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
  }, [provider, t])

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragOver(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0 && onFileDrop) {
      onFileDrop(files)
    }
  }, [onFileDrop])

  const groups = groupByDate(documents)

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-2/3 bg-muted animate-pulse rounded" />
              <div className="h-2.5 w-1/3 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={`relative min-h-[200px] rounded-xl border-2 border-dashed transition-colors ${
        isDragOver
          ? 'border-primary bg-primary/5'
          : documents.length === 0
            ? 'border-border'
            : 'border-transparent'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-primary/5">
          <Upload className="h-8 w-8 text-primary/50 mb-2" />
          <p className="text-sm font-medium text-primary/70">Solte os arquivos aqui</p>
        </div>
      )}

      {/* Empty state */}
      {documents.length === 0 && !isDragOver && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">{t('customForms.noDocuments')}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {t('customForms.noDocumentsDescription')}
          </p>
          <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
            <Upload className="h-3 w-3" />
            Arraste arquivos para cá
          </p>
        </div>
      )}

      {/* Timeline */}
      {groups.length > 0 && (
        <div className="space-y-5 py-2">
          {groups.map((group) => (
            <div key={group.date}>
              {/* Date header */}
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Documents for this date */}
              <div className="space-y-1.5">
                {group.items.map((doc) => {
                  const Icon = KIND_ICONS[doc.kind ?? 'form'] ?? FileText
                  const time = new Date(doc.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

                  return (
                    <div
                      key={doc.id}
                      className="group flex items-center gap-3 rounded-lg p-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => onView(doc)}
                    >
                      {/* Icon */}
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {doc.title ?? doc.templateName ?? 'Documento'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {doc.templateName && (
                            <span className="text-[10px] text-muted-foreground">{doc.templateName}</span>
                          )}
                          <span className="text-[10px] text-muted-foreground">{time}</span>
                        </div>
                      </div>

                      {/* Status + actions */}
                      <Badge variant="secondary" className={`text-[10px] shrink-0 ${STATUS_COLORS[doc.status] ?? ''}`}>
                        {t(`customForms.status.${doc.status}`)}
                      </Badge>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); onView(doc) }}
                          className="p-1.5 rounded-md hover:bg-muted"
                        >
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(doc) }}
                          className="p-1.5 rounded-md hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
