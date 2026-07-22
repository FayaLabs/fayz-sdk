import React from 'react'
import { Button, Input, Modal, ModalContent, cn, toast } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { useLimitGuard, invalidateLimit, ContactPicker, type ContactPickerValue } from '@fayz-ai/saas'
import { useConversationsStore, useConversationsConfig } from '../ConversationsContext'
import { CHANNEL_ACCENT, CHANNEL_ICON, CHANNEL_LABELS } from '../channel'
import type { Channel } from '../types'

const CHANNELS: Channel[] = ['whatsapp', 'sms', 'instagram', 'email', 'webchat']

export function NewConversationModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslation()
  const create = useConversationsStore((s) => s.create)
  const config = useConversationsConfig()
  const guardConversations = useLimitGuard('conversations_month')

  const [channel, setChannel] = React.useState<Channel>('whatsapp')
  const [contact, setContact] = React.useState<ContactPickerValue | null>(null)
  const [contactHandle, setContactHandle] = React.useState('')
  // Once the user edits the handle by hand we stop overwriting it from the
  // selected person — their typing outranks our autofill.
  const [handleTouched, setHandleTouched] = React.useState(false)
  const [firstMessage, setFirstMessage] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  // Reset the form each time the modal opens. `pickerKey` remounts the picker so
  // its internal search text resets too.
  const [pickerKey, setPickerKey] = React.useState(0)
  React.useEffect(() => {
    if (open) {
      setChannel('whatsapp')
      setContact(null)
      setContactHandle('')
      setHandleTouched(false)
      setFirstMessage('')
      setSubmitting(false)
      setPickerKey((k) => k + 1)
    }
  }, [open])

  // Autofill the handle from the picked contact: email channel wants the email,
  // every other channel wants the phone. Falls back to whichever exists.
  React.useEffect(() => {
    if (handleTouched) return
    if (!contact?.id) return
    const preferred = channel === 'email' ? contact.email : contact.phone
    const next = preferred || contact.phone || contact.email || ''
    setContactHandle(next)
  }, [contact, channel, handleTouched])

  const canSubmit = (contact?.name.trim().length ?? 0) > 0 && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    // Plan quantity guard (client-side, before the store call): opens the global
    // UpgradeModal and aborts when the monthly conversation cap is reached.
    if ((await guardConversations()) === 'blocked') return
    setSubmitting(true)
    try {
      await create({
        channel,
        contactName: contact!.name.trim(),
        contactPersonId: contact?.id,
        contactHandle: contactHandle.trim() || undefined,
        firstMessage: firstMessage.trim() || undefined,
      })
      invalidateLimit('conversations_month')
      onOpenChange(false)
    } catch (err) {
      // A failed insert (unresolved tenant, RLS rejection, offline…) previously
      // threw past the `finally` — `onOpenChange(false)` never ran, so the modal
      // stayed open with no feedback and the thread silently vanished. Surface
      // the failure and keep the form open so the user can retry.
      const message = err instanceof Error ? err.message : String(err)
      toast.error(t('conversations.new.createFailed'), { description: message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-foreground">{t('conversations.new.title')}</h2>

          {/* Channel picker */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t('conversations.new.channel')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CHANNELS.map((ch) => {
                const Icon = CHANNEL_ICON[ch]
                const active = channel === ch
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChannel(ch)}
                    aria-pressed={active}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                      active
                        ? 'text-white'
                        : 'bg-muted text-muted-foreground hover:bg-muted/70',
                    )}
                    style={active ? { backgroundColor: CHANNEL_ACCENT[ch].color } : undefined}
                  >
                    <Icon className="h-3 w-3" />
                    {CHANNEL_LABELS[ch]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Contact — shared find-or-create flow (@fayz-ai/saas), the same one
              the agenda uses to pick a client: search the tenant's people, and
              when there's no match create one inline with name/phone/email. A
              typed-but-unmatched name still starts a thread (allowFreeText),
              just without a person link. */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t('conversations.new.contactName')}
            </label>
            <ContactPicker
              key={pickerKey}
              value={contact}
              onChange={setContact}
              kind={config.contactKind}
              extensionTable={config.contactExtensionTable}
              lookup={config.contactLookup}
              allowFreeText
              autoFocus
              placeholder={t('conversations.new.contactNamePlaceholder')}
            />
          </div>

          {/* Handle / phone / email — autofilled from the picked contact. */}
          <div>
            <label htmlFor="conv-contact-handle" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t('conversations.new.handle')}
            </label>
            <Input
              id="conv-contact-handle"
              value={contactHandle}
              onChange={(e) => { setContactHandle(e.target.value); setHandleTouched(true) }}
              placeholder={t('conversations.new.handlePlaceholder')}
            />
          </div>

          {/* First message */}
          <div>
            <label htmlFor="conv-first-message" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t('conversations.new.firstMessage')}
            </label>
            <textarea
              id="conv-first-message"
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
              rows={3}
              placeholder={t('conversations.new.firstMessagePlaceholder')}
              className="max-h-40 min-h-[64px] w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('conversations.new.cancel')}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? t('conversations.new.creating') : t('conversations.new.create')}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  )
}
