import React, { useState } from 'react'
import { DollarSign, Landmark, CreditCard, BookOpen, ChevronRight, Check } from 'lucide-react'
import { useTranslation } from '@fayz/core'
import { Button } from '@fayz/ui'

const STEPS = [
  { id: 'welcome', icon: DollarSign, titleKey: 'financial.onboarding.welcome', descKey: 'financial.onboarding.description' },
  { id: 'accounts', icon: Landmark, titleKey: 'financial.onboarding.accounts.title', descKey: 'financial.onboarding.accounts.description' },
  { id: 'payments', icon: CreditCard, titleKey: 'financial.onboarding.payments.title', descKey: 'financial.onboarding.payments.description' },
  { id: 'chart', icon: BookOpen, titleKey: 'financial.onboarding.chart.title', descKey: 'financial.onboarding.chart.description' },
]

export function FinancialOnboarding({ onComplete }: { onComplete: () => void }) {
  const t = useTranslation()
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const Icon = current.icon

  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Card */}
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

          {/* Step-specific hint */}
          {step > 0 && step < STEPS.length - 1 && (
            <div className="rounded-lg bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
              {t('financial.onboarding.configureHint')}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-3 pt-2">
            {step > 0 && (
              <Button variant="outline" size="lg" onClick={() => setStep(step - 1)}>
                {t('financial.onboarding.back')}
              </Button>
            )}
            {isLast ? (
              <Button variant="default" size="lg" onClick={onComplete}>
                <Check className="h-4 w-4" /> {t('financial.onboarding.startUsing')}
              </Button>
            ) : (
              <Button variant="default" size="lg" onClick={() => setStep(step + 1)}>
                {step === 0 ? t('financial.onboarding.getStarted') : t('financial.onboarding.next')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Skip */}
          {!isLast && step === 0 && (
            <button
              onClick={onComplete}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('financial.onboarding.skip')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
