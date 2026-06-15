import { useCallback } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { useTenantStore } from '../stores/tenant.store'
import type { TenantSettings } from '../types'

export function useTenant() {
  const store = useTenantStore()
  const supabase = getSupabaseClient()

  const fetchTenant = useCallback(async (tenantId: string) => {
    store.setLoading(true)
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single()

    if (error) {
      store.setLoading(false)
      throw error
    }

    store.setTenant({
      id: data.id,
      name: data.name,
      slug: data.slug,
      logoUrl: data.logo_url,
      settings: data.settings,
      plan: data.plan,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    })
    store.setLoading(false)
    return data
  }, [supabase, store])

  const fetchMembers = useCallback(async () => {
    if (!store.tenant) throw new Error('No tenant loaded')

    store.setLoading(true)
    const { data, error } = await supabase
      .from('tenant_members')
      .select('*, user:users(id, email, full_name, avatar_url)')
      .eq('tenant_id', store.tenant.id)
      .order('joined_at', { ascending: true })

    if (error) {
      store.setLoading(false)
      throw error
    }

    const members = (data ?? []).map((m: any) => ({
      id: m.id,
      userId: m.user_id,
      tenantId: m.tenant_id,
      role: m.role,
      user: {
        id: m.user.id,
        email: m.user.email,
        fullName: m.user.full_name,
        avatarUrl: m.user.avatar_url,
      },
      joinedAt: m.joined_at,
    }))

    store.setMembers(members)
    store.setLoading(false)
    return members
  }, [supabase, store])

  const updateSettings = useCallback(async (settings: Partial<TenantSettings>) => {
    if (!store.tenant) throw new Error('No tenant loaded')

    const mergedSettings = { ...store.tenant.settings, ...settings }
    if (settings.branding) {
      mergedSettings.branding = { ...store.tenant.settings.branding, ...settings.branding }
    }

    const { data, error } = await supabase
      .from('tenants')
      .update({ settings: mergedSettings, updated_at: new Date().toISOString() })
      .eq('id', store.tenant.id)
      .select()
      .single()

    if (error) throw error

    store.setTenant({
      ...store.tenant,
      settings: mergedSettings,
      updatedAt: data.updated_at,
    })

    return data
  }, [supabase, store])

  return {
    tenant: store.tenant,
    members: store.members,
    currentRole: store.currentRole,
    loading: store.loading,
    fetchTenant,
    fetchMembers,
    updateSettings,
  }
}
