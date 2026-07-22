import React from 'react'
import { Button, Input, Modal, ModalContent, cn, toast } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { useLimitGuard, invalidateLimit, ContactPicker, type ContactPickerValue } from '@fayz-ai/saas'
import { useConversationsStore, useConversationsConfig } from '../ConversationsContext'
import { CHANNEL_ACCENT, CHANNEL_ICON, CHANNEL_LABELS } from '../channel'
import type { Channel } from '../types'

const CHANNELS: Channel[] = ['whatsapp', 'sms', 'instagram', 'email', 'webchat']

/**
 * Which field of a person IS the handle on a given channel. Phone channels read
 * the phone, email reads the email; Instagram and web chat have no counterpart
 * on a person record, so they always have to be typed. Deliberately NOT
 * cross-filling (an email in a WhatsApp handle looked plausible on screen and
 * was simply wrong).
 */
function personHandleFor(channel: Channel, contact: ContactPickerValue | null): string {
  if (!contact) return ''
  if (channel === 'email') return contact.email ?? ''
  if (channel === 'sms' || channel === 'whatsapp') return contact.phone ?? ''
  return ''
}

const HANDLE_LABEL_KEY: Record<Channel, string> = {
  whatsapp: 'conversations.new.handleLabel.phone',
  sms: 'conversations.new.handleLabel.phone',
  email: 'conversations.new.handleLabel.email',
  instagram: 'conversations.new.handleLabel.instagram',
  webchat: 'conversations.new.handleLabel.webchat',
}

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
  // Handle the user typed themselves. The one taken FROM the contact is derived
  // (see personHandleFor) and shown on the picker's chip — same as the agenda,
  // which never had a second phone field.
  const [typedHandle, setTypedHandle] = React.useState('')
  const [handleOpen, setHandleOpen] = React.useState(false)
  // While the picker's inline create form is open it already asks for phone and
  // email, so showing our own handle field would ask for the phone twice.
  const [creatingContact, setCreatingContact] = React.useState(false)
  const [firstMessage, setFirstMessage] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  // Reset the form each time the modal opens. `pickerKey` remounts the picker so
  // its internal search text resets too.
  const [pickerKey, setPickerKey] = React.useState(0)
  React.useEffect(() => {
    if (open) {
      setChannel('whatsapp')
      setContact(null)
      setTypedHandle('')
      setHandleOpen(false)
      setCreatingContact(false)
      setFirstMessage('')
      setSubmitting(false)
      setPickerKey((k) => k + 1)
    }
  }, [open])

  // What we'd message on this channel: the contact's own datum when they have
  // one, otherwise whatever the user typed. Recomputed on every channel switch,
  // so flipping WhatsApp → Email swaps phone for email with no stale state.
  const derivedHandle = personHandleFor(channel, contact)
  const effectiveHandle = derivedHandle || typedHandle
  const handleLabel = t(HANDLE_LABEL_KEY[channel])
  // The field only exists when there is nothing to derive — that second
  // always-on input was what asked for the phone twice.
  const showHandleField = !creatingContact && !derivedHandle && (handleOpen || !!typedHandle)

  const canSubmit = (contact?.name.trim().length ?? 0) > 0 && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      // Plan quantity guard (client-side, before the store call): opens the
      // global UpgradeModal and aborts when the monthly cap is reached. Inside
      // the try on purpose — it hits the network to count usage, and a rejection
      // out here used to escape unhandled, leaving the modal open with no
      // feedback at all (indistinguishable from a dead button).
      if ((await guardConversations()) === 'blocked') return
      await create({
        channel,
        contactName: contact!.name.trim(),
        contactPersonId: contact?.id,
        contactHandle: effectiveHandle.trim() || undefined,
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
              onCreatingChange={setCreatingContact}
              autoFocus
              placeholder={t('conversations.new.contactNamePlaceholder')}
              secondaryText={derivedHandle || undefined}
            />
          </div>

          {/* Handle — only when the contact has nothing to derive for this
              channel (an Instagram @, or a person with no phone). Otherwise it
              rides on the picker's chip, exactly like the agenda. */}
          {showHandleField && (
            <div>
              <label htmlFor="conv-contact-handle" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t('conversations.new.handle')}
              </label>
              <Input
                id="conv-contact-handle"
                value={typedHandle}
                onChange={(e) => setTypedHandle(e.target.value)}
                placeholder={t('conversations.new.handlePlaceholder')}
                autoFocus={handleOpen}
              />
            </div>
          )}
          {!creatingContact && !derivedHandle && !showHandleField && (
            <button
              type="button"
              onClick={() => setHandleOpen(true)}
              className="self-start text-xs font-medium text-primary hover:underline"
            >
              + {t('conversations.new.addHandle').replace('{label}', handleLabel)}
            </button>
          )}

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
