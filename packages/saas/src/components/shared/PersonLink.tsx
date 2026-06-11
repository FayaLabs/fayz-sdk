import React, { useState, useCallback, useRef } from 'react'
import { Mail, Phone, ExternalLink, Cake, Calendar } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@fayz/ui'
import { createArchetypeLookup } from '../../archetype-lookup'
import type { EntityLookupResult } from '../../archetype-lookup'
import { cn } from '@fayz/ui'
import { resolveEntityHref } from '../../lib/entity-routes'

// Singleton person lookup — shared across all PersonLink instances
const personLookup = createArchetypeLookup({ archetype: 'person' })

interface PersonLinkProps {
  /** Person UUID — required for fetching details */
  personId?: string | null
  /** Display name (shown as the clickable text) */
  name: string
  /** Optional href to navigate to the person's profile */
  profileHref?: string
  /** Optional tab to open on the detail page (e.g. "schedule") */
  tab?: string
  /** Size variant */
  size?: 'sm' | 'default'
  /** Additional className for the trigger */
  className?: string
}

function formatAge(dob: string): string | null {
  try {
    const birth = new Date(dob)
    const now = new Date()
    let age = now.getFullYear() - birth.getFullYear()
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--
    return `${age}y`
  } catch { return null }
}

export function PersonLink({ personId, name, profileHref, tab, size = 'default', className }: PersonLinkProps) {
  const [person, setPerson] = useState<EntityLookupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [open, setOpen] = useState(false)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchPerson = useCallback(() => {
    if (!fetched && personId) {
      setLoading(true)
      personLookup.getById(personId).then((result) => {
        setPerson(result)
        setFetched(true)
        setLoading(false)
      }).catch(() => {
        setFetched(true)
        setLoading(false)
      })
    }
  }, [personId, fetched])

  const handleOpenChange = useCallback((v: boolean) => {
    setOpen(v)
    if (v) fetchPerson()
  }, [fetchPerson])

  function handleMouseEnter() {
    hoverTimer.current = setTimeout(() => { setOpen(true); fetchPerson() }, 800)
  }

  function handleMouseLeave() {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null }
  }

  // If no personId, just render the name as plain text
  if (!personId) {
    return <span className={cn(size === 'sm' ? 'text-xs' : 'text-sm', className)}>{name}</span>
  }

  const data = person?.data as Record<string, unknown> | undefined
  const email = data?.email as string | undefined
  const phone = data?.phone as string | undefined
  const kind = data?.kind as string | undefined ?? person?.group
  const isActive = data?.is_active as boolean | undefined
  const dob = data?.date_of_birth as string | undefined
  const createdAt = data?.created_at as string | undefined
  const age = dob ? formatAge(dob) : null
  const initial = name.charAt(0).toUpperCase()

  // Auto-derive profile href from person kind if not explicitly provided
  const resolvedHref = profileHref ?? (personId ? '#' + resolveEntityHref(personId, 'person', kind ?? undefined, tab) : undefined)

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={cn(
            'font-medium text-foreground underline decoration-dashed decoration-muted-foreground/40 underline-offset-2 hover:decoration-primary hover:text-primary transition-colors truncate text-left',
            size === 'sm' ? 'text-xs' : 'text-sm',
            className
          )}
        >
          {name}
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" sideOffset={6}>
        {loading ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted/40 animate-pulse" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-24 rounded bg-muted/40 animate-pulse" />
                <div className="h-2.5 w-16 rounded bg-muted/30 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2 pt-1">
              <div className="h-3 w-36 rounded bg-muted/30 animate-pulse" />
              <div className="h-3 w-28 rounded bg-muted/30 animate-pulse" />
            </div>
          </div>
        ) : (
          <div>
            {/* Header with profile link */}
            <div className="flex items-start gap-3 p-4 pb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {kind && (
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                      {kind}
                    </span>
                  )}
                  {isActive !== undefined && (
                    <span className={`inline-flex items-center gap-1 text-[10px] ${isActive ? 'text-success' : 'text-muted-foreground/50'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-success' : 'bg-muted-foreground/30'}`} />
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>
              </div>
              {resolvedHref && (
                <a
                  href={resolvedHref}
                  onClick={(e) => { e.preventDefault(); window.location.hash = resolvedHref.replace(/^#/, '') }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                  title="View profile"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            {/* Contact details */}
            {(email || phone || age) && (
              <div className="px-4 pb-3 space-y-1.5">
                {email && (
                  <a href={`mailto:${email}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{email}</span>
                  </a>
                )}
                {phone && (
                  <a href={`tel:${phone}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span>{phone}</span>
                  </a>
                )}
                {dob && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Cake className="h-3 w-3 shrink-0" />
                    <span>{new Date(dob).toLocaleDateString()}{age ? ` (${age})` : ''}</span>
                  </div>
                )}
              </div>
            )}

            {/* No details found */}
            {!person && fetched && (
              <div className="px-4 pb-3">
                <p className="text-xs text-muted-foreground">No additional details available</p>
              </div>
            )}

            {/* Footer — created at */}
            {createdAt && (
              <div className="border-t px-4 py-2 flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                <Calendar className="h-2.5 w-2.5" />
                <span>Added {new Date(createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
