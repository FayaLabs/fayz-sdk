import * as React from 'react'
import { Camera, Save } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from '@fayz-ai/ui'
import { Input } from '@fayz-ai/ui'
import { Avatar, AvatarFallback, AvatarImage } from '@fayz-ai/ui'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@fayz-ai/ui'
import { useTranslation } from '../../hooks/useTranslation'
import type { AuthUser } from '../../types'

interface UserProfileProps {
  user?: AuthUser | null
  onSave?: (data: { fullName: string }) => void
  onAvatarChange?: (file: File) => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function UserProfile({ user, onSave, onAvatarChange }: UserProfileProps) {
  const { t } = useTranslation()
  const [fullName, setFullName] = React.useState(user?.fullName ?? '')
  const [saving, setSaving] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (user) {
      setFullName(user.fullName)
    }
  }, [user])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onAvatarChange) {
      onAvatarChange(file)
    }
    if (e.target) {
      e.target.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onSave) return

    setSaving(true)
    try {
      await onSave({ fullName })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.profile.title')}</CardTitle>
          <CardDescription>
            {t('settings.profile.subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.avatarUrl} alt={user?.fullName} />
                <AvatarFallback className="text-lg">
                  {user?.fullName ? getInitials(user.fullName) : '?'}
                </AvatarFallback>
              </Avatar>
              {onAvatarChange && (
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className={cn(
                    'absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full',
                    'border-2 border-background bg-primary text-primary-foreground',
                    'transition-colors hover:bg-primary/90'
                  )}
                  aria-label="Change avatar"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="space-y-1">
              <p className="font-medium">{user?.fullName ?? 'User'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="full-name" className="text-sm font-medium">
              {t('settings.profile.fullName')}
            </label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              {t('settings.profile.email')}
            </label>
            <Input
              id="email"
              type="email"
              value={user?.email ?? ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              {t('settings.profile.emailHelp')}
            </p>
          </div>
        </CardContent>

        <CardFooter className="justify-end">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? t('common.saving') : t('settings.profile.saveProfile')}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
