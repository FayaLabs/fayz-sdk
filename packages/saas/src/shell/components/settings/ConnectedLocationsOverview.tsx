import * as React from 'react'
import { LocationsOverview } from './LocationsOverview'
import { useOrgAdapterOptional } from '../../lib/org-context'
import { useOrganizationStore } from '../../stores/organization.store'
import { usePermission } from '../../hooks/usePermission'
import { toast } from '../notifications/ToastProvider'
import { dedup } from '../../lib/dedup'
import type { Location } from '../../types/tenant'

export function ConnectedLocationsOverview() {
  const adapter = useOrgAdapterOptional()
  const currentOrg = useOrganizationStore((s) => s.currentOrg)
  const { hasSystemPermission } = usePermission()
  const [locations, setLocations] = React.useState<Location[]>([])
  const [loading, setLoading] = React.useState(true)

  const canManage = hasSystemPermission('manage_settings')

  const fetchLocations = React.useCallback(async () => {
    if (!adapter || !currentOrg) return
    try {
      const data = await dedup('locations:' + currentOrg.id, () => adapter.listLocations(currentOrg.id))
      setLocations(data)
    } catch {
      // ignore
    }
  }, [adapter, currentOrg?.id])

  React.useEffect(() => {
    if (!adapter || !currentOrg) {
      setLoading(false)
      return
    }
    fetchLocations().finally(() => setLoading(false))
  }, [fetchLocations])

  const handleAdd = async (data: { name: string; address?: string; city?: string; state?: string; country?: string; phone?: string; isHeadquarters?: boolean }) => {
    if (!adapter || !currentOrg) return
    try {
      await adapter.createLocation(currentOrg.id, data)
      await fetchLocations()
      toast.success('Location added')
    } catch (err: any) {
      toast.error('Failed to add location', { description: err?.message })
      throw err
    }
  }

  return (
    <LocationsOverview
      locations={locations}
      loading={loading}
      canManage={canManage}
      onAdd={handleAdd}
    />
  )
}
