import * as React from 'react'
import { Plus, X } from 'lucide-react'
import { toast } from '../notifications/ToastProvider'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@fayz-ai/ui'
import { Button } from '@fayz-ai/ui'
import { Input } from '@fayz-ai/ui'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@fayz-ai/ui'
import { Badge } from '@fayz-ai/ui'
import { usePermissionsStore } from '../../stores/permissions.store'
import { useOrganizationStore } from '../../stores/organization.store'
import { useInviteStore } from '../../stores/invite.store'
import { useOrgAdapterOptional } from '../../lib/org-context'
import { useAuthStore } from '../../stores/auth.store'
import { useTranslation } from '../../hooks/useTranslation'

interface InviteMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fill the first email (e.g. from person detail Access tab) */
  defaultEmail?: string
}

export function InviteMemberDialog({ open, onOpenChange, defaultEmail }: InviteMemberDialogProps) {
  const { t } = useTranslation()
  const adapter = useOrgAdapterOptional()
  const currentOrg = useOrganizationStore((s) => s.currentOrg)
  const profiles = usePermissionsStore((s) => s.profiles)
  const setInvites = useInviteStore((s) => s.setInvites)
  const user = useAuthStore((s) => s.user)

  const [emails, setEmails] = React.useState<string[]>([defaultEmail ?? ''])
  const [profileId, setProfileId] = React.useState(profiles[1]?.id ?? profiles[0]?.id ?? '')
  const [sending, setSending] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  const addEmail = () => setEmails((prev) => [...prev, ''])

  const updateEmail = (idx: number, value: string) => {
    setEmails((prev) => {
      const next = [...prev]
      next[idx] = value
      return next
    })
  }

  const removeEmail = (idx: number) => {
    setEmails((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSend = async () => {
    if (!adapter || !currentOrg || !user) return
    const validEmails = emails.filter((e) => e.trim() && e.includes('@'))
    if (validEmails.length === 0) return

    setSending(true)
    try {
      if (validEmails.length === 1) {
        await adapter.createInvite(currentOrg.id, validEmails[0].trim(), profileId, user.id)
      } else {
        await adapter.bulkInvite(currentOrg.id, validEmails.map((e) => e.trim()), profileId, user.id)
      }
      const invites = await adapter.listInvites(currentOrg.id)
      setInvites(invites)
      setSent(true)
    } catch (err: any) {
      toast.error('Failed to send invites', { description: err?.message })
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset after animation
    setTimeout(() => {
      setEmails([''])
      setProfileId(profiles[1]?.id ?? profiles[0]?.id ?? '')
      setSent(false)
    }, 200)
  }

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{t('organization.invite.title')}</ModalTitle>
          <ModalDescription>{t('organization.invite.description')}</ModalDescription>
        </ModalHeader>

        {sent ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            </div>
            <p className="text-sm font-medium">{t('organization.invite.sent')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('organization.invite.sentDescription')}</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('organization.invite.emailLabel')}</label>
              {emails.map((email, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    type="email"
                    placeholder="team@example.com"
                    value={email}
                    onChange={(e) => updateEmail(idx, e.target.value)}
                  />
                  {emails.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeEmail(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={addEmail} className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t('organization.invite.addAnother')}
              </Button>
            </div>

            <div>
              <label className="text-sm font-medium">{t('organization.invite.roleLabel')}</label>
              <Select value={profileId} onValueChange={setProfileId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t('organization.invite.rolePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <ModalFooter>
          {sent ? (
            <Button onClick={handleClose}>{t('common.done')}</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>{t('common.cancel')}</Button>
              <Button onClick={handleSend} disabled={sending || emails.every((e) => !e.trim())}>
                {sending ? t('organization.invite.sending') : t('organization.invite.sendInvites')}
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
