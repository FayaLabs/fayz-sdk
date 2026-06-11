import React from 'react'

interface ActiveToggleProps {
  active: boolean
  onChange: (active: boolean) => void
}

export function ActiveToggle({ active, onChange }: ActiveToggleProps) {
  return (
    <button type="button" onClick={() => onChange(!active)} className="flex items-center gap-1.5">
      <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        active ? 'bg-primary' : 'bg-muted-foreground/30'
      }`}>
        <span className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          active ? 'translate-x-[18px]' : 'translate-x-[2px]'
        }`} />
      </div>
      <span className={`text-xs font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
        {active ? 'Active' : 'Inactive'}
      </span>
    </button>
  )
}
