import React, { useEffect, useState } from 'react'
import { Loader2, WifiOff, RefreshCw } from 'lucide-react'
import { useAuthStore } from '../../stores/auth.store'
import { useOrganizationStore, getPersistedOrgId } from '../../stores/organization.store'
import { useLocationStore } from '../../stores/location.store'
import { usePermissionsStore } from '../../stores/permissions.store'
import { useOrgAdapterOptional } from '../../lib/org-context'
import { TenantOnboarding } from './TenantOnboarding'
import { useTranslation } from '../../hooks/useTranslation'

interface OrgInitializerProps {
  verticalId?: string
}

export function OrgInitializer({ verticalId }: OrgInitializerProps) {
  const adapter = useOrgAdapterOptional()
  const user = useAuthStore((s) => s.user)
  const currentOrg = useOrganizationStore((s) => s.currentOrg)
  const setCurrentOrg = useOrganizationStore((s) => s.setCurrentOrg)
  const setUserOrgs = useOrganizationStore((s) => s.setUserOrgs)
  const setMembers = useOrganizationStore((s) => s.setMembers)
  const setLoading = useOrganizationStore((s) => s.setLoading)
  const setProfiles = usePermissionsStore((s) => s.setProfiles)
  const setCurrentProfile = usePermissionsStore((s) => s.setCurrentProfile)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [connectionError, setConnectionError] = useState(false)

  useEffect(() => {
    if (!adapter || !user) return
    let cancelled = false

    async function init() {
      setLoading(true)
      setConnectionError(false)
      try {
        const orgs = await adapter!.listUserOrgs(user!.id)
        if (cancelled) return
        setUserOrgs(orgs)

        if (orgs.length === 0) {
          setNeedsOnboarding(true)
          setInitialized(true)
          return
        }

        setNeedsOnboarding(false)
        const persistedId = getPersistedOrgId()
        const targetOrg = orgs.find((o) => o.orgId === persistedId) ?? orgs[0]

        const org = await adapter!.getOrg(targetOrg.orgId)
        if (cancelled) return
        setCurrentOrg(org)

        const [members, profiles] = await Promise.all([
          adapter!.listMembers(org.id),
          adapter!.listProfiles(org.id),
        ])
        if (cancelled) return
        setMembers(members)
        setProfiles(profiles)

        const myMembership = members.find((m) => m.userId === user!.id)
        if (myMembership) {
          const profile = profiles.find((p) => p.id === myMembership.profileId)
          setCurrentProfile(profile ?? null)
        }

        // Load locations for location picker
        try {
          const locations = await adapter!.listLocations(org.id)
          if (!cancelled) useLocationStore.getState().setLocations(locations)
        } catch {
          // Locations are optional — don't block init
        }
      } catch (err) {
        console.error('[saas-core] OrgInitializer error:', err)
        if (!cancelled) setConnectionError(true)
      } finally {
        if (!cancelled) { setLoading(false); setInitialized(true) }
      }
    }

    init()
    return () => { cancelled = true }
  }, [adapter, user?.id])

  useEffect(() => {
    if (currentOrg && needsOnboarding) setNeedsOnboarding(false)
  }, [currentOrg])

  const { t } = useTranslation()

  const handleRetry = () => {
    setConnectionError(false)
    setInitialized(false)
    // Re-trigger the init effect by forcing a state change
    setLoading(true)
    if (adapter && user) {
      const retryInit = async () => {
        setConnectionError(false)
        try {
          const orgs = await adapter.listUserOrgs(user.id)
          setUserOrgs(orgs)
          if (orgs.length === 0) {
            setNeedsOnboarding(true)
            setInitialized(true)
            return
          }
          setNeedsOnboarding(false)
          const persistedId = getPersistedOrgId()
          const targetOrg = orgs.find((o) => o.orgId === persistedId) ?? orgs[0]
          const org = await adapter.getOrg(targetOrg.orgId)
          setCurrentOrg(org)
          const [members, profiles] = await Promise.all([
            adapter.listMembers(org.id),
            adapter.listProfiles(org.id),
          ])
          setMembers(members)
          setProfiles(profiles)
          const myMembership = members.find((m) => m.userId === user.id)
          if (myMembership) {
            const profile = profiles.find((p) => p.id === myMembership.profileId)
            setCurrentProfile(profile ?? null)
          }
          // Load locations for location picker
          try {
            const locations = await adapter.listLocations(org.id)
            useLocationStore.getState().setLocations(locations)
          } catch {
            // Locations are optional
          }
        } catch (err) {
          console.error('[saas-core] OrgInitializer retry error:', err)
          setConnectionError(true)
        } finally {
          setLoading(false)
          setInitialized(true)
        }
      }
      retryInit()
    }
  }

  if (!initialized || !user) return null

  if (connectionError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
        <div className="saas-page-enter w-full max-w-sm px-6 text-center">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-destructive/10 mb-4">
            <WifiOff className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold">{t('org.connectionError.title')}</h2>
          <p className="text-sm text-muted-foreground mt-2">{t('org.connectionError.description')}</p>
          <button
            onClick={handleRetry}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary border border-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            {t('org.connectionError.retry')}
          </button>
        </div>
      </div>
    )
  }

  if (needsOnboarding) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
        <div className="saas-page-enter w-full max-w-md px-6">
          <TenantOnboarding verticalId={verticalId} />
        </div>
      </div>
    )
  }

  return null
}
