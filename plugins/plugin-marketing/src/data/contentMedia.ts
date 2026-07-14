import { getSupabaseClientOptional, getActiveTenantId } from '@fayz-ai/core'

// ---------------------------------------------------------------------------
// Media asset upload for content posts (static art, covers). Public bucket
// `mkt-media` (created by migration 003); path content/{tenantId}/{postId}-{ts}.{ext}
// so re-uploads never collide and old URLs keep resolving until replaced.
// ---------------------------------------------------------------------------

export function canUploadMedia(): boolean {
  return !!getSupabaseClientOptional()
}

export async function uploadPostMedia(postId: string, file: File): Promise<string> {
  const supabase = getSupabaseClientOptional() as any
  if (!supabase) throw new Error('Supabase not initialized')
  const tenantId = getActiveTenantId()
  if (!tenantId) throw new Error('No active tenant')

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const path = `content/${tenantId}/${postId}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('mkt-media').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('mkt-media').getPublicUrl(path)
  return data.publicUrl as string
}
