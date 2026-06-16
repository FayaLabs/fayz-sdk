import * as React from 'react'
import { Toaster, toast } from 'sonner'
import { useSaveBarVisible } from '../layout/SaveBar'

interface ToastProviderProps {
  position?:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right'
  theme?: 'light' | 'dark' | 'system'
}

function ToastProvider({
  position = 'bottom-center',
  theme = 'system',
}: ToastProviderProps) {
  // Stack toasts ABOVE the floating SaveBar (instead of overlapping it) by
  // lifting the bottom offset while the bar is on screen.
  const saveBarVisible = useSaveBarVisible()
  const bottomOffset = position.startsWith('bottom') && saveBarVisible ? 84 : 24
  return (
    <Toaster
      position={position}
      theme={theme}
      offset={bottomOffset}
      closeButton
      richColors
      toastOptions={{
        classNames: {
          // Format harmonized with the SaveBar island: soft ring + xl shadow,
          // generous rounded-2xl radius (full-pill looks wrong on multi-line
          // toasts). Colors stay semantic (richColors).
          toast: 'group !gap-3 !rounded-3xl !border !px-4 !py-3 !shadow-xl !ring-1 !ring-black/5',
          title: '!text-sm !font-semibold',
          description: '!text-xs !mt-0.5',
          closeButton: '!opacity-0 group-hover:!opacity-60 hover:!opacity-100 !transition-opacity',
        },
      }}
    />
  )
}

export { ToastProvider, toast }
