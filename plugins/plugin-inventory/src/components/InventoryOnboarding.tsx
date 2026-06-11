import React, { useState } from 'react'
import { Package, Ruler, MapPin, ChevronRight, Check } from 'lucide-react'
import { useTranslation } from '@fayz/core'
import { Button } from '@fayz/ui'

const STEPS = [
  { id: 'welcome', icon: Package, titleKey: 'inventory.onboarding.welcome', descKey: 'inventory.onboarding.description' },
  { id: 'units', icon: Ruler, titleKey: 'inventory.onboarding.units.title', descKey: 'inventory.onboarding.units.description' },
  { id: 'locations', icon: MapPin, titleKey: 'inventory.onboarding.locations.title', descKey: 'inventory.onboarding.locations.description' },
]

export function InventoryOnboarding({ onComplete }: { onComplete: () => void }) {
  const t = useTranslation()
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const Icon = current.icon

  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
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
            {step > 0 && (
              <Button variant="outline" size="lg" onClick={() => setStep(step - 1)}>{t('common.back')}</Button>
            )}
            {isLast ? (
              <Button variant="default" size="lg" onClick={onComplete}>
                <Check className="h-4 w-4" /> {t('inventory.onboarding.start')}
              </Button>
            ) : (
              <Button variant="default" size="lg" onClick={() => setStep(step + 1)}>
                {step === 0 ? t('inventory.onboarding.getStarted') : t('common.continue')} <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
          {step === 0 && (
            <button onClick={onComplete} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {t('inventory.onboarding.skip')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
