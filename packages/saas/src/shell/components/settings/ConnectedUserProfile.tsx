import { UserProfile } from './UserProfile'
import { useAuthStore } from '../../stores/auth.store'
import { getSupabaseClient } from '../../lib/supabase'
import { toast } from '../notifications/ToastProvider'

export function ConnectedUserProfile() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const handleSave = async (data: { fullName: string }) => {
    try {
      const supabase = getSupabaseClient()

      if (data.fullName !== user?.fullName) {
        const { error: metaError } = await supabase.auth.updateUser({
          data: { full_name: data.fullName },
        })
        if (metaError) throw metaError

        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: data.fullName })
          .eq('id', user!.id)
        if (profileError) throw profileError

        setUser(user ? { ...user, fullName: data.fullName } : null)
      }

      toast.success('Profile updated')
    } catch (err: any) {
      toast.error('Failed to update', { description: err?.message })
    }
  }

  const handleAvatarChange = async (file: File) => {
    try {
      const supabase = getSupabaseClient()
      const ext = file.name.split('.').pop()
      const path = `avatars/${user!.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const avatarUrl = urlData.publicUrl

      await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } })
      await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user!.id)

      setUser(user ? { ...user, avatarUrl } : null)
      toast.success('Avatar updated')
    } catch (err: any) {
      toast.error('Failed to upload avatar', { description: err?.message })
    }
  }

  return <UserProfile user={user as any} onSave={handleSave} onAvatarChange={handleAvatarChange} />
}
