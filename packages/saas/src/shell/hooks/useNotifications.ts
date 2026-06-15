import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useNotificationStore } from '../stores/notifications.store'
import { getSupabaseClient } from '../lib/supabase'
import type { Notification } from '../types'

export function useNotifications() {
  const store = useNotificationStore()
  const channelRef = useRef<ReturnType<
    ReturnType<typeof getSupabaseClient>['channel']
  > | null>(null)

  const fetchNotifications = useCallback(async () => {
    store.setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      store.setNotifications(data ?? [])
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      store.setLoading(false)
    }
  }, [store])

  const markAsRead = useCallback(
    async (id: string) => {
      store.markRead(id)
      try {
        const supabase = getSupabaseClient()
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', id)

        if (error) throw error
      } catch (err) {
        console.error('Failed to mark notification as read:', err)
      }
    },
    [store]
  )

  const markAllAsRead = useCallback(async () => {
    store.markAllRead()
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false)

      if (error) throw error
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }, [store])

  const subscribeToRealtime = useCallback(() => {
    try {
      const supabase = getSupabaseClient()
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          (payload) => {
            store.addNotification(payload.new as Notification)
          }
        )
        .subscribe()

      channelRef.current = channel
    } catch (err) {
      console.error('Failed to subscribe to realtime notifications:', err)
    }
  }, [store])

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        const supabase = getSupabaseClient()
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  return useMemo(
    () => ({
      notifications: store.notifications,
      unreadCount: store.unreadCount,
      loading: store.loading,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      subscribeToRealtime,
    }),
    [
      store.notifications,
      store.unreadCount,
      store.loading,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      subscribeToRealtime,
    ]
  )
}
