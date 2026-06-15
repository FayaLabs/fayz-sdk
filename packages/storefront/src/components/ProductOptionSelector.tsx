import React from 'react'
import type { ProductOptionGroup, ProductOptionSelection } from '../product-options'
import { TID } from '../testids'

export interface ProductOptionSelectorProps {
  groups: ProductOptionGroup[]
  value: ProductOptionSelection
  onChange: (value: ProductOptionSelection) => void
}

export function ProductOptionSelector({ groups, value, onChange }: ProductOptionSelectorProps) {
  if (groups.length === 0) return null

  return (
    <div className="mt-6 space-y-4">
      {groups.map((group) => (
        <div key={group.id} data-testid={TID.productOptionGroup(group.id)}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{group.label}</p>
            {value[group.label] && (
              <p className="truncate text-xs text-muted-foreground">{value[group.label]}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {group.values.map((option) => {
              const selected = value[group.label] === option
              return (
                <button
                  key={option}
                  type="button"
                  data-testid={TID.productOptionValue(group.id, option)}
                  aria-pressed={selected}
                  onClick={() => onChange({ ...value, [group.label]: option })}
                  className={[
                    'min-h-10 rounded-full border px-4 text-sm font-medium transition-colors',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground hover:border-primary/60',
                  ].join(' ')}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
