import React, { useState, useRef, useMemo, useCallback } from 'react'
import {
  Download, Upload, ArrowRight, ArrowLeft, Check, AlertCircle,
  Loader2, FileSpreadsheet, X, ChevronDown,
} from 'lucide-react'
import {
  Modal, ModalContent, ModalHeader, ModalBody,
  ModalTitle,
} from '@fayz-ai/ui'
import { Button } from '@fayz-ai/ui'
import { cn } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import type { FieldDef, EntityDef } from '@fayz-ai/core'

type ImportStep = 'download' | 'upload' | 'mapping' | 'importing' | 'done'

interface ImportWizardProps {
  open: boolean
  onClose: () => void
  entityDef: EntityDef
  onImport: (
    rows: Record<string, any>[],
    onProgress: (processed: number, total: number) => void,
  ) => Promise<{ success: number; errors: ImportRowError[] }>
}

export interface ImportRowError {
  row: number
  message: string
}

interface ParsedCSV {
  headers: string[]
  rows: string[][]
}

// ---------------------------------------------------------------------------
// CSV utilities
// ---------------------------------------------------------------------------

function getImportableFields(entityDef: EntityDef): FieldDef[] {
  return entityDef.fields.filter(
    (f) => f.showInForm !== false && f.key !== 'id' && f.type !== 'image',
  )
}

function generateSampleCSV(fields: FieldDef[]): string {
  const headers = fields.map((f) => f.label)
  const sampleRow = fields.map((f) => {
    switch (f.type) {
      case 'email': return 'example@email.com'
      case 'phone': return '+5511999999999'
      case 'number': return '0'
      case 'currency': return '0.00'
      case 'date': return '2025-01-01'
      case 'datetime': return '2025-01-01T09:00'
      case 'time': return '09:00'
      case 'boolean': return 'true'
      case 'select': {
        const opts = f.options ?? []
        const first = typeof opts[0] === 'string' ? opts[0] : opts[0]?.value
        return first ?? ''
      }
      default: return ''
    }
  })
  return [headers.join(','), sampleRow.join(',')].join('\n')
}

function downloadCSV(content: string, filename: string) {
  const bom = '\uFEFF'
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function parseCSV(text: string): ParsedCSV {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }

  const parse = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parse(lines[0])
  const rows = lines.slice(1).map(parse)
  return { headers, rows }
}

