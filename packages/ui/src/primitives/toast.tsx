import * as React from 'react'
import { Toaster, toast } from 'sonner'

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
  return (
    <Toaster
      position={position}
      theme={theme}
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast: 'group !border !shadow-xl !rounded-xl !px-4 !py-3',
          title: '!text-sm !font-semibold',
          description: '!text-xs !mt-0.5',
          closeButton: '!opacity-0 group-hover:!opacity-60 hover:!opacity-100 !transition-opacity',
        },
      }}
    />
  )
}

export { ToastProvider, toast }
