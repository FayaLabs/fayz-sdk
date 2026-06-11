import React, { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { useCrmStore } from '../CrmContext'
import { useTranslation } from '@fayz/core'
import { SubpageHeader } from '@fayz/ui'

export function LeadFormView({ onSaved }: { onSaved?: (id?: string) => void }) {
  const t = useTranslation()
  const createLead = useCrmStore((s) => s.createLead)
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
    if (!name.trim()) return
    setSaving(true)
    try {
      const lead = await createLead({ name, email: email || undefined, phone: phone || undefined, company: company || undefined, notes: notes || undefined })
      onSaved?.(lead.id)
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-5">
      <SubpageHeader title={t('crm.leadForm.title')} subtitle={t('crm.leadForm.subtitle')} onBack={onSaved} parentLabel={t('crm.leads.title')} actions={
        <div className="flex items-center gap-2">
          {onSaved && <button onClick={() => onSaved()} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors">{t('crm.leadForm.cancel')}</button>}
          <button onClick={handleSave} disabled={!name.trim() || saving} className="inline-flex items-center gap-1.5 rounded-lg bg-primary border border-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-colors disabled:opacity-50">
            <Save className="h-3 w-3" /> {saving ? t('crm.leadForm.saving') : t('crm.leadForm.save')}
          </button>
        </div>
      } />
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
