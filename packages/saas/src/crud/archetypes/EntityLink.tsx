import React from 'react'
import { ExternalLink } from 'lucide-react'

interface EntityLinkProps {
  /** The entity ID to link to */
  entityId: string
  /** The base path of the CRUD page (e.g. '/registry/tutors') */
  basePath: string
  /** Display label */
  children: React.ReactNode
  /** Optional className */
  className?: string
}

/**
 * Reusable link to a CRUD entity detail page.
 * Uses hash-based routing: navigates to `#basePath/entityId`
 */
export function EntityLink({ entityId, basePath, children, className }: EntityLinkProps) {
  const href = `#${basePath}/${entityId}`

  return (
    <a
      href={href}
      className={`inline-flex items-center gap-1 text-primary hover:underline transition-colors ${className ?? ''}`}
    >
      {children}
      <ExternalLink className="h-3 w-3 opacity-50" />
    </a>
  )
}

/**
 * Registry of known entity paths by person kind.
 * Projects can extend this via the `registerEntityPath` function.
 */
const ENTITY_PATHS: Record<string, string> = {
  customer: '/registry/tutors',
  professional: '/registry/veterinarians',
  organization: '/registry/clinics',
  supplier: '/registry/suppliers',
  staff: '/registry/staff',
}

/** Register a custom path for a person kind */
export function registerEntityPath(kind: string, basePath: string) {
  ENTITY_PATHS[kind] = basePath
}

/** Get the CRUD base path for a person kind */
export function getPersonPath(kind: string): string | null {
  return ENTITY_PATHS[kind] ?? null
}

/**
 * Smart link that auto-resolves the path based on person kind.
 * Falls back to non-linked text if no path is registered.
 */
export function PersonLink({ personId, kind, children, className }: {
  personId: string
  kind: string
  children: React.ReactNode
  className?: string
}) {
  const basePath = getPersonPath(kind)
  if (!basePath) {
    return <span className={className}>{children}</span>
  }
  return (
    <EntityLink entityId={personId} basePath={basePath} className={className}>
      {children}
    </EntityLink>
  )
}
