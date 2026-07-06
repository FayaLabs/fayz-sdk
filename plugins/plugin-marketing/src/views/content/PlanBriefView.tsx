import React from 'react'
import { X } from 'lucide-react'
import {
  Button, Input, MarkdownEditor, SubpageHeader, Checkbox,
  Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter, SheetTitle, SheetDescription,
} from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import type { ContentPlan, PostFormat } from '../../data/contentTypes'
import { useContentPlannerStore } from './ContentPlannerContext'
import { POST_FORMATS } from './contentBits'

// ---------------------------------------------------------------------------
// Plan brief — the "what we want" page: structured strategy fields (pillars,
// objective, tone, formats, cadence) plus a free-form markdown brief.
// ---------------------------------------------------------------------------

interface Draft {
  name: string
  objective: string
  tone: string
  pillars: string[]
  formats: PostFormat[]
  weeklyFrequency: number
  weeksCount: number
  briefMd: string
}

function toDraft(plan: ContentPlan): Draft {
  return {
    name: plan.name,
    objective: plan.objective ?? '',
    tone: plan.tone ?? '',
    pillars: plan.pillars,
    formats: plan.formats,
    weeklyFrequency: plan.weeklyFrequency,
    weeksCount: plan.weeksCount,
    briefMd: plan.briefMd,
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function useBriefDraft() {
  const plan = useContentPlannerStore((s) => s.activePlan)
  const savePlan = useContentPlannerStore((s) => s.savePlan)

  const [draft, setDraft] = React.useState<Draft | null>(plan ? toDraft(plan) : null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (plan) setDraft(toDraft(plan))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id])

  const patch = (partial: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...partial } : d))
  const dirty = !!plan && !!draft && JSON.stringify(draft) !== JSON.stringify(toDraft(plan))

  const save = async () => {
    if (!plan || !draft) return
    setSaving(true)
    try {
      await savePlan({
        id: plan.id,
        name: draft.name,
        objective: draft.objective,
        tone: draft.tone,
        pillars: draft.pillars,
        formats: draft.formats,
        weeklyFrequency: draft.weeklyFrequency,
        weeksCount: draft.weeksCount,
        briefMd: draft.briefMd,
      })
    } finally {
      setSaving(false)
    }
  }

  return { plan, draft, patch, dirty, saving, save }
}

function BriefFields({ draft, patch }: { draft: Draft; patch: (p: Partial<Draft>) => void }) {
  const t = useTranslation()
  const [pillarInput, setPillarInput] = React.useState('')

  const addPillar = () => {
    const value = pillarInput.trim()
    if (!value || draft.pillars.includes(value)) return
    patch({ pillars: [...draft.pillars, value] })
    setPillarInput('')
  }

  const toggleFormat = (format: PostFormat) => {
    patch({
      formats: draft.formats.includes(format)
        ? draft.formats.filter((f) => f !== format)
        : [...draft.formats, format],
    })
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t('marketing.content.planName')}>
          <Input value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
        </Field>
        <Field label={t('marketing.content.objective')}>
          <Input
            value={draft.objective}
            onChange={(e) => patch({ objective: e.target.value })}
            placeholder={t('marketing.content.objectivePlaceholder')}
          />
        </Field>
        <Field label={t('marketing.content.tone')}>
          <Input
            value={draft.tone}
            onChange={(e) => patch({ tone: e.target.value })}
            placeholder={t('marketing.content.tonePlaceholder')}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('marketing.content.weeklyFrequency')}>
            <Input
              type="number"
              min={1}
              max={14}
              value={draft.weeklyFrequency}
              onChange={(e) => patch({ weeklyFrequency: Math.max(1, Number(e.target.value) || 1) })}
            />
          </Field>
          <Field label={t('marketing.content.weeksCount')}>
            <Input
              type="number"
              min={1}
              max={52}
              value={draft.weeksCount}
              onChange={(e) => patch({ weeksCount: Math.max(1, Number(e.target.value) || 1) })}
            />
          </Field>
        </div>
      </div>

      <Field label={t('marketing.content.pillars')}>
        <div className="flex flex-wrap items-center gap-1.5">
          {draft.pillars.map((pillar) => (
            <span
              key={pillar}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
            >
              {pillar}
              <button
                type="button"
                onClick={() => patch({ pillars: draft.pillars.filter((p) => p !== pillar) })}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <Input
            value={pillarInput}
            onChange={(e) => setPillarInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addPillar()
              }
            }}
            onBlur={addPillar}
            placeholder={t('marketing.content.pillarPlaceholder')}
            className="h-7 w-44 text-xs"
          />
        </div>
      </Field>

      <Field label={t('marketing.content.formatsLabel')}>
        <div className="flex flex-wrap gap-4">
          {POST_FORMATS.map((format) => (
            <label key={format} className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={draft.formats.includes(format)}
                onChange={() => toggleFormat(format)}
              />
              {t(`marketing.content.format.${format}`)}
            </label>
          ))}
        </div>
      </Field>

      <Field label={t('marketing.content.briefBody')}>
        <MarkdownEditor
          value={draft.briefMd}
          onChange={(briefMd) => patch({ briefMd })}
          placeholder={t('marketing.content.briefPlaceholder')}
          editLabel={t('marketing.content.edit')}
          previewLabel={t('marketing.content.preview')}
          minRows={10}
        />
      </Field>
    </div>
  )
}

/** Full-page variant — kept for the /marketing/content/brief deep link. */
export function PlanBriefView({ onBack }: { onBack: () => void }) {
  const t = useTranslation()
  const { plan, draft, patch, dirty, saving, save } = useBriefDraft()

  if (!plan || !draft) {
    return <div className="mx-auto max-w-3xl text-sm text-muted-foreground">…</div>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <SubpageHeader
        title={t('marketing.content.brief')}
        subtitle={plan.name}
        parentLabel={t('marketing.content.title')}
        onBack={onBack}
        actions={
          <Button size="sm" onClick={() => void save()} disabled={!dirty || saving}>
            {t('marketing.content.save')}
          </Button>
        }
      />
      <BriefFields draft={draft} patch={patch} />
    </div>
  )
}

/** Right slide-over variant — the board's Briefing button opens this, keeping
 *  the calendar in sight while the strategy is edited. */
export function PlanBriefSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslation()
  const { plan, draft, patch, dirty, saving, save } = useBriefDraft()

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent width="max-w-2xl">
        <SheetHeader>
          <SheetTitle>{t('marketing.content.brief')}</SheetTitle>
          {plan && <SheetDescription>{plan.name}</SheetDescription>}
        </SheetHeader>
        <SheetBody>
          {draft ? (
            <BriefFields draft={draft} patch={patch} />
          ) : (
            <p className="text-sm text-muted-foreground">…</p>
          )}
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('marketing.content.cancel')}
          </Button>
          <Button onClick={() => void save()} disabled={!dirty || saving}>
            {t('marketing.content.save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
