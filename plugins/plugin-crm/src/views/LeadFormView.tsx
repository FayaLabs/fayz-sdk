import React, { useState, useEffect } from 'react'
import { useCrmStore } from '../CrmContext'
import { useTranslation } from '@fayz-ai/core'
import { useLimitGuard, invalidateLimit } from '@fayz-ai/saas'
import { SubpageHeader, useSaveBar, toast } from '@fayz-ai/ui'

export function LeadFormView({ onSaved }: { onSaved?: (id?: string) => void }) {
  const t = useTranslation()
  const createLead = useCrmStore((s) => s.createLead)
  // Creating a lead also auto-creates a deal (store.createLead), so this path is
  // the create surface for both the pipeline board ("+ Add") and the lead form.
  const guardLeads = useLimitGuard('leads')
  const fetchPipelines = useCrmStore((s) => s.fetchPipelines)
  const pipelines = useCrmStore((s) => s.pipelines)

  // Ensure pipelines are loaded so createLead can auto-create a deal
  useEffect(() => { if (pipelines.length === 0) fetchPipelines() }, [])

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) { toast.error(t('common.formIncomplete')); return }
    // Plan quantity guard (client-side, before the store call): opens the global
    // UpgradeModal and aborts when the lead cap is reached.
    if ((await guardLeads()) === 'blocked') return
    setSaving(true)
    try {
      const lead = await createLead({ name, email: email || undefined, phone: phone || undefined, company: company || undefined, notes: notes || undefined })
      // A lead spawns a deal too — refresh both live counts.
      invalidateLimit('leads')
      invalidateLimit('deals')
      onSaved?.(lead.id)
    } finally { setSaving(false) }
  }

  const dirty = !!(name || email || phone || company || notes)
  useSaveBar({
    dirty,
    saving,
    onSave: () => { void handleSave() },
    onDiscard: () => onSaved?.(),
    saveLabel: t('crm.leadForm.save'),
  })

  return (
    <div className="space-y-5">
      <SubpageHeader title={t('crm.leadForm.title')} subtitle={t('crm.leadForm.subtitle')} onBack={onSaved} parentLabel={t('crm.leads.title')} />
      <div className="rounded-lg border bg-card shadow-sm p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="text-xs font-medium text-muted-foreground">{t('crm.leadForm.name')}</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('crm.leadForm.namePlaceholder')} autoFocus className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
          <div><label className="text-xs font-medium text-muted-foreground">{t('crm.leadForm.company')}</label><input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t('crm.leadForm.companyPlaceholder')} className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="text-xs font-medium text-muted-foreground">{t('crm.leadForm.email')}</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('crm.leadForm.emailPlaceholder')} className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
          <div><label className="text-xs font-medium text-muted-foreground">{t('crm.leadForm.phone')}</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('crm.leadForm.phonePlaceholder')} className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
        </div>
        <div><label className="text-xs font-medium text-muted-foreground">{t('crm.leadForm.notes')}</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={t('crm.leadForm.notesPlaceholder')} className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" /></div>
      </div>
    </div>
  )
}
