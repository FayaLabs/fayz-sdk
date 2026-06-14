import * as React from 'react'
import { Upload, Save, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from '@fayz-ai/ui'
import { Input } from '@fayz-ai/ui'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@fayz-ai/ui'
import { useTranslation } from '../../hooks/useTranslation'
import type { TenantSettings } from '../../types'

interface BrandingSettingsProps {
  branding?: TenantSettings['branding'] | null
  onSave?: (branding: TenantSettings['branding'], assets?: {
    logoFile?: File | null
    faviconFile?: File | null
  }) => void
}

interface FileUploadProps {
  label: string
  accept: string
  currentUrl?: string
  onFileSelect: (file: File) => void
  onClear?: () => void
  hint?: string
}

function FileUploadField({
  label,
  accept,
  currentUrl,
  onFileSelect,
  onClear,
  hint,
}: FileUploadProps) {
  const { t } = useTranslation()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [preview, setPreview] = React.useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
      const url = URL.createObjectURL(file)
      setPreview(url)
    }
    if (e.target) {
      e.target.value = ''
    }
  }

  const displayUrl = preview ?? currentUrl

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-center gap-4">
        {displayUrl ? (
          <div className="relative">
            <img
              src={displayUrl}
              alt={label}
              className="h-16 w-16 rounded-md border object-contain p-1"
            />
            {onClear && (
              <button
                type="button"
                onClick={() => {
                  onClear()
                  setPreview(null)
                }}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                aria-label={`Remove ${label.toLowerCase()}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed">
            <Upload className="h-5 w-5 text-muted-foreground/50" />
          </div>
        )}

        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            {t('settings.branding.chooseFile')}
          </Button>
          {hint && (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}

export function BrandingSettings({ branding, onSave }: BrandingSettingsProps) {
  const { t } = useTranslation()
  const [primaryColor, setPrimaryColor] = React.useState(branding?.primaryColor ?? '#000000')
  const [accentColor, setAccentColor] = React.useState(branding?.accentColor ?? '#6366f1')
  const [logoFile, setLogoFile] = React.useState<File | null>(null)
  const [faviconFile, setFaviconFile] = React.useState<File | null>(null)
  const [logoUrl, setLogoUrl] = React.useState(branding?.logoUrl ?? '')
  const [faviconUrl, setFaviconUrl] = React.useState(branding?.faviconUrl ?? '')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (branding) {
      setPrimaryColor(branding.primaryColor ?? '#000000')
      setAccentColor(branding.accentColor ?? '#6366f1')
      setLogoUrl(branding.logoUrl ?? '')
      setFaviconUrl(branding.faviconUrl ?? '')
    }
  }, [branding])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onSave) return

    setSaving(true)
    try {
      await onSave({
        primaryColor,
        accentColor,
        logoUrl,
        faviconUrl,
      }, {
        logoFile,
        faviconFile,
      })
      setLogoFile(null)
      setFaviconFile(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.branding.title')}</CardTitle>
          <CardDescription>
            {t('settings.branding.subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="primary-color" className="text-sm font-medium">
                {t('settings.branding.primaryColor')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="primary-color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-md border bg-transparent p-0.5"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                  maxLength={7}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="accent-color" className="text-sm font-medium">
                {t('settings.branding.accentColor')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="accent-color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-md border bg-transparent p-0.5"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#6366f1"
                  className="flex-1"
                  maxLength={7}
                />
              </div>
            </div>
          </div>

          <div className="rounded-md border p-4">
            <p className="mb-3 text-sm font-medium">{t('settings.branding.preview')}</p>
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-24 rounded-md"
                style={{ backgroundColor: primaryColor }}
              />
              <div
                className="h-10 w-24 rounded-md"
                style={{ backgroundColor: accentColor }}
              />
            </div>
          </div>

          <FileUploadField
            label="Logo"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            currentUrl={logoUrl || undefined}
            onFileSelect={setLogoFile}
            onClear={() => {
              setLogoUrl('')
              setLogoFile(null)
            }}
            hint="Recommended: 200x50px, PNG or SVG"
          />

          <FileUploadField
            label="Favicon"
            accept="image/png,image/x-icon,image/svg+xml"
            currentUrl={faviconUrl || undefined}
            onFileSelect={setFaviconFile}
            onClear={() => {
              setFaviconUrl('')
              setFaviconFile(null)
            }}
            hint="Recommended: 32x32px, PNG or ICO"
          />
        </CardContent>

        <CardFooter className="justify-end">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? t('common.saving') : t('settings.branding.saveBranding')}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
