import * as React from 'react'
import { MapPin } from 'lucide-react'
import { useLocationStore } from '../../stores/location.store'
import { useTranslation } from '../../hooks/useTranslation'

export function LocationSwitchOverlay() {
  const switching = useLocationStore((s) => s.switching)
  const { t } = useTranslation()

  if (!switching) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm animate-[locSwitch-in_350ms_ease-out_both]">
      <style>{`
        @keyframes locSwitch-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes locSwitch-icon {
          0%   { transform: scale(0.7) rotate(-10deg); opacity: 0; }
          50%  { transform: scale(1.1) rotate(3deg);   opacity: 1; }
          100% { transform: scale(1)   rotate(0deg);   opacity: 1; }
        }
        @keyframes locSwitch-text {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes locSwitch-dots {
          0%, 20% { opacity: 0.3; }
          50%     { opacity: 1; }
          80%, 100% { opacity: 0.3; }
        }
      `}</style>
      <div className="text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"
          style={{ animation: 'locSwitch-icon 500ms ease-out both' }}
        >
          <MapPin className="h-8 w-8 text-primary" />
        </div>
        <p
          className="text-lg font-semibold text-foreground"
          style={{ animation: 'locSwitch-text 400ms ease-out 200ms both' }}
        >
          {t('layout.switchingLocation')}
        </p>
        <div
          className="mt-2 flex items-center justify-center gap-1"
          style={{ animation: 'locSwitch-text 400ms ease-out 350ms both' }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary"
              style={{
                animation: `locSwitch-dots 1s ease-in-out ${i * 200}ms infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
