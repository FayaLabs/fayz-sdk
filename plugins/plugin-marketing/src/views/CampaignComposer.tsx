import React from 'react'
import {
  Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter,
  Button, Input,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { useMarketingConfig, useMarketingStore } from '../MarketingContext'
import type { CampaignStatus } from '../types'

const STATUSES: CampaignStatus[] = ['draft', 'active', 'paused']

export function CampaignComposer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslation()
  const { channels } = useMarketingConfig()
  const saveCampaign = useMarketingStore((s) => s.saveCampaign)

  const [name, setName] = React.useState('')
  const [channelId, setChannelId] = React.useState(channels[0]?.id ?? '')
  const [status, setStatus] = React.useState<CampaignStatus>('active')
  const [spend, setSpend] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setName(''); setChannelId(channels[0]?.id ?? ''); setStatus('active'); setSpend('')
    }
  }, [open, channels])

  async function handleSave() {
    if (!name.trim() || !channelId) return
    setSaving(true)
    await saveCampaign({
      name: name.trim(),
      channelId,
      status,
      start: new Date().toISOString(),
      spend: Number(spend) || 0,
    })
    setSaving(false)
    onClose()
  }

  return (
    <Modal open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <ModalContent size="md">
        <ModalHeader>
          <ModalTitle>{t('marketing.composer.title')}</ModalTitle>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">{t('marketing.composer.name')}</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('marketing.composer.namePlaceholder')} />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">{t('marketing.composer.channel')}</span>
            <Select value={channelId} onValueChange={setChannelId}>
              <SelectTrigger><SelectValue placeholder={t('marketing.composer.channelPlaceholder')} /></SelectTrigger>
              <SelectContent>
                {channels.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">{t('marketing.composer.status')}</span>
              <Select value={status} onValueChange={(v) => setStatus(v as CampaignStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{t(`marketing.status.${s}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">{t('marketing.composer.budget')}</span>
              <Input type="number" min={0} value={spend} onChange={(e) => setSpend(e.target.value)} placeholder="0" />
            </label>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>{t('marketing.composer.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>{t('marketing.composer.create')}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
