import * as React from 'react'
import { Crown } from 'lucide-react'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter, Button } from '@fayz-ai/ui'
import { useTranslation } from '../../hooks/useTranslation'
import { useBillingStore } from '../../stores/billing.store'
import { usePermissionsStore } from '../../../permissions'
import { useOrganizationStore } from '../../../org/store'
import { navigateTo } from '../../../app/routing'
import { useUpgradeModalStore, useLimit } from './access-contract'

// ---------------------------------------------------------------------------
// UpgradeModal — the single global upgrade dialog. Mounted once in the shell
// (see AdminShell). Opened imperatively via useUpgradeModalStore().open({...})
// by LimitGate / useLimitGuard (limitKey context) or feature gates (feature
// context). Radix dialog WITH a ModalTitle for a11y (regression guard: B25).
// ---------------------------------------------------------------------------

/** Inner body — only mounted while a context is present, so useLimit(limitKey)
 *  runs against a real key (hooks stay unconditional inside this component). */
function UpgradeModalBody({ limitKey, feature }: { limitKey?: string; feature?: string }) {
  const { t } = useTranslation()
  const tr = (key: string, fallback: string, params?: Record<string, string | number>) => {
    let v = t(key)
    if (!v || v === key) v = fallback
    if (params) for (const [k, val] of Object.entries(params)) v = v.replace(`{${k}}`, String(val)).replace(`{{${k}}}`, String(val))
    return v
  }

  const close = useUpgradeModalStore((s) => s.close)
  const plans = useBillingStore((s) => s.plans)
  const features = usePermissionsStore((s) => s.features)
  const currentOrg = useOrganizationStore((s) => s.currentOrg)
  const currentPlan = plans.find((p) => p.id === (currentOrg?.plan || 'free'))
  const planName = currentPlan?.name ?? tr('billing.free', 'Free')

  const limit = useLimit(limitKey ?? '')

  const featureLabel = feature ? (features.find((f) => f.id === feature)?.label ?? feature) : null
  const limitLabel = limitKey
    ? (tr(`limit.label.${limitKey}`, limitKey))
    : null

  const title = tr('upgrade.title', 'Premium feature')
  const description = limitKey
    ? tr('limit.reached', "You've reached the {label} limit of the {plan} plan.", { label: limitLabel ?? limitKey, plan: planName })
    : featureLabel
      ? tr('upgrade.descriptionFeature', 'The {feature} feature is available on a higher plan. Upgrade to unlock it.', { feature: featureLabel })
      : tr('upgrade.description', 'This feature is available on a higher plan. Upgrade to unlock it.')

  const goToPlans = () => {
    close()
    navigateTo('/settings/subscription')
  }

  return (
    <ModalContent size="md">
      <ModalHeader>
        <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/15 text-amber-500">
          <Crown className="h-5 w-5" />
        </span>
        <ModalTitle>{title}</ModalTitle>
        <ModalDescription>{description}</ModalDescription>
      </ModalHeader>

      {limitKey && !limit.unlimited && (
        <ModalBody>
          <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{limitLabel}</span>
              <span className="font-semibold text-foreground">
                {limit.used} / {limit.max}
              </span>
            </div>
          </div>
        </ModalBody>
      )}

      <ModalFooter>
        <Button variant="outline" onClick={close}>
          {tr('common.cancel', 'Cancel')}
        </Button>
        <Button onClick={goToPlans}>
          <Crown className="mr-1.5 h-4 w-4" />
          {tr('upgrade.cta', 'View plans')}
        </Button>
      </ModalFooter>
    </ModalContent>
  )
}

export function UpgradeModal() {
  const current = useUpgradeModalStore((s) => s.current)
  const close = useUpgradeModalStore((s) => s.close)

  return (
    <Modal open={current !== null} onOpenChange={(open) => { if (!open) close() }}>
      {current !== null && <UpgradeModalBody limitKey={current.limitKey} feature={current.feature} />}
    </Modal>
  )
}