function coerceValue(value: string, field: FieldDef): any {
  const trimmed = value.trim()
  if (trimmed === '') return null
  switch (field.type) {
    case 'number':
    case 'currency': {
      const num = Number(trimmed.replace(',', '.'))
      return isNaN(num) ? null : num
    }
    case 'boolean':
      return ['true', '1', 'yes', 'sim', 'verdadeiro'].includes(trimmed.toLowerCase())
    default:
      return trimmed
  }
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEPS: ImportStep[] = ['download', 'upload', 'mapping', 'importing']

function StepIndicator({ current }: { current: ImportStep }) {
  const t = useTranslation()
  const labels: Record<ImportStep, string> = {
    download: t('crud.import.step.download'),
    upload: t('crud.import.step.upload'),
    mapping: t('crud.import.step.mapping'),
    importing: t('crud.import.step.importing'),
    done: '',
  }
  const currentIdx = STEPS.indexOf(current === 'done' ? 'importing' : current)

  return (
    <div className="flex items-center gap-1.5">
      {STEPS.map((step, i) => {
        const isDone = i < currentIdx || current === 'done'
        const isActive = step === current
        return (
          <React.Fragment key={step}>
            {i > 0 && <div className={cn('h-px w-6', isDone ? 'bg-primary' : 'bg-border')} />}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  isDone
                    ? 'bg-primary text-primary-foreground'
                    : isActive
                      ? 'border-2 border-primary text-primary'
                      : 'border-2 border-muted-foreground/30 text-muted-foreground',
                )}
              >
                {isDone ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className={cn('text-xs hidden sm:inline', isActive ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                {labels[step]}
              </span>
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1: Download sample
// ---------------------------------------------------------------------------

function DownloadStep({
  entityDef,
  fields,
  onNext,
}: {
  entityDef: EntityDef
  fields: FieldDef[]
  onNext: () => void
}) {
  const t = useTranslation()
  const namePlural = entityDef.namePlural ?? entityDef.name + 's'

  const handleDownload = () => {
    const csv = generateSampleCSV(fields)
    downloadCSV(csv, `${namePlural.toLowerCase().replace(/\s+/g, '-')}-template.csv`)
  }

  return (
    <div className="flex flex-col items-center text-center gap-6 py-4">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <FileSpreadsheet className="h-8 w-8 text-primary" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h3 className="text-base font-semibold">{t('crud.import.downloadTitle')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('crud.import.downloadDescription', { entity: namePlural.toLowerCase() })}
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button variant="outline" onClick={handleDownload} className="w-full">
          <Download className="h-4 w-4 mr-2" />
          {t('crud.import.downloadTemplate')}
        </Button>
        <p className="text-xs text-muted-foreground">
          {t('crud.import.downloadHint', { count: String(fields.length) })}
        </p>
      </div>
      <Button onClick={onNext} className="mt-2">
        {t('crud.import.alreadyHaveFile')}
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2: Upload file
// ---------------------------------------------------------------------------

function UploadStep({
  onParsed,
  onBack,
}: {
  onParsed: (csv: ParsedCSV, fileName: string) => void
  onBack: () => void
}) {
  const t = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processFile = (file: File) => {
    setError(null)
    if (!file.name.endsWith('.csv')) {
      setError(t('crud.import.invalidFile'))
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.headers.length === 0) {
        setError(t('crud.import.emptyFile'))
        return
      }
      if (parsed.rows.length === 0) {
        setError(t('crud.import.noRows'))
        return
      }
      onParsed(parsed, file.name)
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-3 w-full max-w-sm rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        )}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">{t('crud.import.uploadTitle')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('crud.import.uploadHint')}</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) processFile(file)
          }}
        />
      </div>
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('common.back')}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3: Column mapping
// ---------------------------------------------------------------------------

function MappingStep({
  csv,
  fileName,
  fields,
  onConfirm,
  onBack,
}: {
  csv: ParsedCSV
  fileName: string
  fields: FieldDef[]
  onConfirm: (mapping: Map<number, FieldDef>) => void
  onBack: () => void
}) {
  const t = useTranslation()

  // Auto-map by label match (case-insensitive)
  const initialMapping = useMemo(() => {
    const map = new Map<number, FieldDef | null>()
    for (let i = 0; i < csv.headers.length; i++) {
      const header = csv.headers[i].toLowerCase().trim()
      const match = fields.find(
        (f) => f.label.toLowerCase() === header || f.key.toLowerCase() === header,
      )
      map.set(i, match ?? null)
    }
    return map
  }, [csv.headers, fields])

  const [mapping, setMapping] = useState(initialMapping)

  const mappedCount = Array.from(mapping.values()).filter(Boolean).length
  const previewRows = csv.rows.slice(0, 3)

  const handleSelect = (colIdx: number, fieldKey: string) => {
    setMapping((prev) => {
      const next = new Map(prev)
      if (fieldKey === '__ignore__') {
        next.set(colIdx, null)
      } else {
        const field = fields.find((f) => f.key === fieldKey) ?? null
        // Remove this field from any other column
        for (const [idx, f] of next) {
          if (f?.key === fieldKey) next.set(idx, null)
        }
        next.set(colIdx, field)
      }
      return next
    })
  }

  const handleConfirm = () => {
    const validMapping = new Map<number, FieldDef>()
    for (const [idx, field] of mapping) {
      if (field) validMapping.set(idx, field)
    }
    onConfirm(validMapping)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{t('crud.import.mappingTitle')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('crud.import.mappingDescription', {
              file: fileName,
              columns: String(csv.headers.length),
              rows: String(csv.rows.length),
            })}
          </p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {t('crud.import.mappedCount', { count: String(mappedCount), total: String(csv.headers.length) })}
        </span>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left font-medium text-muted-foreground py-2.5 px-3 w-[35%]">
                {t('crud.import.csvColumn')}
              </th>
              <th className="text-center w-[10%] px-2">
                <ArrowRight className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
              </th>
              <th className="text-left font-medium text-muted-foreground py-2.5 px-3 w-[35%]">
                {t('crud.import.mapsTo')}
              </th>
              <th className="text-left font-medium text-muted-foreground py-2.5 px-3 w-[20%]">
                {t('crud.import.preview')}
              </th>
            </tr>
          </thead>
          <tbody>
            {csv.headers.map((header, idx) => {
              const mapped = mapping.get(idx)
              return (
                <tr key={idx} className="border-b last:border-0">
                  <td className="py-2 px-3">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{header}</span>
                  </td>
                  <td className="text-center px-2">
                    <ArrowRight className="h-3 w-3 mx-auto text-muted-foreground/50" />
                  </td>
                  <td className="py-2 px-3">
                    <div className="relative">
                      <select
                        value={mapped?.key ?? '__ignore__'}
                        onChange={(e) => handleSelect(idx, e.target.value)}
                        className={cn(
                          'w-full appearance-none rounded-md border bg-background px-2.5 py-1.5 pr-8 text-sm',
                          'focus:outline-none focus:ring-2 focus:ring-ring',
                          mapped ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        <option value="__ignore__">{t('crud.import.skip')}</option>
                        {fields.map((f) => (
                          <option key={f.key} value={f.key}>{f.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-xs text-muted-foreground truncate block max-w-[140px]">
                      {previewRows[0]?.[idx] ?? '—'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
        <Button onClick={handleConfirm} disabled={mappedCount === 0}>
          {t('crud.import.startImport')}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4: Importing + Done
// ---------------------------------------------------------------------------

function ImportingStep({
  result,
  progress,
  totalRows,
  onClose,
}: {
  result: { success: number; errors: ImportRowError[] } | null
  progress: { processed: number; total: number } | null
  totalRows: number
  onClose: () => void
}) {
  const t = useTranslation()

  if (!result) {
    const processed = progress?.processed ?? 0
    const total = progress?.total ?? totalRows
    const percent = total > 0 ? Math.round((processed / total) * 100) : 0

    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="relative h-16 w-16 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm font-medium">{t('crud.import.importing')}</p>
          <p className="text-xs text-muted-foreground">
            {t('crud.import.progressCount', { processed: String(processed), total: String(total) })}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs space-y-2">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center tabular-nums">
            {percent}%
          </p>
        </div>
      </div>
    )
  }

  const hasErrors = result.errors.length > 0

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className={cn(
        'h-16 w-16 rounded-2xl flex items-center justify-center',
        hasErrors ? 'bg-warning/10' : 'bg-success/10',
      )}>
        {hasErrors ? (
          <AlertCircle className="h-8 w-8 text-warning" />
        ) : (
          <Check className="h-8 w-8 text-success" />
        )}
      </div>

      <div className="text-center space-y-1">
        <h3 className="text-base font-semibold">
          {hasErrors ? t('crud.import.doneWithErrors') : t('crud.import.doneSuccess')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('crud.import.doneCount', {
            success: String(result.success),
            total: String(totalRows),
          })}
        </p>
      </div>

      {/* Completed progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              hasErrors ? 'bg-warning' : 'bg-success',
            )}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {hasErrors && (
        <div className="w-full max-w-sm max-h-40 overflow-y-auto rounded-lg border">
          <div className="divide-y">
            {result.errors.slice(0, 20).map((err, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 text-xs">
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {t('crud.import.rowNumber', { row: String(err.row) })}
                </span>
                <span className="text-destructive">{err.message}</span>
              </div>
            ))}
            {result.errors.length > 20 && (
              <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                +{result.errors.length - 20} more
              </div>
            )}
          </div>
        </div>
      )}

      <Button onClick={onClose}>{t('common.done')}</Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------

export function ImportWizard({ open, onClose, entityDef, onImport }: ImportWizardProps) {
  const t = useTranslation()
  const [step, setStep] = useState<ImportStep>('download')
  const [csv, setCsv] = useState<ParsedCSV | null>(null)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<{ success: number; errors: ImportRowError[] } | null>(null)
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null)

  const fields = useMemo(() => getImportableFields(entityDef), [entityDef])

  const handleClose = () => {
    setStep('download')
    setCsv(null)
    setFileName('')
    setResult(null)
    setProgress(null)
    onClose()
  }

  const handleParsed = (parsed: ParsedCSV, name: string) => {
    setCsv(parsed)
    setFileName(name)
    setStep('mapping')
  }

  const handleConfirmMapping = useCallback(async (mapping: Map<number, FieldDef>) => {
    if (!csv) return
    setStep('importing')
    setResult(null)
    setProgress(null)

    // Transform CSV rows → record objects using mapping
    const rows: Record<string, any>[] = csv.rows.map((row) => {
      const record: Record<string, any> = {}
      for (const [colIdx, field] of mapping) {
        const rawValue = row[colIdx] ?? ''
        record[field.key] = coerceValue(rawValue, field)
      }
      return record
    })

    try {
      const res = await onImport(rows, (processed, total) => {
        setProgress({ processed, total })
      })
      setResult(res)
      setStep('done')
    } catch (err: any) {
      setResult({ success: 0, errors: [{ row: 0, message: err?.message ?? 'Import failed' }] })
      setStep('done')
    }
  }, [csv, onImport])

  const namePlural = entityDef.namePlural ?? entityDef.name + 's'

  return (
    <Modal open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <ModalContent size="xl">
        <ModalHeader>
          <ModalTitle>{t('crud.import.title', { entity: namePlural })}</ModalTitle>
          <div className="pt-2">
            <StepIndicator current={step} />
          </div>
        </ModalHeader>

        <ModalBody>
          {step === 'download' && (
            <DownloadStep
              entityDef={entityDef}
              fields={fields}
              onNext={() => setStep('upload')}
            />
          )}
          {step === 'upload' && (
            <UploadStep
              onParsed={handleParsed}
              onBack={() => setStep('download')}
            />
          )}
          {step === 'mapping' && csv && (
            <MappingStep
              csv={csv}
              fileName={fileName}
              fields={fields}
              onConfirm={handleConfirmMapping}
              onBack={() => setStep('upload')}
            />
          )}
          {(step === 'importing' || step === 'done') && (
            <ImportingStep
              result={result}
              progress={progress}
              totalRows={csv?.rows.length ?? 0}
              onClose={handleClose}
            />
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
