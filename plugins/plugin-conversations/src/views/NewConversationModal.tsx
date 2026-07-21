import React from 'react'
import { Button, Input, Modal, ModalContent, cn } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { useConversationsStore } from '../ConversationsContext'
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

  const [channel, setChannel] = React.useState<Channel>('whatsapp')
  const [contactName, setContactName] = React.useState('')
  const [contactHandle, setContactHandle] = React.useState('')
  const [firstMessage, setFirstMessage] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  // Reset the form each time the modal opens.
  React.useEffect(() => {
    if (open) {
      setChannel('whatsapp')
      setContactName('')
      setContactHandle('')
      setFirstMessage('')
      setSubmitting(false)
    }
  }, [open])

  const canSubmit = contactName.trim().length > 0 && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await create({
        channel,
        contactName: contactName.trim(),
        contactHandle: contactHandle.trim() || undefined,
        firstMessage: firstMessage.trim() || undefined,
      })
      onOpenChange(false)
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

          {/* Contact name */}
          <div>
            <label htmlFor="conv-contact-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t('conversations.new.contactName')}
            </label>
            <Input
              id="conv-contact-name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder={t('conversations.new.contactNamePlaceholder')}
              autoFocus
            />
          </div>

          {/* Handle / phone / email */}
          <div>
            <label htmlFor="conv-contact-handle" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t('conversations.new.handle')}
            </label>
            <Input
              id="conv-contact-handle"
              value={contactHandle}
              onChange={(e) => setContactHandle(e.target.value)}
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
