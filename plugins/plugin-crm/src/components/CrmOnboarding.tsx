import React, { useState } from 'react'
import { Filter, Globe, Target, ChevronRight, Check } from 'lucide-react'
import { useTranslation } from '@fayz-ai/core'
import { Button } from '@fayz-ai/ui'

const STEPS = [
  { id: 'welcome', icon: Filter, titleKey: 'crm.onboarding.welcome', descKey: 'crm.onboarding.description' },
  { id: 'sources', icon: Globe, titleKey: 'crm.onboarding.sources.title', descKey: 'crm.onboarding.sources.description' },
  { id: 'pipeline', icon: Target, titleKey: 'crm.onboarding.pipeline.title', descKey: 'crm.onboarding.pipeline.description' },
]

export function CrmOnboarding({ onComplete }: { onComplete: () => void }) {
  const t = useTranslation()
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const Icon = current.icon

  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />)}
        </div>
        <div className="rounded-card border bg-card p-8 text-center space-y-6 shadow-sm">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Icon className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold">{t(current.titleKey)}</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">{t(current.descKey)}</p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {step > 0 && <Button variant="outline" size="lg" onClick={() => setStep(step - 1)}>{t('common.back')}</Button>}
            {isLast ? (
              <Button variant="default" size="lg" onClick={onComplete}>
                <Check className="h-4 w-4" /> {t('crm.onboarding.startSelling')}
              </Button>
            ) : (
              <Button variant="default" size="lg" onClick={() => setStep(step + 1)}>
                {step === 0 ? t('crm.onboarding.getStarted') : t('crm.onboarding.next')} <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
          {step === 0 && <button onClick={onComplete} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t('crm.onboarding.skip')}</button>}
        </div>
      </div>
    </div>
  )
}
