import React, { useState, useCallback, useRef } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import { Button } from '@fayz/ui'
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from '@fayz/ui'
import { useTranslation } from '@fayz/core'
import { getAllDocumentTypes, type DocumentTypeOption } from '../document-types'

interface AddDocumentDropdownProps {
  personId: string
  onSelect: (option: DocumentTypeOption) => void
}

export function AddDocumentDropdown({ personId, onSelect }: AddDocumentDropdownProps) {
  const t = useTranslation()
  const [options, setOptions] = useState<DocumentTypeOption[]>([])
  const [loaded, setLoaded] = useState(false)
  const loadingRef = useRef(false)

  const handleOpen = useCallback((open: boolean) => {
    if (!open || loaded || loadingRef.current) return
    loadingRef.current = true
    getAllDocumentTypes(personId).then((opts) => {
      setOptions(opts)
      setLoaded(true)
      loadingRef.current = false
    })
  }, [personId, loaded])

  // Group options by group label
  const groups: Array<{ label: string; items: DocumentTypeOption[] }> = []
  for (const opt of options) {
    let group = groups.find((g) => g.label === opt.group)
    if (!group) {
      group = { label: opt.group, items: [] }
      groups.push(group)
    }
    group.items.push(opt)
  }

  return (
    <Dropdown onOpenChange={handleOpen}>
      <DropdownTrigger asChild>
        <Button size="sm" className="h-8">
          <Plus className="h-3.5 w-3.5 mr-1" />
          {t('customForms.addDocument')}
          <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
        </Button>
      </DropdownTrigger>
      <DropdownContent align="end" className="w-56">
        {groups.map((group, gi) => (
          <React.Fragment key={group.label}>
            {gi > 0 && <DropdownSeparator />}
            <DropdownLabel className="text-[10px] uppercase tracking-wider">
              {group.label}
            </DropdownLabel>
            {group.items.map((opt) => {
              const Icon = opt.icon
              return (
                <DropdownItem key={opt.id} onClick={() => onSelect(opt)} className="gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{opt.label}</p>
                    {opt.description && (
                      <p className="text-[10px] text-muted-foreground truncate">{opt.description}</p>
                    )}
                  </div>
                </DropdownItem>
              )
            })}
          </React.Fragment>
        ))}
        {!loaded && (
          <div className="flex items-center justify-center py-3">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent animate-spin rounded-full" />
          </div>
        )}
        {loaded && options.length === 0 && (
          <div className="px-2 py-3 text-center text-xs text-muted-foreground">
            {t('customForms.noTemplates')}
          </div>
        )}
      </DropdownContent>
    </Dropdown>
  )
}
