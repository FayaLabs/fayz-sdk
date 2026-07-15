import * as React from 'react'
import { UserProfile } from './UserProfile'
// The signed-in user lives in @fayz-ai/auth's store (the one AuthProvider fills) —
// the shell stores/auth.store is a separate, unpopulated store.
import { useAuthStore } from '@fayz-ai/auth'
import { getSupabaseClient, getSupabaseClientSafe } from '../../lib/supabase'
import { toast } from '../notifications/ToastProvider'

interface ProfileRow {
  full_name: string | null
  avatar_url: string | null
  email: string | null
}

// The "/me" surface: the current user's canonical profile = the auth user (id,
// e-mail) merged with their profiles row (name, avatar). Reads/writes go
// to public.profiles (RLS: id = auth.uid(), so a user only ever sees/edits their
// own), and keep the auth-user metadata in sync so both stay coherent.
export function ConnectedUserProfile() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [profile, setProfile] = React.useState<ProfileRow | null>(null)

  // Fill: load the canonical profile row on mount (falls back to auth metadata).
  React.useEffect(() => {
    const supabase = getSupabaseClientSafe()
    if (!user || !supabase) return // mock/no-backend: just use the auth-store user
    let cancelled = false
    void supabase
      .from('profiles')
      .select('full_name, avatar_url, email')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setProfile(data as ProfileRow)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const handleSave = async (data: { fullName: string }) => {
    if (!user) return
    try {
      const supabase = getSupabaseClient()
      // Upsert the canonical row (INSERT if the profile doesn't exist yet).
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, full_name: data.fullName, email: user.email }, { onConflict: 'id' })
      if (profileError) throw profileError

      // Keep the auth-user metadata in sync (used across the app's session).
      const { error: metaError } = await supabase.auth.updateUser({ data: { full_name: data.fullName } })
      if (metaError) throw metaError

      setUser({ ...user, fullName: data.fullName })
      setProfile({ full_name: data.fullName, avatar_url: profile?.avatar_url ?? null, email: user.email })
      toast.success('Perfil atualizado')
    } catch (err: any) {
      toast.error('Falha ao atualizar', { description: err?.message })
    }
  }

  const handleAvatarChange = async (file: File) => {
    if (!user) return
    try {
      const supabase = getSupabaseClient()
      const ext = file.name.split('.').pop()
      const path = `avatars/${user.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const avatarUrl = urlData.publicUrl

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, avatar_url: avatarUrl, email: user.email }, { onConflict: 'id' })
      if (profileError) throw profileError

      await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } })
      setUser({ ...user, avatarUrl })
      setProfile({ full_name: profile?.full_name ?? null, avatar_url: avatarUrl, email: user.email })
      toast.success('Avatar atualizado')
    } catch (err: any) {
      toast.error('Falha ao enviar avatar', { description: err?.message })
    }
  }

  // Merge: prefer the canonical profile row, fall back to auth metadata.
  const merged = user
    ? { ...user, fullName: profile?.full_name ?? user.fullName, avatarUrl: profile?.avatar_url ?? user.avatarUrl }
    : null

  return <UserProfile user={merged as any} onSave={handleSave} onAvatarChange={handleAvatarChange} />
}
